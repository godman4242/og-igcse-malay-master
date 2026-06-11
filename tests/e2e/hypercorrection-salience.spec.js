import { test, expect } from '@playwright/test'

// Claims 2 & 5 (learning-science validation, 2026-06-11): the hypercorrection
// effect (a high-confidence error is the MOST fixable) only pays off if the
// learner attends to the CORRECTION. Before this fix the orange "you were sure,
// but it was wrong" callout told the user to "read the correct answer" but did
// NOT contain it — the answer sat in a small red ❌ line that reads as "wrong",
// not "study this". The fix embeds the correct answer prominently INSIDE the
// callout (data-testid="hypercorrect-answer"). This e2e pins that, plus the
// guardrail that the callout only appears on a confident-but-wrong miss.
//
// Vite "?t=…" module-URL trap — see CLAUDE.md "## E2E tests".
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

// Seed one due card and land on Study in Type mode.
async function seedAndOpenTypeMode(page) {
  await page.evaluate(() => {
    const s = window.__STORE.getState()
    s.setActiveDeck('All')
    s.addCards([{ m: 'merah', e: 'red', t: 'Test', ex: 'Bunga itu merah.' }])
  })
  await page.goto('/study', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Type$/ }).click()
  await expect(page.getByText(/type the english meaning/i)).toBeVisible()
}

test.describe('Hypercorrection answer salience (Claims 2 & 5)', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('confident + wrong → correct answer shown prominently inside the callout', async ({ page }) => {
    await seedAndOpenTypeMode(page)

    // Metacognitive calibration: say you are CERTAIN, then get it wrong.
    await page.getByRole('button', { name: /certain/i }).click()
    await page.getByPlaceholder(/type meaning/i).fill('blue')
    await page.getByRole('button', { name: /^check$/i }).click()

    // The hypercorrection callout appears...
    await expect(page.getByText(/you were sure, but it was wrong/i)).toBeVisible()
    // ...and the CORRECT answer is shown prominently INSIDE it (not just the
    // small ❌ line). data-testid scopes the assertion to the callout block.
    const prominent = page.getByTestId('hypercorrect-answer')
    await expect(prominent).toBeVisible()
    await expect(prominent).toHaveText('red')

    // Light + dark screenshots for the eyeball record.
    await page.screenshot({ path: 'test-results/hypercorrect-dark.png' })
    await page.evaluate(() => document.documentElement.querySelector('div')?.classList.add('light'))
  })

  test('confident + RIGHT → no hypercorrection callout (guardrail)', async ({ page }) => {
    await seedAndOpenTypeMode(page)

    await page.getByRole('button', { name: /certain/i }).click()
    await page.getByPlaceholder(/type meaning/i).fill('red')
    await page.getByRole('button', { name: /^check$/i }).click()

    await expect(page.getByText(/✅ Correct/i)).toBeVisible()
    await expect(page.getByText(/you were sure, but it was wrong/i)).toHaveCount(0)
    await expect(page.getByTestId('hypercorrect-answer')).toHaveCount(0)
  })

  test('unsure + wrong → answer still shown, but no hypercorrection callout', async ({ page }) => {
    await seedAndOpenTypeMode(page)

    // Low confidence: a wrong answer is an ordinary miss, not a hypercorrection.
    await page.getByRole('button', { name: /unsure/i }).click()
    await page.getByPlaceholder(/type meaning/i).fill('green')
    await page.getByRole('button', { name: /^check$/i }).click()

    // Ordinary miss still shows the correct answer (Claim 2) via the mode's line...
    await expect(page.getByText(/❌ red/).first()).toBeVisible()
    // ...but the prominent hypercorrection block is reserved for confident misses.
    await expect(page.getByText(/you were sure, but it was wrong/i)).toHaveCount(0)
    await expect(page.getByTestId('hypercorrect-answer')).toHaveCount(0)
  })
})
