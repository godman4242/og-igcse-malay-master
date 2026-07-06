import { test, expect } from '@playwright/test'

// Review #15 — shared-deck import. A `?deck=` link opens the review modal; the
// recipient adds words; the param is stripped. A malformed link is friendly, not
// a crash. Uses the same Vite "?t=" store-binding workaround as
// mistake-promotion.spec.js (see CLAUDE.md "## E2E tests").

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

// Build a real `?deck=` value the same way the app encodes it (base64url of a
// {v,cards} envelope), computed in-page from the live module so the test and
// app never drift.
async function encodedDeck(page, cards) {
  return page.evaluate(async (cardsArg) => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    const base = url.replace('/src/store/useStore.js', '/src/lib/sharedDeck.js')
    const mod = await import(base)
    return mod.encodeDeckParam(cardsArg)
  }, cards)
}

async function reset(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('shared-deck import (#15)', () => {
  test.beforeEach(async ({ page }) => { await reset(page) })

  test('a ?deck= link opens the review modal, adds cards, and strips the param', async ({ page }) => {
    const deck = await encodedDeck(page, [
      { m: 'rumah', e: 'house', t: 'Home', lang: 'ms' },
      { m: 'kucing', e: 'cat', t: 'Home', lang: 'ms' },
    ])
    await page.goto(`/?deck=${deck}`, { waitUntil: 'networkidle' })

    const modal = page.getByRole('dialog', { name: 'Import shared deck' })
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Someone shared a deck')

    await modal.getByRole('button', { name: /Add 2 words/ }).click()
    await expect(modal).toContainText('Added 2 words')

    // Cards landed in the store, and the long base64 is gone from the URL.
    await bindStore(page)
    const keys = await page.evaluate(() =>
      window.__STORE.getState().cards.map(c => `${c.m}::${c.t}`))
    expect(keys).toContain('rumah::Home')
    expect(keys).toContain('kucing::Home')
    expect(page.url()).not.toContain('deck=')
  })

  test('a malformed ?deck= link is friendly, not a crash', async ({ page }) => {
    await page.goto('/?deck=%%%not-valid%%%', { waitUntil: 'networkidle' })
    await expect(page.getByText('That share link is invalid or corrupted.')).toBeVisible()
    // The app still works — no modal, dashboard rendered.
    await expect(page.getByRole('dialog', { name: 'Import shared deck' })).toHaveCount(0)
  })
})
