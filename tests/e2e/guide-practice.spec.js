// Phase 3c T11 — the Practice hub deep-dive Full Page Guide. The header ▶
// "Tour this page" now works on /practice: a centered intro, then an arrow
// pointing at each hub concept (grouped-by-skill layout, tile launchers, live
// status cues) with a plain-English "what it does + example".
//
// Like /smart-study, /practice is a normal (non-theater) page — the deep-dive
// entry is the standard HEADER ▶, and the hub anchors are mounted at landing.
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the grouped layout) draws its arrow.
//  B) every hub anchor the later steps point at physically exists, so those
//     arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-practice --config tests/e2e/playwright.config.js
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
// No card seeding needed — the hub renders its full grid regardless of deck state.
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

test('deep dive: ▶ on Practice launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/practice', { waitUntil: 'networkidle' })

  // Hub landing — the grouped grid is up (not a sub-surface).
  await expect(page.locator('[data-guide="practice-groups"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/practice hub/i) // the centered intro step

  // Advance off the intro → the first anchored step (grouped layout) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/grouped by exam skill/i)
})

test('deep dive: every hub anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/practice', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="practice-groups"]',
    '[data-guide="practice-tile"]',
    '[data-guide="practice-cue"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
