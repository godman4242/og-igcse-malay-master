// Manual smoke for friction #2 — the BYOK "add your own key" nudge.
// Drives the real UI: forces "no key + daily quota spent" via localStorage
// (then reloads, so the store rehydrates — avoids the Vite ?t= store trap),
// and verifies the nudge appears, deep-links to a focused key field, and
// disappears once a key is present. Screenshots land in test-results/smoke/
// (gitignored). Run: npx playwright test addkey-smoke --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

const SHOT = (name) => `test-results/smoke/${name}.png`

// The dead-end this spec is about is a SIGNED-IN learner out of daily calls:
// sign one in through the live store (Vite ?t= trap: import the URL React
// subscribed to).
async function signIn(page) {
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const store = (await import(url)).default
    store.getState().setAuthUser({ id: 'e2e-user', email: 'e2e@example.com' })
  })
}

async function forceNoKeyQuotaSpent(page) {
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('igcse-ai-daily', JSON.stringify({ count: 50, date: today }))
    localStorage.removeItem('igcse-openrouter-key')
  })
}

test('nudge shows at an AI dead-end, deep-links to the focused key field', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await signIn(page)
  await forceNoKeyQuotaSpent(page)

  // Roleplay gets NO nudge: its AI is the ai-proxy's shared daily cap only, so a
  // learner's own key can't unlock it — it says when AI is back instead.
  await page.goto('/roleplay')
  await expect(page.getByText(/out of ai roleplay for today.*back tomorrow/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /your own free key/i })).toHaveCount(0)
  await page.screenshot({ path: SHOT('1-roleplay-out-of-calls-dark'), fullPage: false })

  // Cikgu — default copy above the composer.
  await page.goto('/cikgu')
  const cikguNudge = page.getByRole('button', { name: /add your own free key to keep ai going/i })
  await expect(cikguNudge).toBeVisible()
  await page.screenshot({ path: SHOT('2-cikgu-nudge-dark'), fullPage: false })

  // Tap it → lands on /settings#byok with the key input focused AND scrolled
  // into view (not just focused at the top of a long page).
  await cikguNudge.click()
  await expect(page).toHaveURL(/\/settings#byok$/)
  const keyInput = page.getByPlaceholder('sk-or-...')
  await expect(keyInput).toBeInViewport()
  await expect(keyInput).toBeFocused()
  await page.waitForTimeout(600) // let smooth-scroll settle before the shot
  await page.screenshot({ path: SHOT('3-settings-byok-focused'), fullPage: false })
})

test('nudge is hidden once the user has their own key', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('igcse-ai-daily', JSON.stringify({ count: 50, date: today }))
    localStorage.setItem('igcse-openrouter-key', 'sk-or-smoke-test-key')
  })
  await page.goto('/cikgu')
  // Wait for the page to actually render (lazy Suspense) before asserting the
  // nudge is ABSENT — otherwise count(0) could be a false pass on the spinner.
  await expect(page.getByPlaceholder(/Ask/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /add your own free key/i })).toHaveCount(0)
  await page.screenshot({ path: SHOT('4-cikgu-no-nudge-with-key'), fullPage: false })
})
