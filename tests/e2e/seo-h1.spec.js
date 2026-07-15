import { test, expect } from '@playwright/test'

// Each route's single <h1> is its own page name (sr-only), not the brand codename.
for (const [path, name] of [['/study', 'Study'], ['/writing', 'Writing'], ['/grammar', 'Grammar']]) {
  test(`H1 on ${path} is "${name}"`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(name)
    await expect(page.locator('h1', { hasText: 'ooga' })).toHaveCount(0)
  })
}
