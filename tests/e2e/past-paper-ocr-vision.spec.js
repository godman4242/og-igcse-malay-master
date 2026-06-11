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
function mockGeminiVision(page, { text = 'Nasi lemak sangat sedap.', status = 200, calls, delayMs = 0 } = {}) {
  return page.route('https://generativelanguage.googleapis.com/**', async (r) => {
    const url = r.request().url()
    if (url.includes(':generateContent')) {
      if (calls) calls.n += 1
      if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
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

test.describe('Sharper read — GO WILD', () => {
  test('"Don\'t ask again" persists across a reload (F4)', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page)
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await page.getByText(/Don.t ask again/i).click() // tick the checkbox via its label
    await page.getByRole('button', { name: /^Continue$/ }).click()
    await expect(page.getByTestId('vision-provenance')).toBeVisible({ timeout: 30_000 })

    // Reload (no store wipe) — consent must persist; the next read skips the dialog.
    await page.reload({ waitUntil: 'networkidle' })
    await mockGeminiVision(page)
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await expect(page.getByTestId('vision-consent')).toHaveCount(0)
    await expect(page.getByTestId('vision-provenance')).toBeVisible({ timeout: 30_000 })
  })

  test('"Not now" closes the dialog — NOTHING uploads, free read intact', async ({ page }) => {
    test.setTimeout(120_000)
    const calls = { n: 0 }
    await mockGeminiVision(page, { calls })
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await expect(page.getByTestId('vision-consent')).toBeVisible()
    await page.getByRole('button', { name: /^Not now$/ }).click()
    await expect(page.getByTestId('vision-consent')).toHaveCount(0)
    expect(calls.n).toBe(0)
    await expect(page.getByText(/nasi/i).first()).toBeVisible()
    await expect(sharperBtn(page)).toBeVisible() // still offered, not nagging
  })

  test('provider quota (429) → friendly error, free read NEVER blanked (R3)', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page, { status: 429 })
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await page.getByRole('button', { name: /^Continue$/ }).click()
    await expect(page.getByTestId('vision-error')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('vision-error')).toContainText(/free-tier limit/i)
    await expect(page.getByText(/nasi/i).first()).toBeVisible() // free read kept
    await expect(page.getByTestId('vision-provenance')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('Maximum update depth')
  })

  test('provider returns empty/garbage → graceful error, no crash', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page, { text: '' })
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await page.getByRole('button', { name: /^Continue$/ }).click()
    await expect(page.getByTestId('vision-error')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/nasi/i).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Maximum update depth')
  })

  test('cancel mid-vision-read → back to the free read cleanly', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page, { delayMs: 8_000 })
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await page.getByRole('button', { name: /^Continue$/ }).click()
    // The vision progress screen is honest about the upload…
    await expect(page.getByText(/sharper read from Gemini/i)).toBeVisible()
    await expect(page.getByText(/sent to your AI provider/i)).toBeVisible()
    await page.getByRole('button', { name: /^Cancel$/ }).click()
    // …and cancelling lands back on the untouched free read.
    await expect(page.getByText(/nasi/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('vision-provenance')).toHaveCount(0)
    await expect(page.getByTestId('vision-error')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('Maximum update depth')
  })

  test('offline tap → friendly error, consent NEVER collected (it can\'t run)', async ({ page, context }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page)
    await loadFreeRead(page)
    await context.setOffline(true)
    await sharperBtn(page).click()
    await expect(page.getByTestId('vision-consent')).toHaveCount(0)
    await expect(page.getByTestId('vision-error')).toBeVisible()
    await expect(page.getByTestId('vision-error')).toContainText(/offline/i)
    await context.setOffline(false)
  })

  test('quota auto-switch: OpenRouter 429 → Gemini serves + switch toast (R3)', async ({ page }) => {
    test.setTimeout(120_000)
    // Both vision providers configured; OpenRouter is first in auto-order.
    await page.evaluate(() => {
      localStorage.setItem('igcse-openrouter-key', 'sk-or-test')
      localStorage.setItem('igcse-openrouter-vision-models', JSON.stringify({ ts: Date.now(), ids: ['vl/test-model:free'] }))
    })
    await page.reload({ waitUntil: 'networkidle' })
    await mockGeminiVision(page, { text: 'Nasi lemak sangat sedap.' })
    await page.route('https://openrouter.ai/**', (r) => {
      if (r.request().url().includes('/chat/completions')) {
        return r.fulfill({ status: 429, body: 'rate limited' })
      }
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) })
    })
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await page.getByRole('button', { name: /^Continue$/ }).click()
    // Gemini rescues the read; the global switch toast reports the handover.
    await expect(page.getByTestId('vision-provenance')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/sedap/i).first()).toBeVisible()
    await expect(page.getByTestId('instruct-switch-toast')).toBeVisible()
  })

  test('theme swap after a vision read keeps everything intact (+ eyeball shots)', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeminiVision(page)
    await loadFreeRead(page)
    await sharperBtn(page).click()
    // Eyeball: consent dialog, dark + light (settle the fadeUp before shooting).
    await expect(page.getByTestId('vision-consent')).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'test-results/eyeball-consent-dark.png' })
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await page.waitForTimeout(150)
    await page.screenshot({ path: 'test-results/eyeball-consent-light.png' })
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await page.getByRole('button', { name: /^Continue$/ }).click()
    await expect(page.getByTestId('vision-provenance')).toBeVisible({ timeout: 30_000 })
    // Eyeball: provenance banner + reader, dark + light; text survives the swap.
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'test-results/eyeball-vision-dark.png' })
    await page.evaluate(() => window.__STORE.getState().toggleTheme())
    await page.waitForTimeout(150)
    await page.screenshot({ path: 'test-results/eyeball-vision-light.png' })
    await expect(page.getByText(/sedap/i).first()).toBeVisible()
    await expect(page.getByTestId('vision-provenance')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Maximum update depth')
  })

  test('rapid replace: vision read → new photo → fresh free read (provenance resets)', async ({ page }) => {
    test.setTimeout(180_000)
    await mockGeminiVision(page)
    await loadFreeRead(page)
    await sharperBtn(page).click()
    await page.getByRole('button', { name: /^Continue$/ }).click()
    await expect(page.getByTestId('vision-provenance')).toBeVisible({ timeout: 30_000 })
    // Replace with a new photo → the free on-device path again, banner gone.
    await fileInput(page).setInputFiles(fx('ocr-clean-malay.png'))
    await expect(page.getByText(/nasi/i).first()).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('vision-provenance')).toHaveCount(0)
    await expect(sharperBtn(page)).toBeVisible() // offered afresh for the new read
  })
})
