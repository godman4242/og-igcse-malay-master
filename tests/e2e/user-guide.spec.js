import { test, expect } from '@playwright/test'

// Interactive in-app guide ("App tour"). Drives the real driver.js popover.
// bindStore + live-`?t=` URL per CLAUDE.md "## E2E tests" (the Vite module trap)
// and [[project_e2e_config_invocation]]; GO WILD per [[feedback_go_wild_smoke_test]].

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

// Most tests don't want the 2s first-run offer popping mid-flow.
async function suppressOffer(page) {
  await page.evaluate(() => window.__STORE.getState().markGuideSeen('quick'))
}

const POPOVER = '.driver-popover'
const NEXT = '.driver-popover-next-btn'
const PREV = '.driver-popover-prev-btn'
const CLOSE = '.driver-popover-close-btn'

// Track only real crashes (uncaught exceptions). Dev-server console noise
// (Vite HMR socket while offline, favicon 404, React dev warnings) is not a
// regression and must not fail a GO-WILD case.
function trackErrors(page) {
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  return errors
}

test.describe('App tour — first-run offer', () => {
  test.beforeEach(async ({ page }) => { await resetState(page) })

  test('appears once for a new user, then never again after dismiss (persists across reload)', async ({ page }) => {
    const offer = page.getByRole('dialog', { name: /take a quick tour/i })
    await expect(offer).toBeVisible({ timeout: 6000 })
    await page.screenshot({ path: 'test-results/guide-offer-dark.png' })
    await page.getByRole('button', { name: /maybe later/i }).click()
    await expect(offer).toBeHidden()
    // Persisted seen flag survives a reload — no nag.
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)
    await page.waitForTimeout(2600)
    await expect(page.getByRole('dialog', { name: /take a quick tour/i })).toHaveCount(0)
  })

  test('"Take the tour" launches the Quick tour', async ({ page }) => {
    await page.getByRole('dialog', { name: /take a quick tour/i }).waitFor({ timeout: 6000 })
    await page.getByRole('button', { name: /take the tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
  })
})

test.describe('App tour — Settings entry', () => {
  test.beforeEach(async ({ page }) => { await resetState(page); await suppressOffer(page) })

  test('"App guide" is the FIRST card in Settings and both buttons start a tour', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    const guide = page.locator('[data-tour="guide-card"]')
    await expect(guide).toBeVisible()
    await expect(guide).toContainText('App guide')
    await page.screenshot({ path: 'test-results/guide-card-settings-dark.png' })

    // It sits above the Stats card (first card).
    const guideBox = await guide.boundingBox()
    const statsBox = await page.locator('h3', { hasText: 'Stats' }).boundingBox()
    expect(guideBox.y).toBeLessThan(statsBox.y)

    // Quick tour starts.
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.locator(CLOSE).click()
    await expect(page.locator(POPOVER)).toHaveCount(0)

    // Full tour starts.
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /full tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
  })
})

test.describe('App tour — Quick walkthrough end-to-end', () => {
  test.beforeEach(async ({ page }) => { await resetState(page); await suppressOffer(page) })

  test('runs across routes to completion, no crash', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    // Step 1 (intro) navigates home.
    await expect(page).toHaveURL(/\/$/)

    let reachedSettings = false
    for (let i = 0; i < 10; i++) {
      if (await page.locator(POPOVER).count() === 0) break
      if (/\/settings$/.test(page.url())) reachedSettings = true
      const next = page.locator(NEXT)
      if (await next.count() === 0) break
      await next.click()
      await page.waitForTimeout(500)
    }
    // The replay step drove us to Settings, and the tour finished cleanly.
    expect(reachedSettings || /\/settings$/.test(page.url())).toBeTruthy()
    await expect(page.locator(POPOVER)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('renders the popover correctly in dark AND light (screenshots)', async ({ page }) => {
    // Dark.
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.locator(NEXT).click() // advance off the intro modal onto a spotlight
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'test-results/guide-quick-dark.png' })
    await page.locator(CLOSE).click()

    // Light — flip theme, then re-run so onPopoverRender re-themes.
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await bindStore(page)
    await page.evaluate(() => { if (window.__STORE.getState().theme !== 'light') window.__STORE.getState().toggleTheme() })
    await page.waitForTimeout(150)
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.locator(NEXT).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'test-results/guide-quick-light.png' })
    await page.locator(CLOSE).click()
  })
})

test.describe('App tour — GO WILD', () => {
  test.beforeEach(async ({ page }) => { await resetState(page); await suppressOffer(page) })

  test('bailing out mid-tour (close button) tears down cleanly; app stays interactive', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.locator(NEXT).click()
    await page.waitForTimeout(300)
    // "Get me out" mid-step.
    await page.locator(CLOSE).click()
    await expect(page.locator(POPOVER)).toHaveCount(0)
    // Overlay is gone and the app is fully interactive again.
    await page.locator('[data-tour="nav-study"]').click()
    await expect(page).toHaveURL(/\/study$/)
    await expect(page.locator('.driver-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('browser back mid-tour tears the tour down (popstate), no crash', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await expect(page).toHaveURL(/\/$/) // tour pushed '/'
    await page.goBack() // back to /settings → popstate → clean teardown
    await expect(page.locator(POPOVER)).toHaveCount(0)
    await expect(page).toHaveURL(/\/settings$/)
    expect(errors).toEqual([])
  })

  test('spamming Next / Prev / Close never crashes or dead-ends', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    for (let i = 0; i < 4; i++) { await page.locator(NEXT).click({ force: true }).catch(() => {}); await page.waitForTimeout(120) }
    for (let i = 0; i < 3; i++) { await page.locator(PREV).click({ force: true }).catch(() => {}); await page.waitForTimeout(120) }
    await page.locator(CLOSE).click({ force: true }).catch(() => {})
    await page.waitForTimeout(200)
    await expect(page.locator(POPOVER)).toHaveCount(0)
    // App still interactive.
    await page.locator('[data-tour="nav-study"]').click({ force: true })
    await expect(page).toHaveURL(/\/study$/)
    expect(errors).toEqual([])
  })

  test('resizing 390 ↔ desktop mid-tour keeps the popover alive', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /full tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.locator(NEXT).click()
    await page.waitForTimeout(400)
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.screenshot({ path: 'test-results/guide-desktop.png' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(200)
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.locator(CLOSE).click()
    expect(errors).toEqual([])
  })

  test('a deliberately-missing anchor is skipped, never dead-ends', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    // Drive the controller directly with a custom 3-step tour whose middle step
    // targets an anchor that does not exist — it must skip to the outro.
    await page.evaluate(async () => {
      const mod = await import('/src/lib/guide/guideController.js')
      mod.startTour(
        [
          { id: 'intro', route: '/', title: 'Intro step', body: 'b' },
          { id: 'missing', route: '/', selector: '[data-tour="does-not-exist-xyz"]', title: 'Missing step', body: 'b' },
          { id: 'outro', route: '/', title: 'Outro step', body: 'b' },
        ],
        { tier: 'quick', navigate: async () => {}, onEvent: () => {}, getPath: () => '/' },
      )
    })
    await expect(page.locator(POPOVER)).toContainText('Intro step')
    await page.locator(NEXT).click()
    // Missing anchor waits out its 3s cap, then skips straight to the outro.
    await expect(page.locator(POPOVER)).toContainText('Outro step', { timeout: 6000 })
    await page.locator(NEXT).click()
    await expect(page.locator(POPOVER)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('Quick then Full back-to-back: starting Full replaces the running Quick', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /full tour/i }).click()
    await page.waitForTimeout(300)
    // Exactly one popover — the Full tour replaced the Quick one.
    await expect(page.locator(POPOVER)).toHaveCount(1)
    await page.locator(CLOSE).click()
    expect(errors).toEqual([])
  })

  test('works offline once the guide chunks are warm (module cache, no refetch)', async ({ page, context }) => {
    const errors = trackErrors(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    // Warm all three lazy chunks (tourSteps + guideController + driver.js) via a
    // no-navigation custom tour, so they're in the page module cache.
    await page.evaluate(async () => {
      await import('/src/lib/guide/tourSteps.js')
      const mod = await import('/src/lib/guide/guideController.js')
      const h = mod.startTour(
        [{ id: 'warm', route: '/settings', title: 'warm', body: 'b' }],
        { tier: 'quick', navigate: async () => {}, onEvent: () => {}, getPath: () => '/settings' },
      )
      await h.ready // imports driver.js
      h.destroy()
    })
    await context.setOffline(true)
    // Real replay offline — every import resolves from the in-memory module map.
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    await page.locator(CLOSE).click()
    await context.setOffline(false)
    expect(errors).toEqual([])
  })
})

test.describe('App tour — reduced motion', () => {
  test('honours prefers-reduced-motion (animation off, still works)', async ({ page }) => {
    const errors = trackErrors(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await resetState(page)
    await suppressOffer(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    // Sanity: the emulated preference actually reaches the page.
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    await page.getByRole('button', { name: /quick tour/i }).click()
    await expect(page.locator(POPOVER)).toBeVisible()
    // driver tags <body> `driver-simple` when animate:false, `driver-fade` when true.
    await expect(page.locator('body.driver-simple')).toHaveCount(1)
    await expect(page.locator('body.driver-fade')).toHaveCount(0)
    await page.locator(CLOSE).click()
    expect(errors).toEqual([])
  })
})
