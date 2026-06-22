// Phase 3c T15 — the Comprehension picker deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /comprehension: a centered intro, then an
// arrow pointing at each picker control (the passage list + its badge row),
// then a centered summary of what happens inside a passage (the reading
// mechanics only mount after a passage opens, so they are taught without an
// arrow).
//
// Like /roleplay and /grammar, Comprehension is a normal (non-theater) page, so
// the deep-dive entry is the standard HEADER ▶, and the picker anchors are
// mounted at landing (the passage list is static + never empty, so the first
// card and its badge row always render).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the passage list) draws its arrow.
//  B) every picker anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-comprehension --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No card seeding needed — the passage picker renders its full list
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

test('deep dive: ▶ on Comprehension launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/comprehension', { waitUntil: 'networkidle' })

  // Picker landing — the passage list is up (Comprehension never enters theater mode).
  await expect(page.locator('[data-guide="comprehension-passages"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/reading comprehension/i) // the centered intro step

  // Advance off the intro → the first anchored step (passage list) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Pick a passage/i)
})

test('deep dive: every picker anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/comprehension', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="comprehension-passages"]',
    '[data-guide="comprehension-badges"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
