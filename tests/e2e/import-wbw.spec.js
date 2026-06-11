import { test, expect } from '@playwright/test'

// Issue 1 — Import "Word-by-Word" chip grid. Replaces the old inline text wall
// with a scannable grid of chips (word + gloss + source dot). Dictionary words
// resolve with no network, so this drives the feature offline. Also smoke-tests
// the separate Process → select → add-to-deck flow to confirm the redesign
// didn't regress the rest of the page.
// See docs/superpowers/specs/2026-06-11-website-fixes-triage-design.md (Issue 1).

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
}

test.describe('Issue 1 — Import Word-by-Word chip grid', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
    await page.goto('/import', { waitUntil: 'networkidle' })
  })

  test('renders one chip per translatable word and drops punctuation tokens', async ({ page }) => {
    // "!" is a standalone punctuation token → 'skip' → dropped. The other three
    // are dictionary words → chips.
    await page.locator('textarea').first().fill('Saya makan nasi !')
    await page.getByRole('button', { name: /Word-by-Word Translation/i }).click()

    const chips = page.locator('[data-testid="wbw-chip"]')
    await expect(chips).toHaveCount(3)
    await expect(chips.first()).toContainText('Saya')
    // Glosses come from the bundled dictionary (no network).
    await expect(page.locator('[data-testid="wbw-chip"]', { hasText: 'makan' })).toContainText(/eat/i)
    // The "N words" summary counts kept chips only (skip excluded).
    await expect(page.getByText(/^3 words$/)).toBeVisible()
    // Legend preserved.
    await expect(page.getByText('● Dictionary')).toBeVisible()
  })

  test('add-to-deck flow still works after the redesign', async ({ page }) => {
    await page.locator('textarea').first().fill('Saya makan nasi')
    await page.getByRole('button', { name: /^Process$/i }).click()
    // Word buttons appear; select one.
    await page.getByRole('button', { name: 'makan', exact: true }).click()
    // The add button reflects the selection and creating cards yields an Undo toast.
    await page.getByRole('button', { name: /Add 1 cards/i }).click()
    await expect(page.getByRole('button', { name: /Undo — remove 1 cards/i })).toBeVisible()
  })
})
