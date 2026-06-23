// Phase 3c T23 — the Cikgu Maya deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /cikgu: a centered intro, then an arrow
// pointing at each always-mounted control (the Expert/AI mode toggle + the
// question input row), then a centered summary of the empty-state helpers
// (suggested questions + Browse Topics), the capability-gated Voice/mic and the
// per-answer Expert/AI tag. Those are state- or device-dependent, so they are
// taught without an arrow.
//
// CikguBot is a normal (non-theater) page, so the deep-dive entry is the standard
// HEADER ▶, and the two anchors are mounted at landing (the mode toggle in the
// header + the input row both render unconditionally in the default view; the
// empty welcome/topic browser only changes the chat area, not these controls).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the mode toggle) draws its arrow.
//  B) every landing anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-cikgu --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No seeding needed — the header mode toggle and input row render in
// the default (empty-chat) view regardless of store state.
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

test('deep dive: ▶ on Cikgu launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/cikgu', { waitUntil: 'networkidle' })

  // Landing — the mode toggle is up (CikguBot never enters theater mode).
  await expect(page.locator('[data-guide="cikgu-mode"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/Cikgu Maya/i) // the centered intro step

  // Advance off the intro → the first anchored step (mode toggle) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Two ways to get answers/i)
})

test('deep dive: every landing anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/cikgu', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="cikgu-mode"]',
    '[data-guide="cikgu-input"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
