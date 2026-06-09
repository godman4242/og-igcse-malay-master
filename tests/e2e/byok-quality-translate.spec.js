// E2E for BYOK "Higher quality" translation (plan 2026-06-08-byok-quality-translation).
// The toggle is shown ONLY to users who supplied their own OpenRouter key; when ON
// it routes the document-translate pipeline through OpenRouter's free instruct
// models, and degrades to free gtx if the quality call fails. Namespace
// no-collision is proven exhaustively in the unit suite (src/lib/__tests__/
// translate.test.js); here we pin the UI-observable behaviour + a GO WILD pass
// ([[feedback_go_wild_smoke_test]]): key present vs absent, quality gloss, quality→gtx
// fallback, numbered-list per-word fallback, offline, theme swap.
//
// Run SOLO: npx playwright test byok-quality-translate --config tests/e2e/playwright.config.js
//
// Honours the Vite ?t= trap (bindStore re-imports the SAME useStore URL React uses).
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)
const USER_KEY = 'sk-or-e2e-quality-key'

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

// Free gtx fallback: q=<word> → "EN-<word>". DeepL/Google proxy always fails.
function mockGtx(page, { calls } = {}) {
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', async (r) => {
    if (calls) calls.gtx += 1
    const u = new URL(r.request().url())
    const word = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${word}`, word, null, null, 10]], null, 'ms']),
    })
  })
}

// Pull the numbered Malay words out of a batch prompt; [] for a per-word prompt.
function numberedWords(content) {
  const out = []
  for (const line of String(content).split('\n')) {
    const m = line.match(/^\s*\d+\.\s*(.+?)\s*$/)
    if (m) out.push(m[1])
  }
  return out
}
function lastWord(content) {
  const lines = String(content).split('\n').map((l) => l.trim()).filter(Boolean)
  return lines[lines.length - 1] || ''
}

// OpenRouter mock. modes:
//  'list'     — echo a matching numbered list "i. Q-<word>" (no fallback needed)
//  'mismatch' — return ONE gloss for the batch (forces per-word), per-word → Q-<word>
//  'fail'     — 500 on every completion (→ provider throws → router degrades to gtx)
function mockOpenRouter(page, { mode = 'list', calls } = {}) {
  page.route('**/api/v1/models**', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 'e2e/quality-model:free', pricing: { prompt: '0', completion: '0' }, context_length: 8000 }] }),
  }))
  page.route('**/api/v1/chat/completions', async (r) => {
    if (calls) calls.or += 1
    if (mode === 'fail') { await r.fulfill({ status: 500, body: 'rate limited' }); return }
    const body = JSON.parse(r.request().postData() || '{}')
    const userMsg = (body.messages || []).find((m) => m.role === 'user')?.content || ''
    const words = numberedWords(userMsg)
    let content
    if (words.length) {
      // Batch prompt.
      content = mode === 'mismatch'
        ? '1. Q-ONLYONE' // deliberately wrong count → caller falls back to per-word
        : words.map((w, i) => `${i + 1}. Q-${w}`).join('\n')
    } else {
      // Per-word prompt (fallback path).
      content = `Q-${lastWord(userMsg)}`
    }
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content } }] }),
    })
  })
}

async function seedKey(page) {
  await page.evaluate((k) => localStorage.setItem('igcse-openrouter-key', k), USER_KEY)
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

async function loadReflow(page, fixture = 'sample-malay.pdf') {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const cues = (page) => page.getByRole('button', { name: /^Reveal meaning of/ })
const toggle = (page) => page.getByTestId('quality-toggle')

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-openrouter-key')
    localStorage.removeItem('igcse-openrouter-models')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('toggle is ABSENT for a user without their own OpenRouter key', async ({ page }) => {
  mockGtx(page)
  await loadReflow(page)
  await expect(page.getByRole('button', { name: /Translate page/ })).toBeVisible()
  await expect(toggle(page)).toHaveCount(0)
})

test('toggle APPEARS once a user key is present', async ({ page }) => {
  await seedKey(page)
  mockGtx(page)
  await loadReflow(page)
  await expect(toggle(page)).toBeVisible()
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
})

test('quality ON routes glosses through OpenRouter (Q- glosses, not gtx EN-)', async ({ page }) => {
  await seedKey(page)
  mockGtx(page)
  mockOpenRouter(page, { mode: 'list' })
  await loadReflow(page)
  await toggle(page).click()
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  const word = (await cues(page).first().getAttribute('aria-label')).replace('Reveal meaning of ', '')
  await cues(page).first().click()
  await expect(page.getByText(`Q-${word}`).first()).toBeVisible()
  await expect(page.getByText(`EN-${word}`)).toHaveCount(0)
})

test('quality degrades to free gtx when OpenRouter fails (never a dead end)', async ({ page }) => {
  await seedKey(page)
  mockGtx(page)
  mockOpenRouter(page, { mode: 'fail' })
  await loadReflow(page)
  await toggle(page).click()
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  const word = (await cues(page).first().getAttribute('aria-label')).replace('Reveal meaning of ', '')
  await cues(page).first().click()
  // Soft-degrade: the gloss is the gtx one, and the app never errored out.
  await expect(page.getByText(`EN-${word}`).first()).toBeVisible()
  await expect(page.getByText(`Q-${word}`)).toHaveCount(0)
})

test('numbered-list count mismatch falls back to per-word calls (still Q- glosses)', async ({ page }) => {
  await seedKey(page)
  const calls = { gtx: 0, or: 0 }
  mockGtx(page, { calls })
  mockOpenRouter(page, { mode: 'mismatch', calls })
  await loadReflow(page)
  await toggle(page).click()
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  const word = (await cues(page).first().getAttribute('aria-label')).replace('Reveal meaning of ', '')
  await cues(page).first().click()
  await expect(page.getByText(`Q-${word}`).first()).toBeVisible()
  // One batch attempt + per-word retries → more than a single completion call,
  // and gtx was never needed (per-word path stayed on OpenRouter).
  expect(calls.or).toBeGreaterThan(1)
  expect(calls.gtx).toBe(0)
})

test('GO WILD: offline with quality ON — no crash, no cue, toolbar stays usable', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  await seedKey(page)
  // Everything offline: gtx, OpenRouter completions AND models all abort.
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', (r) => r.abort())
  page.route('**/api/v1/**', (r) => r.abort())
  await loadReflow(page)
  await toggle(page).click()
  await page.getByRole('button', { name: /Translate page/ }).click()
  await page.waitForTimeout(500)
  await expect(cues(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Translate page/ })).toBeEnabled()
  expect(errors).toHaveLength(0)
})

test('GO WILD: spam the toggle + theme swap; light & dark screenshots', async ({ page }) => {
  await seedKey(page)
  mockGtx(page)
  mockOpenRouter(page, { mode: 'list' })
  await loadReflow(page)
  // Spam the toggle — must not crash or wedge state.
  for (let n = 0; n < 8; n++) await toggle(page).click()
  await expect(toggle(page)).toBeVisible()
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/byok-quality/dark.png', fullPage: true })
  // Light theme — the purple "Higher quality" pill stays themed + legible.
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(toggle(page)).toBeVisible()
  await page.screenshot({ path: 'test-results/byok-quality/light.png', fullPage: true })
})
