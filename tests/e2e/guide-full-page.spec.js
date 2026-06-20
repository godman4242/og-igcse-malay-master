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

// Phase 3b / R2 — the in-box ▶ "go deeper" button: from any running tour, drop
// into the Full Page Guide for the current route. Present only when the route
// HAS a page guide (never a dead button).

test('in-box ▶: present on a route with a page guide; tap tears down + goes deeper', async ({ page }) => {
  await page.goto('/')
  // Drive the controller directly with a recording onGoDeeper (guide controller
  // is a DOM singleton, no React subscription → safe to import directly).
  await page.evaluate(async () => {
    const mod = await import('/src/lib/guide/guideController.js')
    window.__deeper = []
    mod.startTour(
      [{ id: 'a', route: '/', title: 'Intro step', body: 'b' }],
      { tier: 'quick', navigate: async () => {}, onEvent: () => {}, getPath: () => '/', onGoDeeper: (r) => window.__deeper.push(r) },
    )
  })
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const deeper = popover.locator('.guide-go-deeper')
  await expect(deeper).toBeVisible()

  await deeper.click()
  await expect(popover).toHaveCount(0)                                  // tour torn down
  expect(await page.evaluate(() => window.__deeper)).toEqual(['/'])     // deferred start fired with the route
})

test('in-box ▶: absent on a route with no page guide (never a dead button)', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const mod = await import('/src/lib/guide/guideController.js')
    mod.startTour(
      [{ id: 'a', route: '/study', title: 'Intro step', body: 'b' }],
      { tier: 'quick', navigate: async () => {}, onEvent: () => {}, getPath: () => '/study', onGoDeeper: () => {} },
    )
  })
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover.locator('.guide-go-deeper')).toHaveCount(0)
})

test('in-box ▶: real useGuide wiring re-enters the page guide', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Tour this page/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toContainText(/home base/i)          // page-guide intro
  await expect(popover.locator('.guide-go-deeper')).toBeVisible()

  // Advance off the intro, then use ▶ to drop back into the page guide.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toContainText(/Smart Session/i)
  await popover.locator('.guide-go-deeper').click()
  // Re-entered → back on the intro (proves goDeeper → startPage ran via useGuide).
  await expect(popover).toContainText(/home base/i)
})
