// E2E for Option F — the L2 "Ladder": with the learner's OWN instruct key (BYOK),
// tapping a sentence reveals SIMPLER MALAY first (an optional involvement-load aid for
// intermediate+, NOT a beginner vocab win — see [[project_sentence_reveal_research]]),
// with a "Show English" control beneath. No key → the rung is hidden and the
// shipped English reveal behaves exactly as before (no paywall, graceful degrade).
// Spec: docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md
//
// GO WILD ([[feedback_go_wild_smoke_test]]): model returns English/echo/empty/HTTP
// error → degrade to English; cancel mid-fetch; re-reveal cached (1 instruct call);
// spam Show/Hide English; "show all" stays bulk-gtx (zero instruct calls); offline;
// EN doc disabled; sheet pref keeps simpler Malay inline; theme swap + screenshots.
//
// Run SOLO: npx playwright test option-f-simplify --config tests/e2e/playwright.config.js
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

// gtx mock (the English rung / degrade target): q=<text> → "EN-<text>".
function mockTranslate(page, { calls } = {}) {
  page.route('**/api/translate', (r) => r.abort()) // proxy → fall through to gtx
  page.route('**/translate_a/single**', async (r) => {
    if (calls) calls.n += 1
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })
}

// OpenRouter instruct mock. `reply(sentence)` builds the model output; special
// returns: REPLY_ABORT aborts the request (network failure), REPLY_500 fulfils
// with HTTP 500. Counts completions calls to prove caching / zero-bulk-simplify.
const REPLY_ABORT = Symbol('abort')
const REPLY_500 = Symbol('http500')
function mockInstruct(page, { reply, calls, delayMs = 0 } = {}) {
  page.route('https://openrouter.ai/**', async (r) => {
    const url = r.request().url()
    if (url.includes('/api/v1/models')) {
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'test/instruct-model', pricing: { prompt: '0', completion: '0' }, context_length: 8192 }] }),
      })
    }
    if (url.includes('/api/v1/chat/completions')) {
      if (calls) calls.n += 1
      if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
      const body = JSON.parse(r.request().postData() || '{}')
      const sentence = (body.messages || []).find((m) => m.role === 'user')?.content || ''
      const out = reply ? reply(sentence) : `Ayat mudah ini ialah ${sentence}`
      if (out === REPLY_ABORT) return r.abort()
      if (out === REPLY_500) return r.fulfill({ status: 500, body: 'rate limited' })
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: out } }] }),
      })
    }
    return r.abort()
  })
}

async function loadReflow(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const sentencesToggle = (page) => page.getByRole('button', { name: 'Sentences', exact: true })
// Ladder ON: the cue is honest about what it reveals (help, not English).
const ladderCues = (page) => page.getByRole('button', { name: 'Get help with this sentence' })
const englishCues = (page) => page.getByRole('button', { name: 'Reveal English for this sentence' })
const ladderCollapses = (page) => page.getByRole('button', { name: 'Hide the help for this sentence' })
const showEnglishBtn = (page) => page.getByRole('button', { name: 'Show the English translation' })
const hideEnglishBtn = (page) => page.getByRole('button', { name: 'Hide the English translation' })
const SIMPLIFIED_MARKER = /Simpler Malay — optional aid, not the exam wording/
// First fixture sentence + its mocked rungs.
const S1_MALAY = /Ayat mudah ini ialah Saya suka membaca buku/
const S1_ENGLISH = /EN-Saya suka membaca buku/

// Sets the BYOK key BEFORE the app boots (openrouter.js reads it at module load),
// so hasInstructProvider() is true from the first render.
test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.setItem('igcse-openrouter-key', 'sk-or-test-ladder')
    // Pre-seed the free-models cache so callOpenRouter never needs the live list.
    localStorage.setItem('igcse-openrouter-models', JSON.stringify({ ts: Date.now(), ids: ['test/instruct-model'] }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('ladder: tap reveals SIMPLER MALAY first — honest marker, no English anywhere', async ({ page }) => {
  const gtx = { n: 0 }
  mockTranslate(page, { calls: gtx })
  mockInstruct(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  // With a provider the cue announces help, not English.
  await expect(ladderCues(page).first()).toBeVisible()
  await expect(englishCues(page)).toHaveCount(0)
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await expect(page.getByText(SIMPLIFIED_MARKER).first()).toBeVisible()
  // The simpler-Malay rung does NOT leak English: no gtx fetch, no EN text.
  await expect(page.getByText(S1_ENGLISH)).toHaveCount(0)
  expect(gtx.n).toBe(0)
})

test('ladder: "Show English" escalates beneath the Malay; "Hide English" collapses only that rung', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await showEnglishBtn(page).first().click()
  // Both rungs visible: simpler Malay stays, English nests beneath with its marker.
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await expect(page.getByText('machine').first()).toBeVisible()
  await hideEnglishBtn(page).first().click()
  await expect(page.getByText(S1_ENGLISH)).toHaveCount(0)
  await expect(page.getByText(S1_MALAY).first()).toBeVisible() // Malay rung survives
})

test('no provider: the rung is hidden and the shipped English reveal is unchanged (no paywall)', async ({ page }) => {
  const instruct = { n: 0 }
  mockTranslate(page)
  mockInstruct(page, { calls: instruct })
  await page.evaluate(() => localStorage.removeItem('igcse-openrouter-key'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await expect(englishCues(page).first()).toBeVisible()
  await expect(ladderCues(page)).toHaveCount(0)
  await englishCues(page).first().click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  await expect(page.getByText(SIMPLIFIED_MARKER)).toHaveCount(0)
  expect(instruct.n).toBe(0) // never calls an instruct model without a user key
})

test('degrade: model answers in ENGLISH → honest notice + the English reveal', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page, { reply: () => 'The boy is reading a book and he likes it.' })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(/simplify — showing English/).first()).toBeVisible()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  await expect(page.getByText(SIMPLIFIED_MARKER)).toHaveCount(0)
})

test('degrade: model ECHOES the sentence → English fallback (echo is not "simpler")', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page, { reply: (s) => s })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  await expect(page.getByText(SIMPLIFIED_MARKER)).toHaveCount(0)
})

test('degrade: model returns EMPTY → English fallback', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page, { reply: () => '' })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
})

test('degrade: instruct HTTP 500 → English fallback, no crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page)
  mockInstruct(page, { reply: () => REPLY_500 })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('re-reveal is cached: ONE instruct call per sentence per document', async ({ page }) => {
  const instruct = { n: 0 }
  mockTranslate(page)
  mockInstruct(page, { calls: instruct })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await ladderCollapses(page).first().click()
  await expect(page.getByText(S1_MALAY)).toHaveCount(0)
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible() // instant, from cache
  expect(instruct.n).toBe(1)
})

test('collapse resets the ladder: re-reveal starts at simpler Malay, not pre-escalated English', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await showEnglishBtn(page).first().click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  await ladderCollapses(page).first().click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await expect(page.getByText(S1_ENGLISH)).toHaveCount(0) // rung 2 starts closed again
})

test('"show all sentences" stays bulk gtx ENGLISH — zero instruct calls (F6)', async ({ page }) => {
  const instruct = { n: 0 }
  mockTranslate(page)
  mockInstruct(page, { calls: instruct })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await page.getByRole('button', { name: /Translate sentences/ }).click()
  await page.getByRole('button', { name: 'Show all sentences' }).click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  await page.waitForTimeout(250)
  expect(instruct.n).toBe(0) // bulk path never hammers the user's instruct key
})

test('add unknown words still lands FSRS cards from the ladder block', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  const before = await page.evaluate(() => window.__STORE.getState().cards.length)
  await ladderCues(page).nth(1).click() // the long sentence has non-dictionary words
  const addWords = page.getByRole('button', { name: /Add unknown words from this sentence/ })
  await expect(addWords).toBeVisible()
  await addWords.click()
  await expect.poll(() => page.evaluate(() => window.__STORE.getState().cards.length)).toBeGreaterThan(before)
})

test('sheet pref (F7): simpler Malay stays INLINE; escalated English goes to the panel', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await page.evaluate(() => window.__STORE.getState().setPdfSentenceRender('sheet'))
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible() // inline despite sheet pref
  await expect(page.getByText(/Sentence translations/)).toHaveCount(0) // panel empty so far
  await showEnglishBtn(page).first().click()
  await expect(page.getByText(/Sentence translations/).first()).toBeVisible()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
})

test('English document: Sentences stays disabled — simplify never runs on EN docs (F8)', async ({ page }) => {
  mockTranslate(page)
  mockInstruct(page)
  await loadReflow(page, 'english-doc.pdf')
  await expect(sentencesToggle(page)).toBeDisabled()
})

test('GO WILD: cancel mid-simplify by navigating away — unmount aborts, no crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page)
  mockInstruct(page, { delayMs: 400 })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click() // simplify in flight…
  // CLIENT-SIDE navigation (bottom nav), not page.goto — this unmounts PDFReader
  // inside the living document, so the cleanup effect's abort actually runs.
  await page.locator('nav').getByRole('button', { name: 'Study', exact: true }).click()
  await expect(page).toHaveURL(/\/study/)
  await page.waitForTimeout(600) // outlive the in-flight (aborted) simplify
  expect(errors).toHaveLength(0)
})

test('GO WILD: offline (gtx AND instruct dead) — block still revealed, no crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', (r) => r.abort())
  mockInstruct(page, { reply: () => REPLY_ABORT })
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await page.waitForTimeout(400)
  // Degraded twice over (no simplify, no English) — still collapsible, app alive.
  await expect(ladderCollapses(page).first()).toBeVisible()
  await expect(sentencesToggle(page)).toBeEnabled()
  expect(errors).toHaveLength(0)
})

test('GO WILD: spam Show/Hide English + Sentences toggle + theme swap; light & dark shots', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page)
  mockInstruct(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await sentencesToggle(page).click()
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  for (let n = 0; n < 5; n++) {
    await showEnglishBtn(page).first().click()
    await hideEnglishBtn(page).first().click()
  }
  await showEnglishBtn(page).first().click()
  await expect(page.getByText(S1_ENGLISH).first()).toBeVisible()
  // Spam the mode toggle (collapses everything) then re-reveal from cache.
  for (let n = 0; n < 4; n++) {
    await sentencesToggle(page).click()
    await sentencesToggle(page).click()
  }
  await ladderCues(page).first().click()
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await showEnglishBtn(page).first().click()
  await page.screenshot({ path: 'test-results/option-f/dark.png', fullPage: true })
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(page.getByText(S1_MALAY).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/option-f/light.png', fullPage: true })
  expect(errors).toHaveLength(0)
})
