// Phase 3c T11 — the Smart Study page deep-dive Full Page Guide. The header ▶
// "Tour this page" now works on /smart-study: a centered intro, then an arrow
// pointing at each config-screen control with a plain-English "what it does +
// example".
//
// Unlike /study, the /smart-study LANDING is the pre-session config screen
// (speaking toggle + Begin + Manual Study) — it does NOT enter theater mode
// (only the active SmartSession does), so the deep-dive entry is the normal
// HEADER ▶, and the config-screen anchors are mounted right there.
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the speaking toggle) draws its arrow.
//  B) every config-screen anchor the later steps point at physically exists, so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-smart-study --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Bind the LIVE store module instance (the one React subscribed to) — see the
// `?t=` module-URL trap note in CLAUDE.md. Required after every goto/reload.
async function bindStore(page) {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    window.__STORE = (await import(url)).default
  })
}

// Fresh state + suppress the first-run tour offer so only our deep-dive launches.
// No card seeding needed — the config screen renders regardless of deck state.
async function prep(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => {
    window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } })
  })
}

test('deep dive: ▶ on Smart Study launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/smart-study', { waitUntil: 'networkidle' })

  // Config (landing) screen, not the active session — the speaking toggle is up.
  await expect(page.locator('[data-guide="smartstudy-speaking"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/smart session/i) // the centered intro step

  // Advance off the intro → the first anchored step (speaking toggle) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/mic/i)
})

test('deep dive: every config-screen anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/smart-study', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="smartstudy-speaking"]',
    '[data-guide="smartstudy-begin"]',
    '[data-guide="smartstudy-manual"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
