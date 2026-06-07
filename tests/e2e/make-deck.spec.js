import { test, expect } from '@playwright/test'

// Phase 2 — "Make me a deck" AI generator on the For You home. Hermetic: we seed a
// BYOK OpenRouter key (so the panel unlocks via isOpenRouterAvailable) and intercept
// the OpenRouter HTTP call, returning a canned deck wrapped in prose + a ```json
// fence to exercise the tolerant parser. The deck mixes an owned-dictionary word
// (air→water, high), a CC0-Wikidata word (payung→umbrella, medium) and an invented
// word (belalbuztik, unknown → must be confirmed). This proves the grounding gate
// never silently ships an unverified pair.
//
// Vite "?t=…" trap: see CLAUDE.md "## E2E tests". Rebind window.__STORE after goto.
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}

const DECK_BODY = JSON.stringify([
  { m: 'air', e: 'water', ex: 'Saya minum air setiap pagi.' },      // owned → high
  { m: 'payung', e: 'umbrella', ex: 'Bawa payung kerana hujan.' },  // Wikidata → medium
  { m: 'belalbuztik', e: 'spaceship', ex: 'Contoh ayat.' },        // invented → review
])
// Prose + fence wrapper: the real model rarely returns bare JSON.
const MODEL_REPLY = `Sure! Here is your deck:\n\`\`\`json\n${DECK_BODY}\n\`\`\`\nHappy studying!`

async function freshLoad(page, { withKey }) {
  await page.addInitScript((withKey) => {
    try {
      localStorage.removeItem('igcse-malay-store')
      localStorage.removeItem('igcse-malay-telemetry')
      if (withKey) localStorage.setItem('igcse-openrouter-key', 'sk-or-e2e-deck-key')
      else localStorage.removeItem('igcse-openrouter-key')
    } catch { /* ignore */ }
  }, withKey)
  await page.goto('/for-you', { waitUntil: 'networkidle' })
  await bindStore(page)
}

// Note on the locked ("add a key to unlock") state: it can't be exercised
// hermetically here because the dev build bakes in a VITE_OPENROUTER_KEY, which
// keeps the panel unlocked regardless of localStorage. The locked branch is a
// graceful fallback for keyless builds; its logic is trivial and verified by code
// review. These specs cover the substantive, key-present flow.
test.describe('Make me a deck (Phase 2 — grounded AI deck)', () => {
  test('generates, grounds (verified vs check-these), and adds chosen words to an "AI ·" deck', async ({ page }) => {
    await page.route('**/openrouter.ai/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: MODEL_REPLY } }] }),
      })
    )
    await freshLoad(page, { withKey: true })

    await page.getByRole('button', { name: /^make me a deck$/i }).click()
    await page.getByLabel(/what should this deck help you with/i).fill('talk about the weather')
    await page.getByRole('button', { name: /generate deck/i }).click()

    // Grounding split: 2 verified (owned high + Wikidata medium), 1 to confirm.
    await expect(page.getByText(/verified \(2\)/i)).toBeVisible()
    await expect(page.getByText(/check these \(1\)/i)).toBeVisible()
    await expect(page.getByText('air')).toBeVisible()
    await expect(page.getByText('payung')).toBeVisible()
    await expect(page.getByText('belalbuztik')).toBeVisible()
    // Provenance badges differ: owned = dictionary, Wikidata = reference.
    await expect(page.getByText('dictionary', { exact: true })).toBeVisible()
    await expect(page.getByText('reference', { exact: true })).toBeVisible()

    // Verified are pre-checked → "Add 2 words". Opt the invented word in → 3.
    await expect(page.getByRole('button', { name: /add 2 words/i })).toBeVisible()
    await page.getByRole('checkbox', { name: /belalbuztik/i }).click()
    await page.getByRole('button', { name: /add 3 words/i }).click()

    await expect(page.getByText(/added 3 words to “AI · talk about the weather”/i)).toBeVisible()

    // The cards actually landed in the named deck.
    const deck = await page.evaluate(() => {
      const cards = window.__STORE.getState().cards
      const inDeck = cards.filter(c => c.t === 'AI · talk about the weather')
      return inDeck.map(c => ({ m: c.m, e: c.e })).sort((a, b) => a.m.localeCompare(b.m))
    })
    expect(deck).toEqual([
      { m: 'air', e: 'water' },
      { m: 'belalbuztik', e: 'spaceship' },
      { m: 'payung', e: 'umbrella' },
    ])
  })

  test('never silent-ships: an unconfirmed unverified word is NOT added', async ({ page }) => {
    await page.route('**/openrouter.ai/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: MODEL_REPLY } }] }),
      })
    )
    await freshLoad(page, { withKey: true })

    await page.getByRole('button', { name: /^make me a deck$/i }).click()
    await page.getByLabel(/what should this deck help you with/i).fill('weather deck')
    await page.getByRole('button', { name: /generate deck/i }).click()
    await expect(page.getByText(/verified \(2\)/i)).toBeVisible()

    // Add only the verified two — do NOT tick the invented word.
    await page.getByRole('button', { name: /add 2 words/i }).click()
    await expect(page.getByText(/added 2 words/i)).toBeVisible()

    const malayWords = await page.evaluate(() =>
      window.__STORE.getState().cards.filter(c => c.t === 'AI · weather deck').map(c => c.m).sort()
    )
    expect(malayWords).toEqual(['air', 'payung'])
    expect(malayWords).not.toContain('belalbuztik')
  })

  test('renders cleanly in light + dark', async ({ page }) => {
    await page.route('**/openrouter.ai/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: MODEL_REPLY } }] }),
      })
    )
    await freshLoad(page, { withKey: true })
    await page.getByRole('button', { name: /^make me a deck$/i }).click()
    await page.getByLabel(/what should this deck help you with/i).fill('weather')
    await page.getByRole('button', { name: /generate deck/i }).click()
    await expect(page.getByText(/verified \(2\)/i)).toBeVisible()

    await page.screenshot({ path: 'test-results/make-deck/make-deck-dark.png', fullPage: true })
    await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
    await page.waitForTimeout(150)
    await page.screenshot({ path: 'test-results/make-deck/make-deck-light.png', fullPage: true })
  })
})
