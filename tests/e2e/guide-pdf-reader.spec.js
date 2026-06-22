// Phase 3c T9 increment 2 — the PDF reader deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /pdf-reader: an intro, then an arrow pointing
// at each meaningful control with a plain-English "what it does + example".
//
// Two proofs:
//  A) empty state — the guide launches and the FIRST anchored step (the sample
//     CTA, which IS mounted on a blank page) draws its arrow.
//  B) loaded state — after loading the sample, every loaded-state anchor the
//     later steps point at physically exists, so those arrows resolve (no
//     hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-pdf-reader --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

test('deep dive: ▶ on the PDF reader launches and the first arrow draws', async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })

  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()                       // header ▶ now lit on /pdf-reader
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/reading lab/i)     // the centered intro step

  // Advance off the intro → the first anchored step (the sample CTA) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/sample/i)
})

test('deep dive: every loaded-state anchor exists so the later arrows resolve', async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })

  // Load the built-in sample so the loaded-state controls mount (the empty page
  // only renders import controls).
  await page.getByRole('button', { name: /Try a sample/i }).click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible()

  // Each anchor the deep-dive guide points an arrow at must be present in the DOM.
  for (const anchor of [
    '[data-guide="pdf-reading"]',
    '[data-guide="pdf-mode"]',
    '[data-guide="pdf-translate"]',
    '[data-guide="pdf-sentences"]',
    '[data-guide="pdf-fulltranslation"]',
    '[data-guide="pdf-view"]',
    '[data-guide="pdf-replace"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
