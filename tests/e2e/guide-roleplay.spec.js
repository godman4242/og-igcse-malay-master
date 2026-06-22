// Phase 3c T12 — the Roleplay picker deep-dive Full Page Guide. The header ▶
// "Tour this page" now works on /roleplay: a centered intro, then an arrow
// pointing at each picker control (language toggle, Scenarios/History tabs, and
// a scenario card with its two run modes) with a plain-English "what it does +
// example".
//
// Like /smart-study and /practice, the Roleplay PICKER is a normal (non-theater)
// page — only the active session (AI or Static) enters theater mode — so the
// deep-dive entry is the standard HEADER ▶, and the picker anchors are mounted
// at landing (the default tab is 'scenarios', and the scenario list is never
// empty, so the first card always renders).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the language toggle) draws its arrow.
//  B) every picker anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-roleplay --config tests/e2e/playwright.config.js
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
// No card seeding needed — the scenario picker renders its full list regardless.
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

test('deep dive: ▶ on Roleplay launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/roleplay', { waitUntil: 'networkidle' })

  // Picker landing — the language toggle is up (not an active session).
  await expect(page.locator('[data-guide="roleplay-lang"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/speaking room/i) // the centered intro step

  // Advance off the intro → the first anchored step (language toggle) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Malay or English oral/i)
})

test('deep dive: every picker anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/roleplay', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="roleplay-lang"]',
    '[data-guide="roleplay-tabs"]',
    '[data-guide="roleplay-scenario"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
