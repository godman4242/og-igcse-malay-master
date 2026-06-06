import { test, expect } from '@playwright/test'

// Generative cloze — "Practise saved words" (2026-06-06). A productive-retrieval
// pass over the 'Saved' deck: the saved word is blanked inside its own example
// sentence (cloze), or — when there's no usable sentence — a plain produce
// prompt. These ARE real FSRS cards, so a rating feeds the existing scheduler:
//   "Got it"            → Rating.Good   (advances FSRS due)
//   "Needed the answer" → Rating.Hard   (NOT Again — Again would auto-log a
//                                        vocab mistake; a reveal must not)
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

const seedSaved = (page) =>
  page.evaluate(() => window.__STORE.getState().addCards([
    { m: 'rumah', e: 'house', ex: 'Saya tinggal di rumah besar.', t: 'Saved' },
    { m: 'sekolah', e: 'school', ex: '', t: 'Saved' }, // no sentence → produce fallback
  ]))

const cardDue = (page, m) =>
  page.evaluate(word => {
    const c = window.__STORE.getState().cards.find(x => x.m === word)
    return c ? new Date(c.due).getTime() : null
  }, m)

const mistakeTotal = (page) =>
  page.evaluate(() => window.__STORE.getState().getMistakeStats().total)

const reviewedToday = (page) =>
  page.evaluate(() => window.__STORE.getState().reviewedToday)

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('Generative cloze — Practise saved words', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('cloze then produce; Got it advances FSRS due; reveal maps to Hard (no mistake)', async ({ page }) => {
    await seedSaved(page)
    const dueBefore = await cardDue(page, 'rumah')

    await page.goto('/saved-cloze', { waitUntil: 'networkidle' })
    await bindStore(page)

    // Card 1 — cloze (has an example sentence). The word is blanked.
    await expect(page.getByText(/fill in the missing word/i)).toBeVisible()
    await expect(page.getByText('_____')).toBeVisible()
    await expect(page.getByText('house')).toBeVisible()
    await page.getByPlaceholder(/type the malay word/i).fill('rumah')
    await page.getByRole('button', { name: /^check$/i }).click()
    await expect(page.getByText(/correct/i)).toBeVisible()
    await page.getByRole('button', { name: /^got it$/i }).click()

    // Card 2 — produce fallback (empty example → no blank, English clue only).
    await expect(page.getByText(/produce the malay word/i)).toBeVisible()
    await expect(page.getByText('school')).toBeVisible()
    await page.getByRole('button', { name: /show answer/i }).click()
    await expect(page.getByText(/answer: sekolah/i)).toBeVisible()
    await page.getByRole('button', { name: /needed the answer/i }).click()

    // End card.
    await expect(page.getByText(/practised 2 saved words/i)).toBeVisible()

    // FSRS advanced: 'rumah' (Good) due moved into the future; both cards counted.
    const dueAfter = await cardDue(page, 'rumah')
    expect(dueAfter).toBeGreaterThan(dueBefore)
    expect(await reviewedToday(page)).toBe(2)

    // Guardrail: "Needed the answer" → Hard, so NO mistake was auto-logged.
    expect(await mistakeTotal(page)).toBe(0)
  })

  test('empty state when there are no saved words', async ({ page }) => {
    await page.goto('/saved-cloze', { waitUntil: 'networkidle' })
    await expect(page.getByText(/no saved words yet/i)).toBeVisible()
  })

  test('renders cleanly in light + dark', async ({ page }) => {
    await seedSaved(page)
    await page.goto('/saved-cloze', { waitUntil: 'networkidle' })
    await bindStore(page)

    await expect(page.getByText(/fill in the missing word/i)).toBeVisible()
    await page.screenshot({ path: 'test-results/generative-cloze/cloze-dark.png', fullPage: false })

    await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
    await page.waitForTimeout(150)
    await page.screenshot({ path: 'test-results/generative-cloze/cloze-light.png', fullPage: false })
  })
})
