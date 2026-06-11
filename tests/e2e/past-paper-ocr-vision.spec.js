// E2E for the past-paper OCR Phase 2 BYOK-vision rung ("Sharper read"). The
// free on-device Tesseract path stays the default and byte-identical; with the
// user's OWN Gemini key a consent-gated "Sharper read" re-reads the SAME image
// via their provider and replaces the reader text (still reveal-gated, still
// tap-to-check). The provider is MOCKED (page.route on the Gemini native
// endpoint) — the real accuracy number is the manual harness (Q-VIS, D12).
//
// Cold Tesseract WASM still runs for the free read first → 120 s timeouts,
// same as past-paper-ocr.spec.js.
//
// Run: npx playwright test past-paper-ocr-vision --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)
const fileInput = (page) => page.locator('input[type=file]').first()

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

// Mock the Gemini NATIVE endpoint (the only place a vision read may upload to).
// `reply()` builds the transcription; status overrides simulate quota/etc.
function mockGeminiVision(page, { text = 'Nasi lemak sangat sedap.', status = 200, calls } = {}) {
  return page.route('https://generativelanguage.googleapis.com/**', async (r) => {
    const url = r.request().url()
    if (url.includes(':generateContent')) {
      if (calls) calls.n += 1
      if (status !== 200) {
        return r.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: { message: 'limit' } }) })
      }
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
      })
    }
    // ListModels (model discovery / key verify)
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] }),
    })
  })
}

// Free read first (the default path), then the Sharper-read button is live.
async function loadFreeRead(page) {
  await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i).first()).toBeVisible({ timeout: 90_000 })
}

const sharperBtn = (page) => page.getByTestId('sharper-read')

// The BYOK key must exist BEFORE the app boots (gemini.js reads it at module
// load) — option-f-simplify.spec.js pattern. Models cache pre-seeded so the
// vision call never needs live discovery.
test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.setItem('igcse-gemini-key', 'AIzaTest')
    localStorage.setItem('igcse-gemini-models', JSON.stringify({ ts: Date.now(), ids: ['gemini-3.5-flash'] }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test.describe('Sharper read — happy path + gating', () => {
  test('key → button → consent → vision text replaces the read, tappable (F1, F3, Q-MOCK)', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page, { text: 'Nasi lemak sangat sedap.' })
    await loadFreeRead(page)

    // The button discloses the upload, inline (Fork 4A standing label).
    await expect(sharperBtn(page)).toBeVisible()
    await expect(sharperBtn(page)).toContainText(/uploads to Gemini/i)
    await sharperBtn(page).click()

    // First time → the consent dialog (one-time, honest about the upload).
    await expect(page.getByTestId('vision-consent')).toBeVisible()
    await expect(page.getByTestId('vision-consent')).toContainText(/leaves your device/i)
    await page.getByRole('button', { name: /^Continue$/ }).click()

    // Vision text lands in the SAME reader: provenance banner + tappable tokens.
    await expect(page.getByTestId('vision-provenance')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('vision-provenance')).toContainText(/Sharper read by Gemini/i)
    await expect(page.getByText(/sedap/i).first()).toBeVisible()
    expect(await page.locator('[data-token-i]').count()).toBeGreaterThanOrEqual(3)

    // F3: the Tesseract cues are suppressed for a vision read.
    await expect(page.getByTestId('ocr-blurry-note')).toHaveCount(0)

    // After a sharper read the button retires (re-running = same image, spent quota).
    await expect(sharperBtn(page)).toHaveCount(0)
  })

  test('no key → no Sharper read button, free path identical (N1, F2)', async ({ page }) => {
    test.setTimeout(120_000)
    // Strip the BYOK key set in beforeEach; keyless users never see the rung.
    await page.evaluate(() => {
      localStorage.removeItem('igcse-gemini-key')
      localStorage.removeItem('igcse-gemini-models')
    })
    await page.reload({ waitUntil: 'networkidle' })
    await loadFreeRead(page)
    await expect(sharperBtn(page)).toHaveCount(0)
    await expect(page.getByTestId('vision-provenance')).toHaveCount(0)
  })

  test('free read posts NO image bytes anywhere (N4 privacy)', async ({ page }) => {
    test.setTimeout(120_000)
    const posts = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && !req.url().includes('localhost')) posts.push(req.url())
    })
    await loadFreeRead(page)
    expect(posts.filter((u) => u.includes('generativelanguage') || u.includes('openrouter'))).toEqual([])
  })
})
