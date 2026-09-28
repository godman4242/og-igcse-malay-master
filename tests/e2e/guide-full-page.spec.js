import { test, expect } from '@playwright/test'

// The header ▶ "Tour this page" deep dive on the Dashboard + the in-box ▶ that
// drops from the Quick/Full tour into it. Per-route step content is covered,
// data-driven, by guide-page-tours.spec.js.

// A page tour's first step is a centred intro (nothing lit); Next lands on the
// first control, which is highlighted on the real page (the old SVG arrow was
// replaced by a ring drawn on the control itself — Kheshav 2026-09-28).
const LIT = '.driver-active-element:not(#driver-dummy-element)'

test('full page guide: ▶ on Dashboard lights up a control, and a backdrop click keeps the box', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(page.locator(LIT)).toHaveCount(0)            // centred intro

  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator(LIT)).toHaveCount(1)            // a real control is lit

  await page.mouse.click(5, 5)                              // dark area: never hides/closes
  await expect(popover).toBeVisible()
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(0)
})

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
  // Every real app route now has a page guide (Phase 3c complete at T25), so the
  // "no page guide" fixture is a synthetic non-route that will never get one.
  await page.evaluate(async () => {
    const mod = await import('/src/lib/guide/guideController.js')
    mod.startTour(
      [{ id: 'a', route: '/nope', title: 'Intro step', body: 'b' }],
      { tier: 'quick', navigate: async () => {}, onEvent: () => {}, getPath: () => '/nope', onGoDeeper: () => {} },
    )
  })
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover.locator('.guide-go-deeper')).toHaveCount(0)
})

// The in-box ▶ lives in the quick/full tours (it would only restart a page tour,
// so it's hidden there). Real useGuide wiring: Quick tour → ▶ → the page guide.
test('in-box ▶: real useGuide wiring drops from the Quick tour into the page guide', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()
  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toContainText(/Welcome/i)            // Quick tour intro on '/'
  await expect(popover.locator('.guide-go-deeper')).toBeVisible()

  await popover.locator('.guide-go-deeper').click()
  await expect(popover).toContainText(/Your home page/i)     // page-guide intro
  await expect(popover.locator('.guide-go-deeper')).toHaveCount(0)
})
