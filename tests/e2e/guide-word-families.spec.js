// Phase 3c T22 — the Word Families deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /word-families: a centered intro, then an
// arrow pointing at each landing control (the search box + the first root row),
// then a centered summary of the family tree (tap-to-hear, the +/✓ add-to-deck,
// the POS colour legend, the detail modal, the Related-to-Your-Mistakes panel).
// Those tree controls only mount after a root is expanded, so they are taught
// without an arrow.
//
// WordFamilies is a normal (non-theater) page, so the deep-dive entry is the
// standard HEADER ▶, and the picker anchors are mounted at landing (the search
// input renders unconditionally; the root list is static — 41 entries — and only
// filters to empty on a no-match SEARCH, never on the landing state, so the first
// root row always renders).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the search box) draws its arrow.
//  B) every landing anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-word-families --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No card seeding needed — the root list renders its full static set
// regardless of the deck.
async function prep(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const store = (await import(url)).default
    store.setState({ guide: { seenQuick: true, seenFull: false } })
  })
}

test('deep dive: ▶ on Word Families launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/word-families', { waitUntil: 'networkidle' })

  // Landing — the search box is up (WordFamilies never enters theater mode).
  await expect(page.locator('[data-guide="wordfamilies-search"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/Word Families/i) // the centered intro step

  // Advance off the intro → the first anchored step (search box) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Find a root word/i)
})

test('deep dive: every landing anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/word-families', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="wordfamilies-search"]',
    '[data-guide="wordfamilies-roots"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
