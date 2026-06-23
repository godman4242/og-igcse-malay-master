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

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

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

// Bug-A regression pin (GOAL loop-safe #4): a DOC-LESS source must never render
// the Layout view, which would sit on its "Rendering pages…" loader forever
// (LayoutView has no pdfDoc to canvas-render). Even when the remembered view is
// Layout (pdfReader.layoutView pref = true), loading a text sample lands in the
// reflow reader. The render-time guard (effectiveReaderView) makes Layout
// structurally unreachable without a live doc; this locks the contract end-to-end.
test('doc-less sample stays in Reflow even when the Layout pref is on (Bug A)', async ({ page }) => {
  // Persist the Layout view pref, then reload so `view` initialises to 'layout'.
  await bindStore(page)
  await page.evaluate(() => window.__STORE.getState().setPdfLayoutView(true))
  await page.reload({ waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /Try a sample/i }).click()

  // Reflow tokens render; the Layout loader never appears (no stuck blank view).
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await expect(page.getByText(/Rendering pages/i)).toHaveCount(0)
  await expect(page.getByTestId('reader-reflow')).toBeVisible()
})

test('English material toggle makes Try a sample load the English passage', async ({ page }) => {
  await page.getByRole('button', { name: /^English$/ }).click()
  await page.getByRole('button', { name: /Try a sample/i }).click()

  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  // "Aisha" is unique to the English sample ("The Empty Seat").
  await expect(page.getByText('Aisha', { exact: false }).first()).toBeVisible()
})
