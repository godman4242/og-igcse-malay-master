// Phase 3c T19 — the Mistake Journal deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /mistakes.
//
// The journal has TWO mutually-exclusive render states with NO element common to
// both: a celebratory EmptyState (a brand-new student with zero mistakes — the
// dominant state a guide-explorer launches ▶ in) and the populated journal (the
// Fix button, filter pills, charts, per-mistake cards). So the deep dive is
// ENTIRELY centered arrow:'none' cards — they render identically in both states,
// so nothing skips and the page needs zero JSX anchors. /mistakes is a normal
// (non-theater) page, so the entry is the standard HEADER ▶.
//
// Two proofs:
//  A) empty state — the guide launches from the header ▶ and steps through EVERY
//     card in order to a clean finish (pre-design, anchoring to a populated-only
//     control would have made these steps evaporate on the empty journal).
//  B) the whole tour is centered — NO arrow ever draws on the empty page.
//
// Run solo:
//   npx playwright test guide-mistakes --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh store → zero mistakes → the EmptyState renders. Suppress the first-run
// tour offer so only our deep dive launches.
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

test('deep dive: ▶ on the EMPTY Mistake Journal launches and walks every step (no skip, no hang)', async ({ page }) => {
  await prep(page)
  await page.goto('/mistakes', { waitUntil: 'networkidle' })

  // No mistakes yet → the celebratory empty state. The header ▶ is still lit
  // because /mistakes is in PAGE_GUIDE_ROUTES (the header lives in the Layout,
  // not the page body).
  await expect(page.getByText(/No Mistakes/i)).toBeVisible()

  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Walk the tour, asserting each step's title IN ORDER — awaiting each title
  // before the next click also keeps the re-entrancy guard from dropping a
  // too-fast double-fire. Reaching the LAST card proves nothing evaporated on
  // the empty journal.
  const titles = [
    /your Mistake Journal/i,   // 0 — centered intro
    /quick review pass/i,      // 1 — the Fix-your-mistakes drill
    /where you slip most/i,    // 2 — filters + charts + patterns
    /into a flashcard/i,       // 3 — promote + Mistakes deck (last)
  ]
  await expect(popover).toContainText(titles[0])
  for (let i = 1; i < titles.length; i++) {
    await popover.getByRole('button', { name: /Next/i }).click()
    await expect(popover, `step ${i}`).toContainText(titles[i])
  }
  // Finish cleanly — the tour completes, never dead-ends.
  await popover.getByRole('button', { name: /Done/i }).click()
  await expect(popover).toHaveCount(0)
})

test('deep dive: the Mistake Journal guide is all centered cards (no arrow ever draws)', async ({ page }) => {
  await prep(page)
  await page.goto('/mistakes', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Step through all 4 cards; a centered card has no pointer, so the guide
  // pointer must never appear at any step.
  for (let i = 0; i < 4; i++) {
    await expect(page.locator('svg.guide-pointer')).toHaveCount(0)
    const next = popover.getByRole('button', { name: /Next/i })
    if (await next.count()) await next.click()
  }
})
