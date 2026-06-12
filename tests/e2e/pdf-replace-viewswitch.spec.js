// E2E for two PDFReader correctness fixes (docs/reviews/2026-06-12, P2):
//  C7 — "Replace" with a corrupt file must NOT destroy the open document, and
//       the failure must be visible while the document is still on screen.
//  C8 — selection / reveal state is keyed by token index, but Reflow and Layout
//       have DIFFERENT index spaces — a view switch must re-gate both (clear-on-
//       switch; the word-keyed docGloss cache survives, so re-revealing is one tap).
//
// Run solo:
//   npx playwright test pdf-replace-viewswitch --config tests/e2e/playwright.config.js
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

// Free gtx endpoint mocked so translations are instant + deterministic (EN-<word>).
function mockTranslate(page) {
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', async (r) => {
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })
}

async function loadReflow(page, fixture = 'sample-malay.pdf') {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  // Suppress the first-run tour offer — its fixed-bottom dialog steals focus/clicks.
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
})

test('C7 — corrupt Replace keeps the open document and shows an error banner', async ({ page }) => {
  await loadReflow(page)
  const tokensBefore = await page.locator('[data-token-i]').count()

  await page.locator('input[type=file]').first().setInputFiles(fx('corrupt.pdf'))

  // The failure is visible OVER the still-open document…
  await expect(page.getByTestId('pdf-error-banner')).toBeVisible()
  // …the reflow text is untouched…
  expect(await page.locator('[data-token-i]').count()).toBe(tokensBefore)
  // …and the live pdf.js doc was NOT destroyed: Layout view still renders its
  // token overlay (a destroyed worker doc can't serve getTextContent).
  await page.getByRole('button', { name: 'Layout' }).click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
})

test('C8 — reveals and selection are re-gated on a Reflow⇄Layout round-trip', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)

  // Reveal one gloss in reflow (Translate page → tap the first reveal cue).
  await page.getByRole('button', { name: /Translate page/ }).click()
  const reveal = page.getByRole('button', { name: /^Reveal meaning of/ }).first()
  await expect(reveal).toBeVisible()
  await reveal.click()
  await expect(page.getByText(/^EN-/).first()).toBeVisible()

  // And put one word in the Select-mode bucket (keyboard path, no pointer).
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.locator('[data-token-i][tabindex="0"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /^Add \d+$/ })).toBeVisible()

  // Round-trip the view. Indices mean different words in the other space, so
  // both reveal + selection must come back cleared (re-gated, not remapped).
  await page.getByRole('button', { name: 'Layout' }).click()
  await page.getByRole('button', { name: 'Reflow' }).click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await expect(page.getByText(/^EN-/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Add \d+$/ })).toHaveCount(0)
})
