// E2E for past-paper photo study (Phase 1, free on-device OCR). A photographed
// printed page (image, or an image-only/scanned PDF) feeds the SAME reveal-gated
// reader as a digital PDF — gloss → FSRS core untouched. OCR is a draft the
// learner verifies (low-confidence cue + non-punitive blurry note). Plus a GO
// WILD pass ([[feedback_go_wild_smoke_test]]).
//
// Fixtures (ocr-clean-malay.png / ocr-blurry-malay.png / scanned-malay.pdf /
// ocr-ground-truth.json) are generated + OCR-validated by scripts/gen-ocr-fixtures.mjs
// (clean: 100% word accuracy; blurry: mean confidence ≈21, well under the 70 gate).
//
// OCR runs real Tesseract WASM in the browser — cold runs load ~3.4 MB of core +
// the language model, so these tests raise the per-test timeout to 120 s.
//
// Run: npx playwright test past-paper-ocr --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)
const groundTruth = JSON.parse(readFileSync(fx('ocr-ground-truth.json'), 'utf8'))

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

const fileInput = (page) => page.locator('input[type=file]').first()

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test.describe('Past-paper OCR — happy path + detection', () => {
  test('photo of printed Malay → readable, tappable text (F1, Q-ACC)', async ({ page }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    // Progress UI appears (web-worker OCR; UI stays responsive)…
    await expect(page.getByText(/Reading your page/i)).toBeVisible()
    // …then resolves into reader text with the expected content word tappable.
    await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 90_000 })

    // Q-ACC: ≥90% of ground-truth content words present in the rendered reflow.
    const rendered = (await page.getByTestId('reader-reflow').innerText()).toLowerCase()
    const words = groundTruth.text.toLowerCase().replace(/[.,]/g, '').split(/\s+/)
    const hit = words.filter((w) => rendered.includes(w)).length
    expect(hit / words.length).toBeGreaterThanOrEqual(0.9)

    // The OCR text feeds the SAME reader: tokens carry data-token-i, so the
    // selection / reveal-gated gloss / FSRS-add path engages with no OCR-specific
    // code (F1 — core untouched; the add path itself is covered by select-to-card).
    await expect(page.locator('[data-token-i]').first()).toBeVisible()
    expect(await page.locator('[data-token-i]').count()).toBeGreaterThanOrEqual(10)
  })

  test('image-only / scanned PDF is detected and offers OCR (F2)', async ({ page }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('scanned-malay.pdf'))
    await expect(page.getByTestId('pdf-ocr-offer')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/no selectable text/i)).toBeVisible()
    await page.getByTestId('pdf-ocr-accept').click()
    await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 90_000 })
  })

  test('blurry photo surfaces the non-punitive low-confidence note (Q-CONF)', async ({ page }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('ocr-blurry-malay.png'))
    await expect(page.getByTestId('ocr-blurry-note')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('ocr-blurry-note')).toContainText(/blurry/i)
  })

  test('image source hides the Layout toggle (reflow only)', async ({ page }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 90_000 })
    await expect(page.getByRole('button', { name: /^Layout$/ })).toHaveCount(0)
  })
})

test.describe('Past-paper OCR — GO WILD', () => {
  test('cancel mid-OCR returns to the upload card cleanly', async ({ page }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    await page.getByRole('button', { name: /^Cancel$/ }).click()
    await expect(page.getByText(/Drop a PDF or photo/i)).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Maximum update depth')
  })

  test('a non-image, non-pdf file errors gracefully (no crash)', async ({ page }) => {
    await fileInput(page).setInputFiles(fx('ocr-ground-truth.json'))
    // accept filter blocks this in real UI; forced here it must error, not white-screen.
    await expect(page.locator('body')).not.toContainText('Maximum update depth')
    await expect(page.getByText(/Drop a PDF or photo/i)).toBeVisible()
  })

  test('language toggle persists (Malay default; English selectable)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Malay$/ })).toBeVisible()
    await page.getByRole('button', { name: /^English$/ }).click()
    const lang = await page.evaluate(() => window.__STORE.getState().pdfReader.ocrLang)
    expect(lang).toBe('en')
  })

  test('theme swap after a read keeps the reader intact (light + dark)', async ({ page }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 90_000 })
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await expect(page.getByText(/nasi/i)).toBeVisible()
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await expect(page.getByText(/nasi/i)).toBeVisible()
  })

  // N5 (in-session): a second run while OFFLINE reuses the in-memory Tesseract
  // worker + IndexedDB-cached language model — no network. The cold-reload-offline
  // path (SW-cached /ocr assets) is prod-only (the PWA SW is disabled in dev), so
  // it's verified by the build config + a manual prod check, not here.
  test('a second OCR run works offline in-session (N5 worker reuse)', async ({ page, context }) => {
    test.setTimeout(120_000)
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 90_000 })
    await context.setOffline(true)
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    await expect(page.getByText(/Reading your page/i)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 90_000 })
    await context.setOffline(false)
  })
})
