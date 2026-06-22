// Phase 3c T13 — the Grammar drills deep-dive Full Page Guide. The header ▶
// "Tour this page" now works on /grammar: a centered intro, then an arrow
// pointing at each control (SRS/Cram pill, language toggle, the skill tabs, and
// the drill card itself) with a plain-English "what it does + example".
//
// Grammar is a normal (non-theater) page, so the deep-dive entry is the standard
// HEADER ▶. Every anchor sits on an ALWAYS-mounted element: the SRS/Cram pill,
// language toggle and tab row render unconditionally, and the default tab is
// 'drill' so a drill card is always present at landing (the same anchor is on
// BOTH the Malay and English drill branches; only one mounts at a time — a fresh
// store defaults to studyLang 'ms', so the Malay imbuhan card renders).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the SRS/Cram pill) draws its arrow.
//  B) every control anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-grammar --config tests/e2e/playwright.config.js
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
// No card seeding needed — the Grammar drills render from built-in data.
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

test('deep dive: ▶ on Grammar launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/grammar', { waitUntil: 'networkidle' })

  // Landing — the SRS/Cram pill is up (not a theater-mode session).
  await expect(page.locator('[data-guide="grammar-mode"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/grammar drills/i) // the centered intro step

  // Advance off the intro → the first anchored step (SRS/Cram pill) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/SRS or Cram/i)
})

test('deep dive: every control anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/grammar', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="grammar-mode"]',
    '[data-guide="grammar-lang"]',
    '[data-guide="grammar-tabs"]',
    '[data-guide="grammar-drill"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
