import { test, expect } from '@playwright/test'

// Smoke coverage for the Dashboard "Paper balance" card (review feature #7,
// flagged "not automated" in its ship box): hidden at zero activity, appears
// once any skill logs, calls out untouched skills, rows navigate.

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
  })
}

test.describe('Dashboard — paper balance card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)
  })

  test('hidden with zero activity, appears after a logged unit, flags untouched skills', async ({ page }) => {
    await expect(page.getByText('Paper balance')).toHaveCount(0)

    await page.evaluate(() => window.__STORE.getState().logSkillActivity('listening'))
    await expect(page.getByText('Paper balance')).toBeVisible()

    // The logged skill shows its count; the others are called out as untouched.
    await expect(page.getByRole('button', { name: /^Listening: 1 activity/ })).toBeVisible()
    await expect(page.getByText(/untouched this week/i)).toBeVisible()
    await expect(page.getByText(/untouched this week/i)).toContainText('Writing')
  })

  test('a skill row navigates to its practice surface', async ({ page }) => {
    await page.evaluate(() => window.__STORE.getState().logSkillActivity('reading'))
    await expect(page.getByText('Paper balance')).toBeVisible()
    await page.getByRole('button', { name: /^Reading: 1 activity/ }).click()
    await expect(page).toHaveURL(/\/comprehension$/)
  })

  test('counts accumulate across repeated units of the same skill', async ({ page }) => {
    await page.evaluate(() => {
      const s = window.__STORE.getState()
      s.logSkillActivity('listening')
      s.logSkillActivity('listening')
      s.logSkillActivity('grammar')
    })
    await expect(page.getByRole('button', { name: /^Listening: 2 activities/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Grammar: 1 activity/ })).toBeVisible()
  })
})
