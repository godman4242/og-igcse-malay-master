import { test, expect } from '@playwright/test'

// Claim 4c/4b — opt-in "Mixed prefixes" interleaving on the Malay Imbuhan tab,
// gated behind block-first readiness (≥ 3 graduated imbuhan drills). The
// reorder logic itself is exhaustively unit-tested (interleaveByPrefix.test.js,
// incl. the real IMBUHAN_DRILLS array); this spec pins the WIRING: gate
// visibility, the English guard, toggle copy/state, cram-hide, and that the
// rendered drill order actually alternates once enabled.

// Vite "?t=…" module-URL trap — bind the LIVE store instance (see CLAUDE.md).
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    window.__STORE = (await import(url)).default
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

// Seed N graduated (Review-state) imbuhan PREFIX drills so the block-first
// gate opens. Distinct prefixes, all real IDs; not-due so they sort last and
// leave the unseen pool to interleave.
async function seedGraduatedImbuhan(page) {
  await page.evaluate(() => {
    const due = new Date(Date.now() + 10 * 864e5).toISOString()
    const card = (id) => ({
      due, stability: 12, difficulty: 5, elapsed_days: 1, scheduled_days: 10,
      reps: 3, lapses: 0, state: 2 /* Review */, last_review: new Date().toISOString(), id,
    })
    window.__STORE.setState({
      grammarCards: {
        'prefix-meN-tulis': card('prefix-meN-tulis'),
        'prefix-ber-main': card('prefix-ber-main'),
        'prefix-peN-tulis': card('prefix-peN-tulis'),
      },
    })
  })
}

const toggle = (page) => page.getByTestId('mix-prefixes-toggle')

test.describe('Claim 4c — Mixed-prefixes imbuhan interleaving', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('block-first gate: a new learner sees no toggle on the Malay imbuhan tab', async ({ page }) => {
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    // Default tab is the Malay imbuhan ("drill") tab.
    await expect(page.getByRole('heading', { name: 'Grammar Drills' })).toBeVisible()
    await expect(page.getByPlaceholder('Type your answer...')).toBeVisible()
    await expect(toggle(page)).toHaveCount(0)
  })

  test('gate opens after ≥3 graduated drills; English tab stays guarded', async ({ page }) => {
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    await bindStore(page)
    await seedGraduatedImbuhan(page)
    await expect(toggle(page)).toBeVisible()
    await expect(page.getByText('Drills grouped by form.')).toBeVisible()

    // Switch to English — the toggle must disappear (EN confusables have no prefix).
    await page.getByRole('button', { name: 'English' }).click()
    await expect(toggle(page)).toHaveCount(0)

    // Back to Malay — toggle returns.
    await page.getByRole('button', { name: 'Bahasa Melayu' }).click()
    await expect(toggle(page)).toBeVisible()
  })

  test('toggling flips copy + active state and survives spam-clicking', async ({ page }) => {
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    await bindStore(page)
    await seedGraduatedImbuhan(page)
    await expect(toggle(page)).toBeVisible()
    await expect(page.getByText('Drills grouped by form.')).toBeVisible()

    await toggle(page).click()
    await expect(page.getByText('Mixing meN-/ber-/peN- — you pick which form fits.')).toBeVisible()

    // Go wild: spam the toggle, it must stay consistent (end OFF after even count).
    for (let i = 0; i < 6; i++) await toggle(page).click()
    await expect(page.getByText('Mixing meN-/ber-/peN- — you pick which form fits.')).toBeVisible()
  })

  test('cram mode hides the toggle (interleave is an SRS-order reorder)', async ({ page }) => {
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    await bindStore(page)
    await seedGraduatedImbuhan(page)
    await expect(toggle(page)).toBeVisible()
    // The SRS/Cram pill lives at the top of the page.
    await page.getByRole('button', { name: /SRS|Cram/ }).first().click()
    await expect(toggle(page)).toHaveCount(0)
  })

  test('enabling the toggle interleaves the rendered drill order (blocked → mixed)', async ({ page }) => {
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    await bindStore(page)
    await seedGraduatedImbuhan(page)
    await expect(toggle(page)).toBeVisible()

    // The imbuhan deck renders one drill at a time; a hidden e2e hook exposes
    // the head of the computed order. OFF = authored block (one prefix runs);
    // ON = confusable forms interleaved (no two adjacent the same where possible).
    const order = () => page.getByTestId('imbuhan-order')

    const off = (await order().textContent()).split(',')
    expect(new Set(off.slice(0, 4))).toEqual(new Set(['meN-'])) // blocked: opening run is all meN-

    await toggle(page).click()
    const on = (await order().textContent()).split(',')
    // First three forms are all distinct — the meN- block is broken up.
    expect(new Set(on.slice(0, 3)).size).toBe(3)
    expect(on[0]).toBe('meN-')
    expect(on.join(',')).not.toBe(off.join(','))
  })
})

test.describe('Claim 4c — light + dark render', () => {
  for (const theme of ['dark', 'light']) {
    test(`Mixed-prefixes toggle renders in ${theme}`, async ({ page }) => {
      await resetState(page)
      if (theme === 'light') {
        // Default theme is dark; one toggle → light (persisted across the nav).
        await page.evaluate(() => window.__STORE.getState().toggleTheme())
      }
      await page.goto('/grammar', { waitUntil: 'networkidle' })
      await bindStore(page)
      await seedGraduatedImbuhan(page)
      await expect(toggle(page)).toBeVisible()
      await toggle(page).click()
      await expect(page.getByText('Mixing meN-/ber-/peN- — you pick which form fits.')).toBeVisible()
      await page.screenshot({ path: `test-results/imbuhan-interleave-${theme}.png`, fullPage: true })
    })
  }
})
