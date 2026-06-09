// E2E for the sentence-level on-demand reveal (reflow only). Read the Malay sentence
// first → tap its ¶ cue → the WHOLE-sentence English slides in under the line. A
// COMPREHENSION aid, secondary to word-level reveal: off by default, reveal-gated,
// "show all sentences" the only bulk opt-in, machine-translated marker always on,
// unknown words route into FSRS, and an English doc is a no-op (Sentences disabled).
//
// GO WILD ([[feedback_go_wild_smoke_test]]): a sentence that WRAPS two lines reveals
// the whole thing (not a fragment); tap-cue never starts a Select v2 selection; spam
// the Sentences toggle; navigate mid-job; offline; theme swap; bottom-panel render.
//
// Run SOLO: npx playwright test sentence-reveal --config tests/e2e/playwright.config.js
// Honours the Vite ?t= module-URL trap: bindStore() imports the SAME useStore URL
// React subscribed to, re-run after every navigation.
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

// gtx mock: q=<sentence text> → "EN-<sentence text>". For a whole sentence the
// reveal text therefore echoes the full source, so we can prove a wrapped sentence
// reveals end-to-end (not a fragment). Counts calls to prove cache resume.
function mockTranslate(page, { delayMs = 0, calls } = {}) {
  page.route('**/api/translate', (r) => r.abort()) // DeepL/Google proxy → fall through to gtx
  page.route('**/translate_a/single**', async (r) => {
    if (calls) calls.n += 1
    if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })
}

async function loadReflow(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const sentencesToggle = (page) => page.getByRole('button', { name: 'Sentences', exact: true })
const cues = (page) => page.getByRole('button', { name: 'Reveal English for this sentence' })
const collapses = (page) => page.getByRole('button', { name: 'Hide English for this sentence' })

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('reveal-gated: cues appear only with Sentence mode on, then tap reveals the English in place', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  // Off by default — no sentence cues, word-level stays primary.
  await expect(cues(page)).toHaveCount(0)
  await sentencesToggle(page).click()
  await expect(cues(page).first()).toBeVisible()
  const cueCount = await cues(page).count()
  expect(cueCount).toBeGreaterThanOrEqual(3) // 3 sentences in the fixture
  // Reveal-gated: nothing revealed yet → no collapse controls.
  await expect(collapses(page)).toHaveCount(0)
  await cues(page).first().click()
  await expect(page.getByText(/EN-Saya suka membaca buku/).first()).toBeVisible()
  await expect(collapses(page).first()).toBeVisible() // now collapsible
  // Honesty marker present on the revealed sentence.
  await expect(page.getByText('machine').first()).toBeVisible()
})

test('a sentence that WRAPS two lines reveals the WHOLE sentence, not a fragment', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  // The long middle sentence (2nd) wraps across lines at 390px. Revealing it must
  // surface the full unit: both its start ("Pada suatu hari") and its end ("sungai itu").
  await cues(page).nth(1).click()
  await expect(page.getByText(/EN-Pada suatu hari yang cerah.*sungai itu\./).first()).toBeVisible()
})

test('tapping a sentence cue never starts a Select v2 selection', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await sentencesToggle(page).click()
  await cues(page).first().click()
  // The cue stopPropagation()s → no word landed in the selection bucket.
  await expect(page.getByRole('button', { name: /^Add \d+/ })).toHaveCount(0)
  const selLen = await page.evaluate(() => {
    // selection is component-local; assert via the visible bucket instead of store.
    return document.querySelectorAll('[data-token-i][style*="accent-subtle"]').length
  })
  expect(selLen).toBe(0)
})

test('show all sentences reveals every sentence; hide all collapses back to gated', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  const cueCount = await cues(page).count()
  await page.getByRole('button', { name: /Translate sentences/ }).click()
  await page.getByRole('button', { name: 'Show all sentences' }).click()
  await expect(collapses(page)).toHaveCount(cueCount) // every sentence revealed
  await page.getByRole('button', { name: 'Hide all sentences' }).click()
  await expect(collapses(page)).toHaveCount(0)
  await expect(cues(page)).toHaveCount(cueCount) // cues are back (gated)
})

test('re-running sentence translation resumes from cache — no new network calls', async ({ page }) => {
  const calls = { n: 0 }
  mockTranslate(page, { calls })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await page.getByRole('button', { name: /Translate sentences/ }).click()
  await expect.poll(() => calls.n).toBeGreaterThan(0)
  const first = calls.n
  await page.getByRole('button', { name: /Translate sentences/ }).click()
  await page.waitForTimeout(300)
  expect(calls.n).toBe(first) // all sentences cached
})

test('add unknown words from a revealed sentence lands FSRS cards', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  const before = await page.evaluate(() => window.__STORE.getState().cards.length)
  // The long sentence is rich in non-dictionary words → it offers "Add words".
  await cues(page).nth(1).click()
  const addWords = page.getByRole('button', { name: /Add unknown words from this sentence/ })
  await expect(addWords).toBeVisible()
  await addWords.click()
  await expect.poll(() => page.evaluate(() => window.__STORE.getState().cards.length)).toBeGreaterThan(before)
  const deck = await page.evaluate(() => window.__STORE.getState().cards.map((c) => c.t))
  expect(deck).toContain('PDF Import')
})

test('English document is a no-op: the Sentences toggle is disabled with a reason', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'english-doc.pdf')
  const btn = sentencesToggle(page)
  await expect(btn).toBeDisabled()
  await expect(btn).toHaveAttribute('title', /English document/i)
})

test('bottom-panel render pref routes the revealed English into the fixed panel', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await page.evaluate(() => window.__STORE.getState().setPdfSentenceRender('sheet'))
  await sentencesToggle(page).click()
  await cues(page).first().click()
  // No inline block; the panel below shows it.
  await expect(page.getByText(/Sentence translations/).first()).toBeVisible()
  await expect(page.getByText(/EN-Saya suka membaca buku/).first()).toBeVisible()
})

test('offline degrades gracefully — reveal shows a pending state, no crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', (r) => r.abort()) // simulate offline
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await cues(page).first().click()
  await page.waitForTimeout(400)
  // The sentence is still "revealed" (collapsible) but no English arrived — no crash.
  await expect(collapses(page).first()).toBeVisible()
  await expect(sentencesToggle(page)).toBeEnabled()
  expect(errors).toHaveLength(0)
})

test('switching to Layout hides the reflow-only Sentence controls (v1 scope)', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await expect(sentencesToggle(page)).toBeVisible()
  await page.getByRole('button', { name: 'Layout' }).click()
  await expect(sentencesToggle(page)).toHaveCount(0)
})

test('GO WILD: spam the Sentences toggle + theme swap; light & dark screenshots', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  // Spam on/off — must not crash or leak state.
  for (let n = 0; n < 6; n++) {
    await sentencesToggle(page).click()
    await sentencesToggle(page).click()
  }
  await sentencesToggle(page).click()
  await cues(page).nth(1).click()
  await page.getByRole('button', { name: 'Show all sentences' }).click()
  await expect(collapses(page).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/sentence-reveal/dark.png', fullPage: true })
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(collapses(page).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/sentence-reveal/light.png', fullPage: true })
  expect(errors).toHaveLength(0)
})

test('GO WILD: navigating away mid sentence-job does not crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page, { delayMs: 120 })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await page.getByRole('button', { name: /Translate sentences/ }).click()
  await page.getByRole('button', { name: 'Show all sentences' }).click()
  // Leave while the job is in flight (the runner aborts on unmount).
  await page.goto('/study', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toBeVisible()
  await page.waitForTimeout(200)
  expect(errors).toHaveLength(0)
})
