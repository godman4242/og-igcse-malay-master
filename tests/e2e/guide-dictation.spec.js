// Phase 3c T24 — the Dictation deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /dictation: a centered intro, then an arrow
// pointing at each always-mounted SETUP control (the language toggle + the Start
// button), then a centered summary of the listen-and-type loop (Play / replay /
// the typing box / the word-by-word diff / the score). Those only mount AFTER
// Start, so they are taught without an arrow (never a missing-anchor skip).
//
// Dictation is a normal (non-theater) page, so the deep-dive entry is the
// standard HEADER ▶, and the two anchors are mounted at landing (the setup screen
// renders the toggle + Start button unconditionally; Start is greyed out without
// TTS but still present).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the language toggle) draws its arrow.
//  B) every landing anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-dictation --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No seeding needed — the setup screen (language toggle + Start)
// renders regardless of store state.
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

test('deep dive: ▶ on Dictation launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/dictation', { waitUntil: 'networkidle' })

  // Landing — the setup language toggle is up (Dictation never enters theater mode).
  await expect(page.locator('[data-guide="dictation-lang"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/dictation/i) // the centered intro step

  // Advance off the intro → the first anchored step (language toggle) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Malay or English/i)
})

test('deep dive: every landing anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/dictation', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="dictation-lang"]',
    '[data-guide="dictation-start"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
