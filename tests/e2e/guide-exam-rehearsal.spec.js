// Phase 3c T20 — the Exam Rehearsal deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /exam-rehearsal: a centered intro, then an
// arrow pointing at each INTRO/landing control (the four-skill Stages overview
// card, the language toggle, the Start button), then a centered summary of the
// scoring + spaced schedule (the composite Exam Readiness %, next-due, recent
// attempts, TTS-skipped listening). The timed stages (comprehension → listening
// → writing → speaking → results) only mount after Start is pressed, so they are
// taught without an arrow.
//
// ExamRehearsal is a normal (non-theater) page — it never calls useTheaterMode,
// so the header (and its ▶) stays put on the INTRO landing — so the deep-dive
// entry is the standard HEADER ▶, and all three anchors are mounted at landing
// (the Stages card, the language toggle and the Start button all render
// unconditionally in the INTRO branch).
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the four-skill Stages card) draws its arrow.
//  B) every landing anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-exam-rehearsal --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh state + suppress the first-run tour offer so only our deep-dive
// launches. No seeding needed — the INTRO screen renders regardless of deck or
// attempt history.
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

test('deep dive: ▶ on Exam Rehearsal launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/exam-rehearsal', { waitUntil: 'networkidle' })

  // INTRO landing — the language toggle is up (ExamRehearsal never enters
  // theater mode, so the header stays visible).
  await expect(page.locator('[data-guide="exam-lang"]')).toBeVisible()

  // No theater mode here → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/full exam dry-run/i) // the centered intro step

  // Advance off the intro → the first anchored step (the Stages card) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/four skills, one sitting/i)
})

test('deep dive: every landing anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/exam-rehearsal', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="exam-stages"]',
    '[data-guide="exam-lang"]',
    '[data-guide="exam-start"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
