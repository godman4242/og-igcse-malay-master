// E2E for the PDF reader's first-visit "Try a sample" affordance (Phase 3c T9,
// increment 1). A blank-page student taps "Try a sample" and the built-in
// reveal-gated passage loads into the reflow reader — WITHOUT importing a file.
// This is the load-bearing prerequisite for the per-page deep-dive guide:
// the Select/Translate/Reflow controls (the guide's arrow targets) only mount
// once a document is loaded, and the sample is how a new user gets there.
//
// Run solo:
//   npx playwright test reading-sample --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
})

test('Try a sample loads the reveal-gated reflow reader from empty state', async ({ page }) => {
  // Empty state: the CTA is present, no document tokens yet.
  const cta = page.getByRole('button', { name: /Try a sample/i })
  await expect(cta).toBeVisible()
  await expect(page.locator('[data-token-i]')).toHaveCount(0)

  await cta.click()

  // The reflow reader now renders tokenized Malay text (the default sample).
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  // "penduduk" is a clean single token unique to the Malay sample.
  await expect(page.getByText('penduduk', { exact: false }).first()).toBeVisible()

  // The loaded-state controls the deep-dive guide will point arrows at are now
  // mounted (they did NOT exist in the empty state).
  await expect(page.getByRole('button', { name: /^Select$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Translate$/ })).toBeVisible()
})

test('English material toggle makes Try a sample load the English passage', async ({ page }) => {
  await page.getByRole('button', { name: /^English$/ }).click()
  await page.getByRole('button', { name: /Try a sample/i }).click()

  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  // "Aisha" is unique to the English sample ("The Empty Seat").
  await expect(page.getByText('Aisha', { exact: false }).first()).toBeVisible()
})
