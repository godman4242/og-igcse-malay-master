// Phase 3c T10 + the empty-state hang fix (2026-06-23, GOAL loop-safe #5) — the
// Study page deep-dive Full Page Guide. The header ▶ "Tour this page" works on
// /study.
//
// Study has TWO mutually-exclusive render states with NO element common to both:
// the "No cards to study!" EmptyState (the state a fresh-store student lands in —
// the deck is empty until a pack is loaded / words imported) and the active
// session (deck selector, mode pills, stats, the card, the skip row). All five
// controls sit behind `if (!sorted.length) return <EmptyState>` in Study.jsx, so
// NONE mount on an empty deck. The original deep dive anchored arrows at them and
// the tests SEEDED cards to make the arrows resolve — which meant a real fresh
// student launching ▶ on the empty /study got a ~4s hang (5 × 800ms missing-anchor
// stalls) and a tour that taught nothing. So the deep dive is now ENTIRELY centered
// arrow:'none' cards that render identically in both states (mirrors /mistakes +
// /saved-cloze). An active session enters theater mode, but on the EMPTY landing —
// where the tour is launched — theater mode is off, so the header ▶ is the entry.
//
// Two proofs (on the genuine EMPTY deck — no seeding):
//  A) the guide launches from the header ▶ and steps through EVERY card in order
//     to a clean finish (no skip, no hang on the empty deck).
//  B) the whole tour is centered — NO arrow ever draws on the empty page.
//
// Run solo:
//   npx playwright test guide-study --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh store → zero cards → the "No cards to study!" EmptyState renders. Suppress
// the first-run tour offer so only our deep dive launches. NO card seeding — the
// whole point is that the tour works on the empty deck a fresh student sees.
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

test('deep dive: ▶ on the EMPTY Study deck launches and walks every step (no skip, no hang)', async ({ page }) => {
  await prep(page)
  await page.goto('/study', { waitUntil: 'networkidle' })

  // No cards → the empty state. The header ▶ is still lit because /study is in
  // PAGE_GUIDE_ROUTES (the header lives in the Layout, not the page body), and
  // theater mode is OFF on the empty deck (no active session).
  await expect(page.getByText(/No cards to study/i)).toBeVisible()

  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Walk the tour, asserting each step's title IN ORDER — awaiting each title
  // before the next click also keeps the re-entrancy guard from dropping a
  // too-fast double-fire. Reaching the LAST card proves nothing evaporated on the
  // empty deck (pre-fix, the five anchored steps all skipped here).
  // Micro-guide style (2026-06-24): 5 short centered cards.
  const titles = [
    /Tour: study/i,                // 0 — centered intro
    /Pick your deck/i,             // 1
    /7 ways to practise/i,         // 2
    /deck at a glance/i,           // 3
    /Grade honestly/i,             // 4 — last
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

test('deep dive: the Study guide is all centered cards (no arrow ever draws)', async ({ page }) => {
  await prep(page)
  await page.goto('/study', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Step through all 5 cards; a centered card has no pointer, so the guide pointer
  // must never appear at any step.
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('svg.guide-pointer')).toHaveCount(0)
    const next = popover.getByRole('button', { name: /Next/i })
    if (await next.count()) await next.click()
  }
})
