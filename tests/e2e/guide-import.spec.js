// Phase 3c T18 — the Import page deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /import: a centered intro, then an arrow
// pointing at each always-mounted landing control (the input-source tabs, the
// paste textarea, the deck-name input, the Process button, the Word-by-Word
// button), then a centered summary of what happens after Process (the colour-
// coded chips, select + Add N cards, Undo). That post-Process chip grid only
// mounts after Process runs, so it is taught without an arrow.
//
// Import is a normal (non-theater) page, so the deep-dive entry is the standard
// HEADER ▶, and every picker anchor is mounted at landing (the tabs / deck input
// / Process / Word-by-Word buttons render unconditionally; the paste textarea is
// the default tab on arrival).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the input-source tabs) draws its arrow.
//  B) every landing anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-import --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No seeding needed — the Import controls render with an empty page.
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

test('deep dive: ▶ on Import launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/import', { waitUntil: 'networkidle' })

  // Landing — the input-source tabs are up (Import never enters theater mode).
  await expect(page.locator('[data-guide="import-tabs"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/build your own deck/i) // the centered intro step

  // Advance off the intro → the first anchored step (input tabs) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Paste text, or upload a PDF/i)
})

test('deep dive: every landing anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/import', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="import-tabs"]',
    '[data-guide="import-text"]',
    '[data-guide="import-deck"]',
    '[data-guide="import-process"]',
    '[data-guide="import-wordbyword"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
