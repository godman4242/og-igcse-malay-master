import { test, expect } from '@playwright/test'

// Regression guard for the 2026-06-11 bundle split (quality-watch #3/#4): the
// Writing + Roleplay route chunks were trimmed under the 70 KB per-route budget
// by lazy-loading on-demand subtrees. This pins that those lazy children still
// RENDER at runtime (the actual risk of the split; chunk *size* is the
// quality-watch's job). See RESUME_HERE Box B + the commit.

test('Roleplay picker renders its scenarios (scenarios.js stays in the picker chunk)', async ({ page }) => {
  await page.goto('/roleplay', { waitUntil: 'networkidle' })
  // A known starter scenario proves SCENARIOS data loaded into the picker chunk
  // even though the session subtree (RoleplaySession) is now lazy.
  await expect(page.getByText('Kapal Terbang').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /AI Practice/i }).first()).toBeVisible()
})

test('Writing exemplar panel lazy-loads (exemplars.js rides ExemplarPanel\'s chunk)', async ({ page }) => {
  await page.goto('/writing', { waitUntil: 'networkidle' })
  const select = page.locator('select').first()
  await expect(select).toBeVisible()
  // Pick a concrete format (English is the default tab) — each carries a band-6
  // exemplar, so choosing one must surface the lazily-loaded ExemplarPanel.
  const values = await select.locator('option').evaluateAll(opts =>
    opts.map(o => o.value).filter(v => v && v !== 'auto' && v !== 'general'))
  expect(values.length).toBeGreaterThan(0)
  await select.selectOption(values[0])
  await expect(page.getByText(/Band-6 exemplar/i)).toBeVisible({ timeout: 5000 })
})
