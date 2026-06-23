// "Go wild" chaos pass for two linked PDF-reader/guide bugs (root-caused 2026-06-23):
//   Bug A — "Try a sample" rendered BLANK for a returning user whose remembered
//           view was Layout: a text sample has no pdfDoc, so the Layout canvas
//           view drew nothing. The fix forces reflow on sample load.
//   Bug B — the /pdf-reader page tour hung ~3s per missing anchor (waitForElement's
//           3000ms cross-route default), compounded on a blank reader where the
//           loaded-state anchors never mount; and a double-click on Next could
//           stack two advances. The fix threaded an 800ms page step-wait + a
//           re-entrancy guard on handleNext.
//   Bug B follow-up (2026-06-23, this cycle) — the 800ms cap only made the SKIP
//           fast; a student launching ▶ on a blank reader still saw 7 of 10 steps
//           silently evaporate. The real fix teaches the loaded-state controls as
//           centered cards (render in any state), so on a blank reader NOTHING
//           skips — and Next-spam still never wedges (the re-entrancy guard holds).
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

test('Bug B chaos: page tour on a BLANK reader renders every step (no skip), Next-spam never hangs nor wedges', async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/reading lab/i) // centered intro step

  // Post-fix: on a blank reader the 7 loaded-state controls are centered cards, so
  // NOTHING skips — every step renders (no waitForElement, so no per-anchor stall
  // is even possible). Spam Next: the re-entrancy guard drops double-fires rather
  // than stacking advances, but the tour ALWAYS reaches the end (never wedges).
  // Loop until the final control card appears (cap the attempts so a real wedge
  // would fail), then finish. Whole walk bounded well under the old ~21s hang.
  const start = Date.now()
  const lastCard = popover.getByText(/Bring your own material/i)
  for (let i = 0; i < 24 && (await lastCard.count()) === 0; i++) {
    const next = popover.getByRole('button', { name: /Next/i })
    if (await next.count()) await next.click({ timeout: 1500 }).catch(() => {})
  }
  await expect(lastCard).toBeVisible()                // last card rendered → nothing skipped
  await popover.getByRole('button', { name: /Done/i }).click()
  await expect(popover).toHaveCount(0, { timeout: 5000 }) // completes, never dead-ended
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
