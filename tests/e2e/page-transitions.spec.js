import { test, expect } from '@playwright/test'

// Ported from /tmp/igcse-verify/drive2.mjs (2026-05-27 verify session).
// Covers Phase 4 of the Zero-Waste Cognitive Engine plan: a CSS-only route
// transition driven by a key={location.pathname} wrapper inside <Suspense>.

test.describe('Phase 4 — route transition wrapper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      localStorage.removeItem('igcse-malay-store')
      localStorage.removeItem('igcse-malay-telemetry')
    })
    await page.reload({ waitUntil: 'networkidle' })
  })

  test('.page-transition wrapper renders with the fadeUp keyframe', async ({ page }) => {
    const transition = await page.evaluate(() => {
      const el = document.querySelector('.page-transition')
      if (!el) return null
      const cs = getComputedStyle(el)
      return { name: cs.animationName, duration: cs.animationDuration }
    })
    expect(transition).not.toBeNull()
    expect(transition.name).toBe('fadeUp')
    // Source CSS uses 0.22s; browsers may serialise as 0.22s or 220ms.
    expect(transition.duration).toMatch(/^(0?\.22s|220ms)$/)
  })

  test('re-mounts on navigation across both cold and warm lazy chunks', async ({ page }) => {
    // Cold lazy chunk
    await page.goto('/study', { waitUntil: 'networkidle' })
    await expect(page.locator('.page-transition').first()).toBeVisible()

    // Different cold lazy chunk
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    await expect(page.locator('.page-transition').first()).toBeVisible()

    // Warm chunk — chunk cached, wrapper still re-mounts via key
    await page.goto('/study', { waitUntil: 'networkidle' })
    const name = await page.evaluate(() => {
      const el = document.querySelector('.page-transition')
      return el ? getComputedStyle(el).animationName : null
    })
    expect(name).toBe('fadeUp')
  })

  test('prefers-reduced-motion kills the animation', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    const page = await ctx.newPage()
    try {
      await page.goto('/', { waitUntil: 'networkidle' })
      const name = await page.evaluate(() => {
        const el = document.querySelector('.page-transition')
        return el ? getComputedStyle(el).animationName : null
      })
      expect(name).toBe('none')
    } finally {
      await ctx.close()
    }
  })
})
