// "Go wild" chaos pass for two linked PDF-reader/guide bugs (root-caused 2026-06-23):
//   Bug A — "Try a sample" rendered BLANK for a returning user whose remembered
//           view was Layout: a text sample has no pdfDoc, so the Layout canvas
//           view drew nothing. The fix forces reflow on sample load.
//   Bug B — the /pdf-reader page tour hung ~3s per missing anchor (waitForElement's
//           3000ms cross-route default), compounded on a blank reader where the
//           loaded-state anchors never mount; and a double-click on Next could
//           stack two advances. The fix threads an 800ms page step-wait + a
//           re-entrancy guard on handleNext.
//
// Run solo:
//   npx playwright test guide-pdf-chaos --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Bind the LIVE store module (the one React subscribed to) via its ?t=-tagged
// resource URL — the documented Vite dev trap (see mistake-promotion.spec.js).
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

test('Bug B chaos: page tour on a BLANK reader — 8× Next spam never 3s-hangs nor dead-ends', async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/reading lab/i) // centered intro step

  // On a blank reader only the sample-CTA anchor is mounted; the 7 loaded-state
  // anchors (pdf-reading/mode/translate/sentences/fulltranslation/view/replace)
  // never mount, so ONE Next from the sample step must skip all 7. With the old
  // 3000ms default that's a ~21s hang; the 800ms page step-wait bounds it to ~6s.
  // Rapid-firing 8 clicks also exercises the Next re-entrancy guard — a
  // double-click must not stack advances or wedge the tour.
  const start = Date.now()
  for (let i = 0; i < 8; i++) {
    const next = popover.getByRole('button', { name: /Next|Done/i })
    if (await next.count()) await next.click({ timeout: 1500 }).catch(() => {})
  }
  // The tour reaches a terminal state (popover torn down) far under the broken
  // ~21s hang — proving each missing anchor skips fast AND the spam never
  // dead-ended the tour (it always completed, never needed a rescue click).
  // Bound = 12s: fixed is ~6s (7 × 800ms + overhead), broken is ~21s, so this
  // discriminates cleanly with a comfortable margin against slow-machine flake.
  await expect(popover).toHaveCount(0, { timeout: 12000 })
  expect(Date.now() - start).toBeLessThan(12000)
})

test('Bug A: saved view = Layout still populates the reader on "Try a sample"', async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })

  // Repro the bug's precondition: a returning user whose remembered view is
  // Layout. Persist that pref via the live store, then reload so PDFReader
  // initialises view='layout' from it.
  await bindStore(page)
  await page.evaluate(() => {
    const s = window.__STORE.getState()
    window.__STORE.setState({ pdfReader: { ...s.pdfReader, layoutView: true } })
  })
  await page.reload({ waitUntil: 'networkidle' })

  // A text sample has no pdfDoc → the Layout canvas view renders blank. The fix
  // forces reflow on sample load, so the tokenised reader actually populates.
  await page.getByRole('button', { name: /Try a sample/i }).click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible({ timeout: 5000 })
})
