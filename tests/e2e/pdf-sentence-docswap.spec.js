// E2E regression for a PDFReader content-correctness bug from the 2026-07-03
// adversarial review (🟡 PLAUSIBLE → VERIFIED REAL): an in-flight sentence
// translation for document A attaches its English to document B.
//
// Root cause: sentenceId is POSITIONAL (`page:para:firstToken`, sentenceModel.js),
// so doc A's first sentence and doc B's first sentence share the id "…:0:0".
// `translateDocument` RESOLVES with partial results on abort (it breaks + returns),
// and the sentence-reveal paths wrote setSentenceGloss AFTER the await with NO
// staleness guard (unlike the word/OCR paths, which guard `signal.aborted`). So a
// doc-A translation that lands after the user has swapped to doc B repopulates
// sentenceGloss["…:0:0"] with doc A's English — and doc B's identically-positioned
// (but DIFFERENT) sentence then reveals doc A's translation. Confident-wrong content.
//
// Deterministic repro: GATE doc A's gtx call in-flight (not a sleep), swap to doc B,
// release, then reveal doc B's first sentence and assert it shows DOC B's English,
// never doc A's.
//
// STATUS 2026-07-06: written to spec + verified structurally, but NOT yet run
// green — the local dev/e2e environment currently renders a BLANK app in Playwright
// Chromium (#root stays empty; every store-binding spec fails identically; likely
// Console Ninja's Vite instrumentation). So this is landed as test.fixme: the bug is
// VERIFIED REAL by root-cause tracing (see docs/reviews/2026-07-03), and the fix
// (a document-epoch guard in resetGloss + both sentence paths — capture the epoch at
// translation start, drop the setSentenceGloss write if resetGloss bumped it) is
// ready. TO FINISH: once the app renders under Playwright, apply the epoch guard,
// flip test.fixme → test, and confirm red→green.
//
// Run SOLO: npx playwright test pdf-sentence-docswap --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)

async function loadReflow(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const sentencesToggle = (page) => page.getByRole('button', { name: 'Sentences', exact: true })
const cues = (page) => page.getByRole('button', { name: 'Reveal English for this sentence' })

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  // Suppress the first-run tour offer by SEEDING the persisted store (seenQuick), so
  // this spec has no dependency on the resource-timing __STORE lookup. STORE_VERSION 35.
  await page.evaluate(() => {
    localStorage.setItem('igcse-malay-store', JSON.stringify({
      state: { guide: { seenQuick: true, seenFull: false } },
      version: 35,
    }))
  })
  await page.reload({ waitUntil: 'networkidle' })
})

test.fixme('an in-flight doc-A sentence translation never attaches to doc B', async ({ page }) => {
  // Gate ONLY the first gtx call (doc A's sentence); every later call resolves at once.
  let release
  const gate = new Promise((res) => { release = res })
  let n = 0
  await page.route('**/api/translate', (r) => r.abort()) // proxy → fall through to gtx
  await page.route('**/translate_a/single**', async (r) => {
    n += 1
    if (n === 1) await gate
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })

  // Doc A: reveal its first sentence → gtx call #1 fires and HANGS on the gate.
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await cues(page).first().click()

  // Swap to doc B while doc A's translation is still in flight (resetGloss fires).
  await loadReflow(page, 'dense-malay.pdf')

  // Release doc A's translation and wait for the response to actually deliver, so
  // its (now-guarded) .then runs — deterministic, not a sleep.
  const resp = page.waitForResponse('**/translate_a/single**')
  release()
  await resp
  await page.waitForTimeout(150) // let React flush the guarded state update

  // Reveal doc B's first sentence — it must show DOC B's English, never doc A's.
  await sentencesToggle(page).click()
  await cues(page).first().click()
  await expect(page.getByText(/EN-Perlembagaan/).first()).toBeVisible()
  await expect(page.getByText(/membaca buku/)).toHaveCount(0)
})
