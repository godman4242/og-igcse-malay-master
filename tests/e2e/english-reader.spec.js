// English (0510 ESL) reader paths — the bits that were Malay-only until 2026-06-14.
// These pin the LOAD-BEARING direction: an English learner reading an English doc
// must get the MALAY (L1) translation (en→ms), NOT the ms→en default that would echo
// English back. We assert the real gtx request's sl/tl params, so a regression to the
// default direction (the trap fixed twice this week) fails here.
//
// Run: npx playwright test english-reader --config tests/e2e/playwright.config.js
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

// Capture the source/target language of every gtx translate request.
function captureTranslate(page, reqs) {
  page.route('**/api/translate', (r) => r.abort()) // DeepL/Google proxy → gtx fallback
  page.route('**/translate_a/single**', async (r) => {
    const u = new URL(r.request().url())
    reqs.push({ sl: u.searchParams.get('sl'), tl: u.searchParams.get('tl') })
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`MS-${q}`, q, null, null, 10]], null, 'en']),
    })
  })
}

async function loadReflow(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  // Silence the first-run guide (its bottom dialog intercepts clicks) + lean English.
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
  await page.evaluate(() => window.__STORE.setState({ studyLang: 'en' }))
})

test('Full-translation page reveals MALAY for an English learner (en→ms, not the ms→en default)', async ({ page }) => {
  const reqs = []
  captureTranslate(page, reqs)
  await loadReflow(page, 'english-doc.pdf')
  // The entry is now VISIBLE for an English learner on an English doc (was hidden).
  await page.getByRole('button', { name: 'Full translation' }).click()
  await expect(page.getByRole('button', { name: 'Back to reader' })).toBeVisible()
  // Label flipped to the L1 (Malay) being revealed.
  const reveal = page.getByRole('button', { name: 'Reveal Malay for this paragraph' }).first()
  await expect(reveal).toBeVisible()
  await reveal.click()
  await expect.poll(() => reqs.some((r) => r.sl === 'en' && r.tl === 'ms')).toBe(true)
  // And never the wrong direction.
  expect(reqs.some((r) => r.sl === 'ms' && r.tl === 'en')).toBe(false)
})

test('Sentence reveal fetches MALAY for an English learner (en→ms) — regression for the sentence-reveal increment', async ({ page }) => {
  const reqs = []
  captureTranslate(page, reqs)
  await loadReflow(page, 'english-doc.pdf')
  // Sentences mode is ENABLED for an English learner (disabled for a Malay learner).
  const sentences = page.getByRole('button', { name: 'Sentences', exact: true })
  await expect(sentences).toBeEnabled()
  await sentences.click()
  const cue = page.getByRole('button', { name: 'Reveal Malay for this sentence' }).first()
  await expect(cue).toBeVisible()
  await cue.click()
  await expect.poll(() => reqs.some((r) => r.sl === 'en' && r.tl === 'ms')).toBe(true)
})
