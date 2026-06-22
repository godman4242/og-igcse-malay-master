// Phase 3c T17 — the Speaking picker deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /speaking: a centered intro, then an arrow
// pointing at each picker control (the language toggle, the topic list, its
// badge row), then a centered summary of the prep→record→results flow (prompt
// + cues, speak-or-type, the instant band, Listen back, the AI grade). Those
// in-session controls only mount after a topic opens (and enter theater mode),
// so they are taught without an arrow.
//
// Like /comprehension and /listening, the Speaking PICK screen is a normal
// (non-theater) page, so the deep-dive entry is the standard HEADER ▶, and the
// picker anchors are mounted at landing (the language toggle renders always; the
// topic list is static + never empty, so the first card and its badge row always
// render — each card always carries the ~Ns duration badge).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the language toggle) draws its arrow.
//  B) every picker anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-speaking --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No card seeding needed — the topic picker renders its full list
// regardless of the deck.
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

test('deep dive: ▶ on Speaking launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/speaking', { waitUntil: 'networkidle' })

  // Picker landing — the language toggle is up (Speaking enters theater mode only
  // in the active PREP/RECORD session, not on the PICK screen).
  await expect(page.locator('[data-guide="speaking-lang"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/speaking practice/i) // the centered intro step

  // Advance off the intro → the first anchored step (language toggle) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Malay or English oral/i)
})

test('deep dive: every picker anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/speaking', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="speaking-lang"]',
    '[data-guide="speaking-topics"]',
    '[data-guide="speaking-badges"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
