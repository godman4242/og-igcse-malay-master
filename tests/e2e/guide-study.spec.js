// Phase 3c T10 — the Study page deep-dive Full Page Guide. The header ▶ "Tour
// this page" now works on /study: a centered intro, then an arrow pointing at
// each meaningful control with a plain-English "what it does + example".
//
// Study's controls only mount when the deck has cards (otherwise the page shows
// the "No cards to study!" empty state), so each test seeds a couple of cards
// via the live store first — the realistic state for a student on /study.
//
// Two proofs:
//  A) the guide launches, shows the intro, and the FIRST anchored step (the deck
//     selector) draws its arrow.
//  B) every loaded-state anchor the later steps point at physically exists, so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-study --config tests/e2e/playwright.config.js
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

// Fresh state, suppress the first-run tour offer, seed two Malay cards so the
// Study page renders its loaded state (deck/modes/stats/card/skip all mount).
async function seedStudyCards(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => {
    window.__STORE.setState({ guide: { seenQuick: true, seenFull: false }, activeDeck: 'All' })
    window.__STORE.getState().addCards([
      { m: 'rumah', e: 'house', t: 'Test', lang: 'ms', p: 'n', ex: 'Rumah saya besar.', mn: '' },
      { m: 'makan', e: 'eat', t: 'Test', lang: 'ms', p: 'v', ex: 'Saya suka makan.', mn: '' },
    ])
  })
}

test('deep dive: ▶ on Study launches and the first arrow draws', async ({ page }) => {
  await seedStudyCards(page)
  await page.goto('/study', { waitUntil: 'networkidle' })

  // Loaded state, not the empty state.
  await expect(page.locator('[data-guide="study-modes"]')).toBeVisible()

  // An active session enters theater mode → the header (and its ▶) is hidden, so
  // the deep-dive entry is the FLOATING ▶ beside the Lights-On pill. Wait for
  // theater mode (the Exit pill) so only the floating ▶ is in the a11y tree.
  await expect(page.getByRole('button', { name: /Exit theater mode/i })).toBeVisible()

  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()                       // floating ▶ reachable in theater mode
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/study session/i)   // the centered intro step

  // Advance off the intro → the first anchored step (the deck selector) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/deck/i)
})

test('deep dive: every loaded-state anchor exists so the later arrows resolve', async ({ page }) => {
  await seedStudyCards(page)
  await page.goto('/study', { waitUntil: 'networkidle' })

  // Each anchor the deep-dive guide points an arrow at must be present in the DOM.
  for (const anchor of [
    '[data-guide="study-deck"]',
    '[data-guide="study-modes"]',
    '[data-guide="study-stats"]',
    '[data-guide="study-card"]',
    '[data-guide="study-skip"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
