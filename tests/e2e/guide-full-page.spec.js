import { test, expect } from '@playwright/test'

// Phase 3a — the header ▶ "Tour this page" starts a page-scoped deep dive on the
// Dashboard: the arrow appears pointing at the first spotlighted control, Next
// advances, and pausing (backdrop click) still works (no Phase 1/2 regression).

test('full page guide: ▶ on Dashboard shows the arrow and advances', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Advance off the centered intro to the first anchored step → arrow draws.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()

  // Next still advances; pause (backdrop) still works (Phase 1 intact).
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)
})
