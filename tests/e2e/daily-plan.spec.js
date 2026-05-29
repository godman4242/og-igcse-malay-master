import { test, expect } from '@playwright/test'

// Daily Plan spine — the ordered "what should I do today?" queue on the
// Dashboard. Pins: it renders for an activated (reviewed) deck, a task row
// routes, and it stays hidden until the first review (FirstRunCard owns that).
// Design: docs/superpowers/specs/2026-05-29-daily-plan-spine-design.md
//
// Uses the bindStore ?t= workaround (see CLAUDE.md "## E2E tests"): mutating
// the React-subscribed store instance triggers a real re-render.

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

// Inject a deck with `reviewedCount` reviewed cards (last_review = today) and
// all cards overdue, so hasReviewed is true and there are due cards to plan.
async function seedDeck(page, { size = 10, reviewedCount = 1 } = {}) {
  await page.evaluate(({ size, reviewedCount }) => {
    const now = Date.now()
    const cards = Array.from({ length: size }, (_, i) => ({
      m: `w${i}`, e: `e${i}`, ex: '', t: 'general',
      due: new Date(now - 86400000).toISOString(),
      last_review: i < reviewedCount ? new Date(now).toISOString() : null,
      state: 2, stability: 5, difficulty: 5, lapses: 0, reps: 1,
    }))
    window.__STORE.setState({ cards })
  }, { size, reviewedCount })
}

const planRegion = page => page.getByRole('region', { name: /your plan for today/i })

test.describe('Daily Plan spine', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('renders an ordered plan for a reviewed deck', async ({ page }) => {
    await seedDeck(page, { size: 10, reviewedCount: 1 })
    await expect(planRegion(page)).toBeVisible()
    // The budget chip and at least one task row should be present.
    await expect(page.getByText(/~\d+ min/).first()).toBeVisible()
  })

  test('a task row navigates into its activity', async ({ page }) => {
    await seedDeck(page, { size: 10, reviewedCount: 1 })
    const region = planRegion(page)
    await expect(region).toBeVisible()
    // 10 overdue cards => the review task routes to the interleaved session.
    await region.getByText(/review due cards/i).click()
    await expect(page).toHaveURL(/\/smart-study$/)
  })

  test('hidden until first review — FirstRunCard owns the empty/new deck', async ({ page }) => {
    // Fresh reset: no cards, never reviewed.
    await expect(planRegion(page)).toHaveCount(0)
    await expect(page.getByText(/let's build your deck/i)).toBeVisible()

    // Deck loaded but NOT yet reviewed: still hidden (FirstRunCard populated).
    await seedDeck(page, { size: 8, reviewedCount: 0 })
    await expect(planRegion(page)).toHaveCount(0)
  })
})
