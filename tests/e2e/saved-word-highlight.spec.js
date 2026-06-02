// Proof for Tier-2 persistent saved-word highlighting (CSS Custom Highlight API).
// Seeds a word into the 'Saved' deck, drops prose containing it into the page,
// and asserts the browser highlight registry actually paints ranges over it —
// then screenshots light + dark, and confirms highlighting doesn't break the
// select-to-card popover. Run:
//   npx playwright test saved-word-highlight --config tests/e2e/playwright.config.js
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

// Seed a saved word, then inject a paragraph containing it at the top of <main>.
async function seedAndInject(page, savedWord, prose) {
  await page.evaluate(({ savedWord, prose }) => {
    window.__STORE.getState().addCard({ m: savedWord, e: 'family', ex: '', t: 'Saved' })
    const p = document.createElement('p')
    p.id = 'hl-prose'
    p.textContent = prose
    document.querySelector('main').prepend(p)
    window.scrollTo(0, 0)
  }, { savedWord, prose })
}

// How many ranges the 'saved-words' highlight currently paints.
async function highlightCount(page) {
  return page.evaluate(() => {
    if (!('highlights' in CSS)) return -1 // API unsupported in this browser
    const h = CSS.highlights.get('saved-words')
    return h ? h.size : 0
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('a saved word gets highlighted where it appears in prose (dark)', async ({ page }) => {
  await seedAndInject(page, 'keluarga', 'Saya sayang keluarga saya kerana keluarga itu penyayang.')
  // ≥2 painted ranges (the two prose occurrences; the page may surface the saved
  // word elsewhere too, which correctly gets highlighted as well).
  await expect.poll(() => highlightCount(page), { timeout: 4000 }).toBeGreaterThanOrEqual(2)
  await page.screenshot({ path: 'test-results/saved-word-highlight/dark.png', fullPage: false })
})

test('highlight renders in light mode too', async ({ page }) => {
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await seedAndInject(page, 'keluarga', 'Rumah keluarga kami di kampung.')
  await expect.poll(() => highlightCount(page), { timeout: 4000 }).toBeGreaterThanOrEqual(1)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'test-results/saved-word-highlight/light.png', fullPage: false })
})

test('highlighting does not break the select-to-card popover', async ({ page }) => {
  await page.route('**/api/translate', r => r.abort())
  await page.route('**/translate_a/single**', r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([[['family', 'keluarga', null, null, 10]], null, 'ms']),
  }))
  await seedAndInject(page, 'keluarga', 'Saya jumpa keluarga di bandar semalam.')
  await expect.poll(() => highlightCount(page), { timeout: 4000 }).toBeGreaterThan(0)

  // Selecting the already-highlighted word must still open the popover.
  await page.evaluate(() => {
    const host = document.querySelector('#hl-prose')
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
    const node = walker.nextNode()
    const i = node.textContent.indexOf('keluarga')
    const range = document.createRange()
    range.setStart(node, i)
    range.setEnd(node, i + 'keluarga'.length)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await expect(page.getByRole('dialog', { name: /Save word to flashcards/i })).toBeVisible()
})
