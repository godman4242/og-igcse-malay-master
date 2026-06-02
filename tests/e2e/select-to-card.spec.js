// Proof for the universal select→translate→add-to-cards MVP (Tier 1).
// Drives the REAL flow against the dev build: select a Malay word in a reading
// paragraph → popover translates (deterministic via a mocked free endpoint) →
// Save → the card actually lands in the FSRS store under deck 'Saved'. Also
// asserts the opt-out: selecting inside the [data-no-select-card] header shows
// no popover. Run: npx playwright test select-to-card --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    const mod = await import(url)
    window.__STORE = mod.default
  })
}

// Select `word` inside the element matching `selector` and fire mouseup, the
// way a real text selection ends. Returns false if the word wasn't found.
async function selectWord(page, selector, word) {
  return page.evaluate(({ selector, word }) => {
    const host = document.querySelector(selector)
    if (!host) return false
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const i = node.textContent.indexOf(word)
      if (i >= 0) {
        const range = document.createRange()
        range.setStart(node, i)
        range.setEnd(node, i + word.length)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        return true
      }
    }
    return false
  }, { selector, word })
}

test.beforeEach(async ({ page }) => {
  // Deterministic translation: fail the serverless proxy so the chain falls to
  // the free gtx endpoint, which we fulfil with a fixed gtx-shaped body.
  await page.route('**/api/translate', r => r.abort())
  await page.route('**/translate_a/single**', r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([[['family', 'keluarga', null, null, 10]], null, 'ms']),
  }))
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('select a Malay word in prose → translate → save lands in the deck', async ({ page }) => {
  // Inject a realistic reading paragraph (prose in <p>, the universal case).
  await page.evaluate(() => {
    const p = document.createElement('p')
    p.id = 'test-prose'
    p.textContent = 'Saya sayang keluarga saya kerana mereka sangat penyayang.'
    const main = document.querySelector('main')
    main.prepend(p) // top of the page so the anchored popover is in-viewport
    window.scrollTo(0, 0)
  })

  expect(await selectWord(page, '#test-prose', 'keluarga')).toBe(true)

  const pop = page.getByRole('dialog', { name: /Save word to flashcards/i })
  await expect(pop).toBeVisible()
  await expect(pop.getByText('family')).toBeVisible()

  // The captured sentence is shown in the popover (encoding-in-context, #2).
  await expect(pop.getByText(/Saya sayang keluarga/i)).toBeVisible()

  await pop.getByRole('button', { name: /Save to flashcards/i }).click()
  await expect(pop.getByText(/Saved to deck/i)).toBeVisible()

  // The card actually exists in the store, with the translation + context.
  const card = await page.evaluate(() =>
    window.__STORE.getState().cards.find(c => c.t === 'Saved' && c.m === 'keluarga'))
  expect(card).toBeTruthy()
  expect(card.e).toBe('family')
  expect(card.ex).toContain('keluarga') // context sentence captured into ex

  await page.screenshot({ path: 'test-results/select-to-card/saved-dark.png', fullPage: false })
})

test('select an English word in an English sentence → en→ms, files Malay-front', async ({ page }) => {
  // The bug this guards: before direction detection, selecting an English word
  // ran ms→en and produced nonsense. Now "education" is detected as English,
  // translated en→ms, and stored with the English term on the `e` side.
  await page.evaluate(() => {
    const p = document.createElement('p')
    p.id = 'test-prose'
    p.textContent = 'I really enjoy my education at this wonderful school.'
    document.querySelector('main').prepend(p)
    window.scrollTo(0, 0)
  })

  expect(await selectWord(page, '#test-prose', 'education')).toBe(true)

  const pop = page.getByRole('dialog', { name: /Save word to flashcards/i })
  await expect(pop).toBeVisible()
  await pop.getByRole('button', { name: /Save to flashcards/i }).click()
  await expect(pop.getByText(/Saved to deck/i)).toBeVisible()

  // English term lands on `e`; the (mocked) translation lands on the Malay `m`.
  const card = await page.evaluate(() =>
    window.__STORE.getState().cards.find(c => c.t === 'Saved' && c.e === 'education'))
  expect(card).toBeTruthy()
  expect(card.m).toBe('family') // mocked en→ms result, filed Malay-front
  expect(card.ex).toContain('education')

  await page.screenshot({ path: 'test-results/select-to-card/english-direction-dark.png', fullPage: false })
})

test('re-selecting an already-saved word shows "already in your flashcards" up-front', async ({ page }) => {
  await page.evaluate(() => {
    const p = document.createElement('p')
    p.id = 'test-prose'
    p.textContent = 'Saya jumpa keluarga di bandar.'
    document.querySelector('main').prepend(p)
    window.scrollTo(0, 0)
    // Pre-seed the word — note a NON-'Saved' deck, to prove the check spans all decks.
    window.__STORE.getState().addCard({ m: 'keluarga', e: 'family', ex: '', t: 'Food' })
  })
  expect(await selectWord(page, '#test-prose', 'keluarga')).toBe(true)
  const pop = page.getByRole('dialog', { name: /Save word to flashcards/i })
  await expect(pop).toBeVisible()
  // No click needed: an existing card is recognised immediately, in any deck.
  await expect(pop.getByText(/Already in your flashcards/i)).toBeVisible()
  await expect(pop.getByRole('button', { name: /Save to flashcards/i })).toHaveCount(0)
})

test('popover renders cleanly in light mode', async ({ page }) => {
  await page.evaluate(() => {
    window.__STORE.setState({ theme: 'light' })
    const p = document.createElement('p')
    p.id = 'test-prose'
    p.textContent = 'Saya sayang keluarga saya kerana mereka penyayang.'
    document.querySelector('main').prepend(p)
    window.scrollTo(0, 0)
  })
  expect(await selectWord(page, '#test-prose', 'keluarga')).toBe(true)
  const pop = page.getByRole('dialog', { name: /Save word to flashcards/i })
  await expect(pop.getByText('family')).toBeVisible()
  await page.waitForTimeout(400) // let the fadeUp animation settle before the shot
  await page.screenshot({ path: 'test-results/select-to-card/translated-light.png', fullPage: false })
})

test('selecting inside the opted-out header shows no popover', async ({ page }) => {
  // The header carries data-no-select-card — selecting its text must not offer a card.
  const found = await selectWord(page, 'header', 'Malay')
  expect(found).toBe(true) // the word exists ("IGCSE Malay Master")
  await expect(page.getByRole('dialog', { name: /Save word to flashcards/i })).toHaveCount(0)
})
