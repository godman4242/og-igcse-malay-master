// Phase 3c T21 — the For You deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /for-you.
//
// For You has TWO mutually-exclusive render states with NO element common to
// both: a GetStarted empty card (a brand-new student with no signals — what a
// guide-explorer lands in) and the personalized shelves (Keep going / Picked for
// you / Still remember these? / saved words / goal). So the deep dive is ENTIRELY
// centered arrow:'none' cards — they render identically in both states, so
// nothing skips and the page needs zero JSX anchors. /for-you is a normal
// (non-theater) page, so the entry is the standard HEADER ▶.
//
// Two proofs (robust to either render state — the all-centered tour is identical
// in both):
//  A) the guide launches from the header ▶ and steps through EVERY card in order
//     to a clean finish (an anchored step would have evaporated on a state that
//     doesn't mount its target).
//  B) the whole tour is centered — NO arrow ever draws.
//
// Run solo:
//   npx playwright test guide-for-you --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh store, then suppress the first-run tour offer so only our deep dive
// launches (mirrors guide-mistakes prep).
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

test('deep dive: ▶ on For You launches and walks every step (no skip, no hang)', async ({ page }) => {
  await prep(page)
  await page.goto('/for-you', { waitUntil: 'networkidle' })

  // The "For You" heading renders in BOTH states (it lives in the page header,
  // above the empty card / the shelves), so this is a state-agnostic load check.
  await expect(page.getByRole('heading', { name: /For You/i })).toBeVisible()

  // The header ▶ is lit because /for-you is in PAGE_GUIDE_ROUTES (the header
  // lives in the Layout, not the page body).
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Walk the tour, asserting each step's title IN ORDER — awaiting each title
  // before the next click also keeps the re-entrancy guard from dropping a
  // too-fast double-fire. Reaching the LAST card proves nothing evaporated.
  const titles = [
    /your For-You home/i,      // 0 — centered intro
    /Keep going/i,             // 1 — today's plan as quick-starts
    /Picked for you/i,         // 2 — weak-spot session
    /Still remember these/i,   // 3 — no-stakes memory probe
    /Saved words/i,            // 4 — saved + goal shelves
    /Make a custom deck/i,     // 5 — MakeDeckPanel + empty state (last)
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

test('deep dive: the For You guide is all centered cards (no arrow ever draws)', async ({ page }) => {
  await prep(page)
  await page.goto('/for-you', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Step through all 6 cards; a centered card has no pointer, so the guide
  // pointer must never appear at any step.
  for (let i = 0; i < 6; i++) {
    await expect(page.locator('svg.guide-pointer')).toHaveCount(0)
    const next = popover.getByRole('button', { name: /Next/i })
    if (await next.count()) await next.click()
  }
})
