// GOAL loop-safe #5 — the page-tour empty-state hang audit (parametrized across
// ALL Full Page Guide routes). Follow-up to the per-route Bug-B fix + the
// /pdf-reader-only guide-pdf-chaos.spec.js.
//
// THE BUG CLASS: every route's ▶ "Tour this page" can be launched on the page's
// EMPTY / first-visit state — a brand-new student with no cards, no saved words,
// no history. If a guide ANCHORS a step at a control that only mounts after data
// loads, the engine stalls PAGE_STEP_WAIT_MS (800ms, guideController.js) per
// missing anchor and then silently skips it. With several such anchors that is a
// multi-second hang AND a tour that teaches nothing — exactly what /study did on
// a fresh store (its whole page is the "No cards to study!" EmptyState, so all
// five study-* anchors were absent).
//
// THE AUDIT, per route, on the genuine empty/first-visit landing (NO seeding):
//  Part 1 (deterministic, the root-cause guard) — every anchored step's target
//          EXISTS on the empty landing (count 1). If every anchor resolves
//          immediately there are ZERO 800ms stalls and ZERO silent skips, so the
//          multi-second hang is structurally impossible. This is what fails RED
//          for an empty-state-unsafe guide.
//  Part 2 (behavioral, GOAL #5's literal Done) — launch the header ▶ and walk
//          Next to the end; the tour reaches a clean Done (never dead-ends)
//          within a bound (a real wedge blows the attempt cap / the bound).
//
// Run solo:
//   npx playwright test guide-empty-state-chaos --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { PAGE_GUIDES } from '../../src/lib/guide/pageGuides.js'

const WALK_BOUND_MS = 15_000

// Fresh state + suppress the first-run tour offer so ONLY our ▶ deep-dive
// launches. No card/passage/mistake seeding — each route is asserted on its
// genuine empty/first-visit state (the whole point of the audit). Mirrors
// guide-dictation.spec.js prep().
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

for (const route of Object.keys(PAGE_GUIDES)) {
  test(`empty-state page tour on ${route} never hangs or dead-ends`, async ({ page }) => {
    await prep(page)
    await page.goto(route, { waitUntil: 'networkidle' })

    // Part 1 — every anchored step's target is present on the EMPTY landing, so
    // the engine resolves it immediately (no 800ms stall, no silent skip). A
    // guide that anchors at a loaded-state-only control fails HERE.
    const anchored = PAGE_GUIDES[route].filter((s) => s.selector)
    for (const s of anchored) {
      await expect(page.locator(s.selector), `${route} ${s.selector}`).toHaveCount(1)
    }

    // Part 2 — launch the header ▶ (no theater mode on an empty landing) and walk
    // to the end. Bounded loop: a real wedge would never reach Done.
    await page.getByRole('button', { name: /Tour this page/i }).click()
    const popover = page.locator('.driver-popover.guide-theme')
    await expect(popover).toBeVisible()

    const total = PAGE_GUIDES[route].length
    const start = Date.now()
    for (let i = 0; i < total + 6; i++) {
      const done = popover.getByRole('button', { name: /Done/i })
      if (await done.count()) {
        await done.click({ timeout: 2000 }).catch(() => {})
        break
      }
      const next = popover.getByRole('button', { name: /Next/i })
      if (await next.count()) await next.click({ timeout: 2000 }).catch(() => {})
      else break
      await page.waitForTimeout(120) // let the step settle + the re-entrancy guard clear
    }
    await expect(popover).toHaveCount(0, { timeout: 5000 }) // completes, never dead-ends
    expect(Date.now() - start, `${route} walk time`).toBeLessThan(WALK_BOUND_MS)
  })
}
