import { test, expect } from '@playwright/test'

// Phase 1 (correctness) of the guide popover redesign — spec
// docs/superpowers/specs/2026-06-30-guide-popover-redesign.md. Pins two grounded
// defects the research surfaced:
//   G3 — the primary "Next" button hardcoded color:#fff on the rose accent
//        (#ff4d6d) → ~2.3:1 in dark mode (FAILS WCAG 1.4.3 4.5:1) and violates the
//        CLAUDE.md P2-U1 rule. Fix = var(--color-on-bright) (= #000 in dark → ~6.4:1),
//        which also requires --color-on-bright in the useGuide THEME_VARS injection
//        (the popover mounts under <body>, outside .light).
//   G4 — the floating footer buttons were min-height:32px, below the repo's ≥44px
//        target (WCAG 2.5.5) enforced everywhere else.
// Tests run dark-theme (the app default on a fresh store), so on-bright = #000.

test('guide popover primary button is on-bright not #fff (G3) + footer ≥44px (G4)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  const next = popover.locator('.driver-popover-next-btn')
  await expect(next).toBeVisible()

  // G3 — must be on-bright (#000 in dark), NOT white-on-accent.
  const color = await next.evaluate((el) => getComputedStyle(el).color)
  expect(color, 'Next button text must be on-bright (rgb(0,0,0) in dark), not #fff').toBe('rgb(0, 0, 0)')

  // G4 — floating footer button meets the 44px target.
  const height = await next.evaluate((el) => el.getBoundingClientRect().height)
  expect(height, 'floating footer button height ≥44px').toBeGreaterThanOrEqual(44)
})
