// Phase 3c T9 increment 2 + the empty-reader robustness fix (2026-06-23). The
// header ▶ "Tour this page" works on /pdf-reader: an intro, the sample CTA (the
// one control mounted on a blank page, anchored with an arrow), then a centered
// card for each loaded-state control with a plain-English "what it does + example".
//
// Three proofs:
//  A) empty state — the guide launches and the FIRST anchored step (the sample
//     CTA, which IS mounted on a blank page) draws its arrow.
//  B) loaded state — every loaded-state control anchor physically exists in the
//     DOM (cross-verifies the source-scan; a future arrow upgrade could use them).
//  C) empty state, no skip — the WHOLE tour steps through on a blank reader with
//     nothing skipped (the loaded-state controls are centered cards now, so they
//     render even when their toolbar buttons aren't mounted). Pre-fix the 7 of 10
//     anchored steps evaporated on a blank reader.
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

  // Each control anchor the deep-dive cross-verifies (and a future arrow upgrade
  // could point at) must be present in the loaded DOM.
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

test('deep dive: on an EMPTY reader the tour renders every control step (no missing-anchor skip)', async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })

  // No doc loaded — only the sample CTA is mounted. Pre-fix, the 7 loaded-state
  // control steps (anchored at toolbar buttons) silently skipped here.
  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Walk the tour, asserting each step's title IN ORDER — awaiting each title
  // before the next click also keeps the re-entrancy guard from dropping a
  // too-fast double-fire. Reaching the LAST card proves nothing evaporated.
  const titles = [
    /reading lab/i,                 // 0 — centered intro
    /Start with a sample/i,         // 1 — pdf-sample (the ONLY anchored step; present on empty)
    /Tap any word/i,                // 2 — centered card (was an anchored step → skipped pre-fix)
    /Translate vs Select/i,         // 3
    /Translate page/i,              // 4
    /Sentences/i,                   // 5
    /Full translation/i,            // 6
    /Reflow vs Layout/i,            // 7
    /Bring your own material/i,     // 8 — last card; only shows if no step was skipped
  ]
  await expect(popover).toContainText(titles[0])
  for (let i = 1; i < titles.length; i++) {
    await popover.getByRole('button', { name: /Next/i }).click()
    await expect(popover, `step ${i}`).toContainText(titles[i])
  }
  // Finish cleanly — the tour completes, never dead-ends.
  await popover.getByRole('button', { name: /Done/i }).click()
  await expect(popover).toHaveCount(0)
})
