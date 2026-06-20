import { test, expect } from '@playwright/test'

// Starts the Quick tour deterministically from Settings → App guide, then:
//  1) clicks the dark backdrop and asserts the box is STILL interactive (the bug)
//  2) resumes and asserts the spotlight returns
//  3) Next still works (proves no dead state), then skip-to-step jumps
//
// The backdrop click is a raw mouse click at a corner pixel: driver.js's overlay
// is pointer-events:none and detects backdrop clicks at the document level, so a
// real click outside the popover is the faithful repro of the reported hang.

test('guide: backdrop click pauses (no hang), resume + skip work', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // 1) Click the dark backdrop (top-left corner) — must NOT kill the box.
  await page.mouse.click(5, 5)
  await expect(popover).toBeVisible()                                  // box alive
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)
  await expect(popover.locator('.guide-pause-btn')).toContainText(/Resume/i)

  // 2) Resume → spotlight returns (veil class removed).
  await popover.locator('.guide-pause-btn').click()
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(0)
  await expect(popover.locator('.guide-pause-btn')).toContainText(/Pause/i)

  // 3) Next still works (no dead state), then skip-to-step.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toBeVisible()
  await popover.locator('.guide-progress-jump').click()
  const input = popover.locator('.guide-progress-input')
  await input.fill('1')
  await input.press('Enter')
  await expect(popover).toBeVisible()
})
