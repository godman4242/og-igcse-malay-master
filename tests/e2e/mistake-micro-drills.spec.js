import { test, expect } from '@playwright/test'

// Mistake-journal micro-drills (2026-06-05). A focused recall + correction pass
// over getFixUpQueue: "Got it / Noted" → markMistakeReviewed (drops the active
// total); "Still shaky" leaves it unreviewed (it stays in the queue). The drill
// is a REVIEW pass — it must NOT touch FSRS and must NOT re-log on view.
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

const addMistake = (page, payload) =>
  page.evaluate(m => window.__STORE.getState().addMistake(m), payload)

const activeTotal = (page) =>
  page.evaluate(() => window.__STORE.getState().getMistakeStats().total)

const cardCount = (page) =>
  page.evaluate(() => window.__STORE.getState().cards.length)

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

// Three mistakes chosen so NONE auto-promote (keeps FSRS out of it): an English
// vocab miss (answer), a comprehension miss (answer), a Malay cohesion tip
// (reflect). All severity 'med', distinct words/surfaces → all survive the
// getFixUpQueue word-dedupe.
async function seedThree(page) {
  await addMistake(page, {
    type: 'vocab', source: 'e2e', language: 'en', category: 'vocab', severity: 'med',
    word: 'because', correct: 'because', given: 'becuase', surface: 'I am happy becuase the sun is out.',
  })
  await addMistake(page, {
    type: 'comprehension', source: 'e2e', language: 'en', category: 'comprehension', severity: 'med',
    surface: 'Why did Aisha feel nervous?', given: 'She was tired', correct: 'She had an exam tomorrow', note: 'inference',
  })
  await addMistake(page, {
    type: 'roleplay', source: 'e2e', language: 'ms', category: 'cohesion', severity: 'med',
    surface: 'Saya pergi kedai. Saya beli roti.', note: 'Vary your connectors — try “kemudian”, “selepas itu”.',
  })
}

// Drive the drill to the end card. `stillShakyOnce` skips the first ANSWER card
// via "Still shaky" (leaving it unreviewed); everything else gets Got it/Noted.
async function runDrill(page, { stillShakyOnce = false } = {}) {
  const back = page.getByRole('button', { name: /back to journal/i })
  const showAnswer = page.getByRole('button', { name: /show answer/i })
  let shakyDone = false
  for (let i = 0; i < 8; i++) {
    if (await back.isVisible().catch(() => false)) return
    if (await showAnswer.isVisible().catch(() => false)) {
      await showAnswer.click()
      if (stillShakyOnce && !shakyDone) {
        await page.getByRole('button', { name: /still shaky/i }).click()
        shakyDone = true
      } else {
        await page.getByRole('button', { name: /^got it$/i }).click()
      }
    } else {
      await page.getByRole('button', { name: /^noted$/i }).click()
    }
  }
  throw new Error('drill did not reach the end card within 8 steps')
}

test.describe('Mistake micro-drills', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('entry CTA opens the drill; Got it/Noted clears the whole queue', async ({ page }) => {
    await seedThree(page)
    expect(await activeTotal(page)).toBe(3)
    const cardsBefore = await cardCount(page)

    await page.goto('/mistakes', { waitUntil: 'networkidle' })
    await bindStore(page)

    const cta = page.getByRole('button', { name: /fix your mistakes \(3\)/i })
    await expect(cta).toBeVisible()
    await cta.click()

    await runDrill(page)

    await expect(page.getByText(/reviewed 3 of 3/i)).toBeVisible()
    expect(await activeTotal(page)).toBe(0)
    // FSRS untouched: the drill never adds/removes cards for these categories.
    expect(await cardCount(page)).toBe(cardsBefore)
  })

  test('Still shaky leaves the mistake in the queue', async ({ page }) => {
    await seedThree(page)
    await page.goto('/mistakes?drill=1', { waitUntil: 'networkidle' })
    await bindStore(page)

    await runDrill(page, { stillShakyOnce: true })

    // Exactly one item kept unreviewed.
    await expect(page.getByText(/reviewed 2 of 3/i)).toBeVisible()
    expect(await activeTotal(page)).toBe(1)
  })

  test('answer card reveals the fix contrastively (your error vs. the answer) — dark + light', async ({ page }) => {
    await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'en', category: 'vocab', severity: 'med',
      word: 'because', correct: 'because', given: 'becuase', surface: 'I am happy becuase the sun is out.',
    })
    await page.goto('/mistakes?drill=1', { waitUntil: 'networkidle' })
    await bindStore(page)

    await page.getByRole('button', { name: /show answer/i }).click()
    await expect(page.getByText(/you wrote/i)).toBeVisible()
    await expect(page.getByText('becuase')).toBeVisible()
    await page.screenshot({ path: 'test-results/mistake-micro-drills/answer-dark.png', fullPage: false })

    await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
    await page.waitForTimeout(150)
    await page.screenshot({ path: 'test-results/mistake-micro-drills/answer-light.png', fullPage: false })
  })

  test('viewing a mistake in the drill does NOT re-log it (no double-count)', async ({ page }) => {
    await seedThree(page)
    expect(await activeTotal(page)).toBe(3)

    await page.goto('/mistakes?drill=1', { waitUntil: 'networkidle' })
    await bindStore(page)

    // Reveal the first answer card but take NO rating action, then leave via
    // the header back button ("Journal", distinct from the end card's
    // "Back to journal").
    await page.getByRole('button', { name: /show answer/i }).click()
    await page.getByRole('button', { name: /^journal$/i }).click()
    // Total is unchanged — viewing never calls addMistake again.
    expect(await activeTotal(page)).toBe(3)
  })
})
