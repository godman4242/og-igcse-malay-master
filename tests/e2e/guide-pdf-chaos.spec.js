// "Go wild" chaos pass for a PDF-reader bug (root-caused 2026-06-23):
//   Bug A — "Try a sample" rendered BLANK for a returning user whose remembered
//           view was Layout: a text sample has no pdfDoc, so the Layout canvas
//           view drew nothing. The fix forces reflow on sample load.
//   (Bug B — the page tour stalling/skipping on a blank reader — is now pinned
//   for every route by guide-page-tours.spec.js.)
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
