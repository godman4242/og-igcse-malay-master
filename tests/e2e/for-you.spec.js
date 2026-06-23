import { test, expect } from '@playwright/test'

// "For You" personalized home — Phase 1 (no AI). Smart shelves built from signals
// the app already has: weak topics, FSRS stability, the daily plan, the 'Saved'
// deck, and the goal preset. Each shelf self-hides when empty.
//
// Vite "?t=…" trap: see CLAUDE.md "## E2E tests". Rebind window.__STORE after
// every goto/reload.
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

// Inject crafted cards with explicit FSRS fields so the shelf signals are
// deterministic: one settled+idle+not-due card (→ "Still remember these?"), one
// overdue card (→ "Keep going" review), one Saved card (→ "From your saved words").
const seed = (page) =>
  page.evaluate(() => {
    const DAY = 86400000
    const now = Date.now()
    const iso = ms => new Date(ms).toISOString()
    window.__STORE.setState({
      cards: [
        { m: 'lama', e: 'old', ex: 'Rumah lama itu besar.', t: 'Topik', state: 2, stability: 40, difficulty: 5, reps: 5, lapses: 0, last_review: iso(now - 20 * DAY), due: iso(now + 10 * DAY) },
        { m: 'baru', e: 'new', ex: '', t: 'Topik', state: 2, stability: 5, difficulty: 5, reps: 3, lapses: 0, last_review: iso(now - 2 * DAY), due: iso(now - 1 * DAY) },
        { m: 'kucing', e: 'cat', ex: 'Kucing itu comel.', t: 'Saved', state: 2, stability: 30, difficulty: 5, reps: 4, lapses: 0, last_review: iso(now - 1 * DAY), due: iso(now + 5 * DAY) },
      ],
    })
    window.__STORE.getState().setGoalPreset('speak')
  })

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('For You — personalized home (Phase 1)', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('the bottom-nav tab reaches the For You home', async ({ page }) => {
    await seed(page)
    await page.getByRole('button', { name: /^for you$/i }).click()
    await expect(page).toHaveURL(/\/for-you$/)
    await expect(page.getByRole('heading', { name: /^for you$/i })).toBeVisible()
  })

  test('seeded signals render the right shelves and "Picked for you" launches a smart session', async ({ page }) => {
    await seed(page)
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await bindStore(page)

    await expect(page.getByRole('heading', { name: /^for you$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /picked for you/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /from your saved words/i })).toBeVisible()
    await expect(page.getByText('kucing')).toBeVisible()

    await page.getByRole('button', { name: /start session/i }).click()
    await expect(page).toHaveURL(/\/smart-study$/)
  })

  test('"Still remember these?" hides the meaning until tapped, and the goal shelf links out', async ({ page }) => {
    await seed(page)
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await bindStore(page)

    // The settled word shows; its meaning is hidden behind a recall tap.
    // Use exact + first: "lama" is a substring of its own example sentence and
    // the FSRS-scheduled card can surface in a second shelf on a different clock
    // (CI vs local), so a loose getByText('lama') hit 2 nodes on CI (strict-mode
    // violation). The exact headword is what we mean here.
    await expect(page.getByRole('heading', { name: /still remember these/i })).toBeVisible()
    await expect(page.getByText('lama', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('old', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: /show meaning/i }).first().click()
    await expect(page.getByText('old', { exact: true }).first()).toBeVisible()

    // Goal preset 'speak' → deep links to the speaking surfaces. ("Try a roleplay"
    // is unique to this shelf; "Practise speaking" can also appear in the daily plan.)
    await expect(page.getByRole('heading', { name: /toward your goal/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /try a roleplay/i })).toBeVisible()
  })

  test('disabling the recall probe and clearing the goal hides those shelves', async ({ page }) => {
    await seed(page)
    await page.evaluate(() => {
      window.__STORE.getState().setRecallProbe({ enabled: false })
      window.__STORE.getState().setGoalPreset(null)
    })
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await bindStore(page)

    await expect(page.getByRole('heading', { name: /picked for you/i })).toBeVisible() // still shows (cards exist)
    await expect(page.getByRole('heading', { name: /still remember these/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /toward your goal/i })).toHaveCount(0)
  })

  test('a brand-new learner sees the get-started state, not empty rails', async ({ page }) => {
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await expect(page.getByText(/your home fills up as you learn/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /picked for you/i })).toHaveCount(0)
  })

  test('renders cleanly in light + dark', async ({ page }) => {
    await seed(page)
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await bindStore(page)

    await expect(page.getByRole('heading', { name: /^for you$/i })).toBeVisible()
    await page.screenshot({ path: 'test-results/for-you/for-you-dark.png', fullPage: true })

    await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
    await page.waitForTimeout(150)
    await page.screenshot({ path: 'test-results/for-you/for-you-light.png', fullPage: true })
  })
})
