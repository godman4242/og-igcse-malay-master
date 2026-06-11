// E2E for Claim 6 — the dense-page English-help nudge. On a demonstrably
// too-hard Malay page (≥40% unknown words over ≥20 content words) the reveal-
// gate EASES: a non-punitive, dismissible banner offers to show the English as
// the learner reads (Malay stays primary). Sparse and English docs never nudge.
// Fixtures (dense-malay.pdf / sparse-malay.pdf) are density-verified by
// scripts/gen-fixtures.mjs. Plus a GO WILD pass ([[feedback_go_wild_smoke_test]]).
//
// Run: npx playwright test dense-page-nudge --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

// Deterministic per-word gtx mock so the "accept → reveal" path is offline-stable.
function mockTranslate(page) {
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', async (r) => {
    const word = new URL(r.request().url()).searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${word}`, word, null, null, 10]], null, 'ms']),
    })
  })
}

async function load(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const nudge = (page) => page.getByTestId('dense-page-nudge')

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test.describe('Claim 6 — dense-page nudge', () => {
  test('a dense Malay page shows the non-punitive English-help nudge', async ({ page }) => {
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
    await expect(nudge(page)).toContainText('a lot of new words')
    await expect(nudge(page)).toContainText('still see the Malay first')
    await expect(page.getByTestId('dense-nudge-accept')).toBeVisible()
    await expect(page.getByTestId('dense-nudge-dismiss')).toBeVisible()
  })

  test('a sparse (mostly-known) Malay page shows no nudge', async ({ page }) => {
    await load(page, 'sparse-malay.pdf')
    await expect(page.locator('[data-token-i]').first()).toBeVisible()
    await expect(nudge(page)).toHaveCount(0)
  })

  test('an English document never nudges (reveal would be a no-op)', async ({ page }) => {
    await load(page, 'english-doc.pdf')
    await expect(page.locator('[data-token-i]').first()).toBeVisible()
    await expect(nudge(page)).toHaveCount(0)
  })

  test('"No, I\'ll try first" dismisses for this document and does not nag', async ({ page }) => {
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
    await page.getByTestId('dense-nudge-dismiss').click()
    await expect(nudge(page)).toHaveCount(0)
    // Switching the reading view must not resurrect it.
    await page.getByRole('button', { name: /Layout/i }).click().catch(() => {})
    await expect(nudge(page)).toHaveCount(0)
  })

  test('"Show English as I read" reveals glosses with the Malay still primary', async ({ page }) => {
    mockTranslate(page)
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
    await page.getByTestId('dense-nudge-accept').click()
    // Banner is gone (acted on); show-all is now active → "Hide all" appears once
    // the glosses land.
    await expect(nudge(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Hide all/i })).toBeVisible({ timeout: 15000 })
    // A machine gloss is shown for an unknown word…
    await expect(page.getByText(/^EN-/).first()).toBeVisible()
    // …and the Malay token is still on the page (Malay-first preserved).
    await expect(page.locator('[data-token-i]').first()).toBeVisible()
  })

  test('per-document reset: a fresh sparse doc after a dense one does not nudge', async ({ page }) => {
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
    // Load a different, sparse document — dismissal state resets, but sparse ≠ dense.
    await load(page, 'sparse-malay.pdf')
    await expect(nudge(page)).toHaveCount(0)
    // …and loading a dense doc again re-offers the nudge.
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
  })

  test('GO WILD: spam-dismiss + theme swap keep the nudge dismissed', async ({ page }) => {
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
    const dismiss = page.getByTestId('dense-nudge-dismiss')
    await dismiss.click()
    await expect(nudge(page)).toHaveCount(0)
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await expect(nudge(page)).toHaveCount(0)
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await expect(nudge(page)).toHaveCount(0)
  })
})

test.describe('Claim 6b — beginner auto-help pref', () => {
  test('the Settings toggle persists the preference', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await bindStore(page)
    const toggle = page.getByTestId('auto-help-dense-toggle')
    await expect(toggle).not.toBeChecked() // default OFF
    await toggle.check()
    const on = await page.evaluate(() => window.__STORE.getState().pdfReader.autoHelpDensePages)
    expect(on).toBe(true)
  })

  test('pref ON: a dense page auto-applies the softer mode (no nudge, Malay still first)', async ({ page }) => {
    mockTranslate(page)
    await page.evaluate(() => window.__STORE.getState().setPdfAutoHelpDensePages(true))
    await load(page, 'dense-malay.pdf')
    // No nudge — it auto-applies instead of asking.
    await expect(nudge(page)).toHaveCount(0)
    // Show-all turns on + glosses land → "Hide all" appears.
    await expect(page.getByRole('button', { name: /Hide all/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/^EN-/).first()).toBeVisible()
    // Malay is still primary (the source token is still on the page).
    await expect(page.locator('[data-token-i]').first()).toBeVisible()
  })

  test('pref OFF (default): a dense page asks instead of auto-applying', async ({ page }) => {
    await load(page, 'dense-malay.pdf')
    await expect(nudge(page)).toBeVisible()
    await expect(page.getByRole('button', { name: /Hide all/i })).toHaveCount(0)
  })
})

test.describe('Claim 6 — dense-page nudge light + dark', () => {
  for (const theme of ['dark', 'light']) {
    test(`renders in ${theme}`, async ({ page }) => {
      if (theme === 'light') await page.evaluate(() => window.__STORE.getState().toggleTheme())
      await load(page, 'dense-malay.pdf')
      await expect(nudge(page)).toBeVisible()
      await page.screenshot({ path: `test-results/dense-page-nudge-${theme}.png`, fullPage: true })
    })
  }
})
