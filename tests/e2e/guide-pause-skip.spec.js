import { test, expect } from '@playwright/test'

// Starts the Quick tour deterministically from Settings → App guide, then:
//  1) clicks the dark backdrop → pause. Un-docked, so the whole box HIDES
//     (Tpause★) and a single "Resume tour" pill appears; the page stays
//     interactive (free-roam veil-off on the root). NOT the old hang.
//  2) the Resume pill brings the box back + re-spotlights
//  3) Next still works (proves no dead state), then skip-to-step jumps
//
// The backdrop click is a raw mouse click at a corner pixel: driver.js's overlay
// is pointer-events:none and detects backdrop clicks at the document level, so a
// real click outside the popover is the faithful repro of the reported hang.

test('guide: backdrop click pauses → box hides, Resume pill restores it (Tpause★), skip works', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // 1) Click the dark backdrop (top-left corner) → pause. Un-docked → the whole
  //    box hides; the lone Resume pill appears; the page is interactive.
  await page.mouse.click(5, 5)
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)
  await expect(popover).toBeHidden()                                  // chrome gone (Tpause★)
  const fab = page.locator('.guide-resume-fab')
  await expect(fab).toBeVisible()

  // 2) Resume via the pill → box returns, spotlight back, pill gone.
  await fab.click()
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(0)
  await expect(popover).toBeVisible()
  await expect(fab).toHaveCount(0)
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
