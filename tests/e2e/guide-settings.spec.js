// Phase 3c T25 — the Settings deep-dive Full Page Guide (the LAST page →
// Phase 3c complete, R1 satisfied: every route now has a working header ▶).
// The deep dive opens with a centered intro, then points an arrow at each
// always-mounted landing section (the App-guide card → Study-language card →
// Preferences card → Backup & Share card), and closes with a centered summary of
// the two OPTIONAL clusters (cloud sign-in + the BYOK AI-provider keys) that are
// partly conditional and so are NOT anchored.
//
// Settings is a normal (non-theater) page, so the entry is the standard HEADER ▶,
// and every anchored section renders unconditionally at landing.
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the App-guide card) draws its arrow.
//  B) every landing anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-settings --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No seeding needed — every Settings section renders unconditionally.
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

test('deep dive: ▶ on Settings launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/settings', { waitUntil: 'networkidle' })

  // Landing — the App-guide card is up (Settings never enters theater mode).
  await expect(page.locator('[data-tour="guide-card"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/settings & tools/i) // the centered intro step

  // Advance off the intro → the first anchored step (App-guide card) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Replay any tour/i)
})

test('deep dive: every landing anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/settings', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-tour="guide-card"]',
    '[data-guide="settings-language"]',
    '[data-guide="settings-preferences"]',
    '[data-guide="settings-data"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
