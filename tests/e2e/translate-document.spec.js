// E2E for "Translate the whole document, free" (Scope A MVP): the reveal-gated,
// in-place gloss layer over the PDF reader. Read Malay first → tap a cue → the
// English gloss appears in place; known words never get a cue; show-all/hide-all;
// re-run resumes from cache; a dictionary mismatch shows the canonical + flag;
// one-tap add lands an FSRS card; offline degrades gracefully; theme swap keeps the
// gloss themed. Plus a GO WILD pass ([[feedback_go_wild_smoke_test]]): spam the
// show-all toggle, navigate mid-job, light + dark screenshots.
//
// Run: npx playwright test translate-document --config tests/e2e/playwright.config.js
//
// Honours the CLAUDE.md Vite ?t= module-URL trap: bindStore() dynamic-imports the
// SAME useStore URL React subscribed to, and is re-run after every navigation.
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

// Deterministic per-word gtx mock: q=<word> → gloss "EN-<word>". Counts calls so we
// can prove a re-run reuses the cache. `delayMs` lets a test slow the job to cancel.
function mockTranslate(page, { delayMs = 0, calls } = {}) {
  // The DeepL/Google proxy: always fail so the chain falls through to free gtx.
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', async (r) => {
    if (calls) calls.n += 1
    if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
    const u = new URL(r.request().url())
    const word = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${word}`, word, null, null, 10]], null, 'ms']),
    })
  })
}

async function loadReflow(page, fixture = 'sample-malay.pdf') {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  // Reflow is the default view; wait for tokens to render.
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const cues = (page) => page.getByRole('button', { name: /^Reveal meaning of/ })
const addButtons = (page) => page.getByRole('button', { name: /to deck$/ })

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('reveal-gated: glosses are hidden until tapped, then appear in place', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  // No cues until we translate.
  await expect(cues(page)).toHaveCount(0)
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  // Reveal-gated: nothing is revealed yet → no add-to-deck buttons exist.
  await expect(addButtons(page)).toHaveCount(0)
  // Tap the first cue → its English gloss + an add button appear.
  const label = await cues(page).first().getAttribute('aria-label')
  const word = label.replace('Reveal meaning of ', '')
  await cues(page).first().click()
  await expect(page.getByText(`EN-${word}`).first()).toBeVisible()
  await expect(addButtons(page).first()).toBeVisible()
})

test('known dictionary words never get a cue (fewer cues than tokens)', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  const cueCount = await cues(page).count()
  const tokenCount = await page.locator('[data-token-i]').count()
  expect(cueCount).toBeGreaterThan(0)
  // Some tokens are dictionary-known (green) and must be skipped → strictly fewer.
  expect(cueCount).toBeLessThan(tokenCount)
})

test('show all reveals every gloss; hide all collapses them', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  const cueCount = await cues(page).count()
  await page.getByRole('button', { name: 'Show all' }).click()
  await expect(addButtons(page)).toHaveCount(cueCount) // every gloss now revealed
  await page.getByRole('button', { name: 'Hide all' }).click()
  await expect(addButtons(page)).toHaveCount(0) // back to gated
})

test('re-run resumes from cache — no new network calls', async ({ page }) => {
  const calls = { n: 0 }
  mockTranslate(page, { calls })
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(cues(page).first()).toBeVisible()
  await expect.poll(() => calls.n).toBeGreaterThan(0)
  const first = calls.n
  // Re-run: every word is cached now → zero further single-endpoint hits.
  await page.getByRole('button', { name: /Translate page/ }).click()
  await page.waitForTimeout(300)
  expect(calls.n).toBe(first)
  await expect(cues(page).first()).toBeVisible() // glosses still there
})

test('unverified machine output is flagged (dotted, title says unverified)', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  await cues(page).first().click()
  // Our fixture words aren't in the owned dictionary → every gloss is "unverified".
  await expect(page.locator('[title*="unverified" i]').first()).toBeVisible()
})

test('a dictionary mismatch shows the canonical English, not the machine guess', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  const label = await cues(page).first().getAttribute('aria-label')
  const word = label.replace('Reveal meaning of ', '')
  // Ground that word with a canonical meaning that differs from the machine's "EN-…".
  await page.evaluate((w) => window.__STORE.getState().addCards([{ m: w, e: 'CANONICALWORD' }]), word)
  // The gloss recomputes → reveal shows the canonical, never the machine guess.
  await cues(page).first().click()
  await expect(page.getByText('CANONICALWORD').first()).toBeVisible()
  await expect(page.getByText(`EN-${word}`)).toHaveCount(0)
})

test('one-tap add lands an FSRS card in the PDF Import deck', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  const before = await page.evaluate(() => window.__STORE.getState().cards.length)
  const label = await cues(page).first().getAttribute('aria-label')
  const word = label.replace('Reveal meaning of ', '')
  await cues(page).first().click()
  await addButtons(page).first().click()
  await expect.poll(() => page.evaluate(() => window.__STORE.getState().cards.length)).toBe(before + 1)
  const card = await page.evaluate((w) => window.__STORE.getState().cards.find((c) => c.m === w), word)
  expect(card).toBeTruthy()
  expect(card.t).toBe('PDF Import')
})

test('offline degrades gracefully — no crash, no bogus self-glosses', async ({ page }) => {
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', (r) => r.abort()) // simulate offline
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  // Failed lookups produce NO cue (no word-as-its-own-gloss); app stays responsive.
  await page.waitForTimeout(400)
  await expect(cues(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Translate page/ })).toBeEnabled()
})

test('cancel returns the toolbar to idle', async ({ page }) => {
  mockTranslate(page, { delayMs: 200 })
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  // Cancel the in-flight job → progress + Cancel disappear, button reads "Translate page".
  const cancel = page.getByRole('button', { name: 'Cancel' })
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click()
  }
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Translate page/ })).toBeEnabled()
})

test('GO WILD: spam show-all toggle + theme swap; light & dark screenshots', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  await cues(page).first().click()
  // Spam the show-all/hide-all toggle — must not crash or leak state.
  for (let n = 0; n < 6; n++) {
    await page.getByRole('button', { name: 'Show all' }).click()
    await page.getByRole('button', { name: 'Hide all' }).click()
  }
  await page.getByRole('button', { name: 'Show all' }).click()
  await expect(addButtons(page).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/translate-document/dark.png', fullPage: true })
  // Light theme — gloss layer stays themed + legible.
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(addButtons(page).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/translate-document/light.png', fullPage: true })
})

test('GO WILD: navigating away mid-job does not crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page, { delayMs: 120 })
  await loadReflow(page)
  await page.getByRole('button', { name: /Translate page/ }).click()
  // Leave the reader while the job is in flight (the runner aborts on unmount).
  await page.goto('/study', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toBeVisible()
  await page.waitForTimeout(200)
  expect(errors).toHaveLength(0)
})
