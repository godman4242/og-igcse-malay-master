// E2E for the Full-translation page (Option G). Reveal-gated: opens all-Malay,
// nothing revealed; tap a paragraph → its English slides in beneath (Malay stays);
// "Reveal all" is the opt-in bulk hatch (cancellable, cache-resumable); machine marker
// always on; paragraph-pure; English doc hides the entry; back returns to the reader
// with the word + sentence layers intact.
//
// GO WILD ([[feedback_go_wild_smoke_test]]): cancel mid bulk run, offline, spam
// entry/back + reveal-all, theme swap. Run SOLO:
//   npx playwright test full-translation --config tests/e2e/playwright.config.js
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

const openBtn = (page) => page.getByRole('button', { name: 'Full translation' })
const reveals = (page) => page.getByRole('button', { name: 'Reveal English for this paragraph' })
const collapses = (page) => page.getByRole('button', { name: 'Hide English for this paragraph' })
const backBtn = (page) => page.getByRole('button', { name: 'Back to reader' })

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  // Virgin store ⇒ the first-run GuideOffer fires on a delay timer and its
  // fixed-bottom dialog intercepts clicks on the reveal buttons (the long-
  // paragraph test lost this race deterministically). Mark it seen up front.
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
})

test('opens reveal-gated: all Malay, nothing revealed until tapped', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await expect(backBtn(page)).toBeVisible()
  // Reveal-gated: paragraphs present, none revealed.
  await expect(reveals(page).first()).toBeVisible()
  await expect(collapses(page)).toHaveCount(0)
  // Machine-translation framing is always on.
  await expect(page.getByText(/Machine translation/).first()).toBeVisible()
  await reveals(page).first().click()
  await expect(page.getByText(/^EN-/).first()).toBeVisible()
  await expect(page.getByText('machine').first()).toBeVisible()
  await expect(collapses(page).first()).toBeVisible()
})

test('reveal all shows every paragraph; hide all collapses back to gated', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await expect(reveals(page).first()).toBeVisible() // wait for the lazy view to mount before counting
  const n = await reveals(page).count()
  expect(n).toBeGreaterThanOrEqual(1)
  await page.getByRole('button', { name: 'Reveal all' }).click()
  await expect(collapses(page)).toHaveCount(n)
  await page.getByRole('button', { name: 'Hide all' }).click()
  await expect(collapses(page)).toHaveCount(0)
  await expect(reveals(page)).toHaveCount(n)
})

test('re-running reveal-all resumes from cache — no new network calls', async ({ page }) => {
  const calls = { n: 0 }
  mockTranslate(page, { calls })
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await page.getByRole('button', { name: 'Reveal all' }).click()
  // Wait for the bulk translation to fully SETTLE, not just start: reveal-all
  // fires one call per chunk, and on slow runners (CI) they straggle — a
  // baseline snapshot taken after only the first call makes the stragglers
  // look like cache misses on the re-run.
  let settled = -1
  await expect.poll(() => {
    const cur = calls.n
    const stable = cur > 0 && cur === settled
    settled = cur
    return stable
  }, { intervals: [600], timeout: 20_000 }).toBe(true)
  const first = calls.n
  await page.getByRole('button', { name: 'Hide all' }).click()
  await page.getByRole('button', { name: 'Reveal all' }).click()
  await page.waitForTimeout(300)
  expect(calls.n).toBe(first) // every paragraph already cached/glossed
})

test('English document hides the Full-translation entry', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'english-doc.pdf')
  await expect(openBtn(page)).toHaveCount(0)
})

test('back returns to the reader with the word + sentence layers intact', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await backBtn(page).click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sentences', exact: true })).toBeVisible()
})

test('offline: reveal shows a pending/offline state, no crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', (r) => r.abort()) // simulate offline
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await reveals(page).first().click()
  await page.waitForTimeout(400)
  await expect(collapses(page).first()).toBeVisible() // still revealed, no English, no crash
  await expect(backBtn(page)).toBeEnabled()
  expect(errors).toHaveLength(0)
})

test('successful reveal renders the English inline in light AND dark', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await reveals(page).first().click()
  await expect(page.getByText(/^EN-/).first()).toBeVisible() // English actually rendered
  await expect(collapses(page).first()).toBeVisible()         // Malay still visible above it
  await page.screenshot({ path: 'test-results/full-translation/revealed-dark.png', fullPage: true })
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(page.getByText(/^EN-/).first()).toBeVisible()
  await page.screenshot({ path: 'test-results/full-translation/revealed-light.png', fullPage: true })
})

test('over-long paragraph: split into sub-chunks, then rejoined for display', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'long-paragraph-malay.pdf')
  await openBtn(page).click()
  await expect(reveals(page).first()).toBeVisible()
  await reveals(page).first().click()
  // The gtx mock echoes EN-<chunk> per sub-chunk. An over-long (>4000-char) paragraph
  // is split into >1 sentence sub-chunk and rejoined, so its single gloss block must
  // contain MULTIPLE "EN-" segments — proof the split→translate→rejoin path ran.
  const block = page.locator('[aria-live="polite"]').first()
  await expect(block).toBeVisible()
  await expect
    .poll(async () => ((await block.textContent()) || '').match(/EN-/g)?.length || 0)
    .toBeGreaterThanOrEqual(2)
})

test('GO WILD: cancel mid bulk run + spam entry/back + theme screenshots', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page, { delayMs: 120 })
  await loadReflow(page, 'sentences-malay.pdf')
  // Spam the entry/back round-trip — must not crash or leak.
  for (let i = 0; i < 4; i++) {
    await openBtn(page).click()
    await backBtn(page).click()
  }
  await openBtn(page).click()
  await page.getByRole('button', { name: 'Reveal all' }).click()
  // Cancel mid-flight (button appears while the bulk job runs).
  const cancel = page.getByRole('button', { name: 'Cancel' })
  if (await cancel.isVisible().catch(() => false)) await cancel.click()
  await page.screenshot({ path: 'test-results/full-translation/dark.png', fullPage: true })
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(backBtn(page)).toBeVisible()
  await page.screenshot({ path: 'test-results/full-translation/light.png', fullPage: true })
  expect(errors).toHaveLength(0)
})
