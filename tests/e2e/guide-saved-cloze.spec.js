// Phase 3c T24·3 — the Saved-word cloze deep-dive Full Page Guide. The header
// ▶ "Tour this page" now works on /saved-cloze.
//
// SavedWordCloze has TWO mutually-exclusive render states with NO element common
// to both: a "No saved words yet" EmptyState (a brand-new student with no saved
// 'Saved'-deck words — what a fresh-store guide-explorer lands in) and the active
// cloze session (the sentence-with-a-blank, the typing box, Check/Show-answer, the
// Got-it/Needed-the-answer rating). So the deep dive is ENTIRELY centered
// arrow:'none' cards — they render identically in both states, so nothing skips
// and the page needs zero JSX anchors. /saved-cloze is a normal (non-theater)
// page, so the entry is the standard HEADER ▶.
//
// Two proofs (robust to either render state — the all-centered tour is identical
// in both; a fresh store deterministically lands in the EMPTY state, which is the
// state most at risk of an anchored-step skip-hang):
//  A) the guide launches from the header ▶ and steps through EVERY card in order
//     to a clean finish (an anchored step would have evaporated on a state that
//     doesn't mount its target).
//  B) the whole tour is centered — NO arrow ever draws.
//
// Run solo:
//   npx playwright test guide-saved-cloze --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Fresh store, then suppress the first-run tour offer so only our deep dive
// launches (mirrors guide-for-you / guide-mistakes prep).
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

test('deep dive: ▶ on Saved-word cloze launches and walks every step (no skip, no hang)', async ({ page }) => {
  await prep(page)
  await page.goto('/saved-cloze', { waitUntil: 'networkidle' })

  // A fresh store has no 'Saved' deck → the page deterministically lands in the
  // empty state. This is the very state an anchored step would hang on, so it is
  // the right place to prove the all-centered tour completes.
  await expect(page.getByText(/No saved words yet/i)).toBeVisible()

  // The header ▶ is lit because /saved-cloze is in PAGE_GUIDE_ROUTES (the header
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
    /practise your saved words/i,        // 0 — centered intro
    /Built from the words you saved/i,   // 1 — the 'Saved' deck source
    /Fill the blank/i,                   // 2 — produce the word
    /Rate yourself/i,                    // 3 — Got it / Needed the answer (last)
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

test('deep dive: the Saved-word cloze guide is all centered cards (no arrow ever draws)', async ({ page }) => {
  await prep(page)
  await page.goto('/saved-cloze', { waitUntil: 'networkidle' })

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
