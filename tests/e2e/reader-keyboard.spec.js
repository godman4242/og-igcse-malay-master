// E2E for the reflow reader's keyboard layer (P1-5 — F1–F7).
// Spec: docs/superpowers/specs/2026-06-12-reader-drill-a11y-design.md §3.
//
// The keyboard layer is purely additive plumbing over handleCommit /
// revealGloss / addGloss — these tests drive the reader's core loop
// (move → reveal → select → save to FSRS) with NO pointer at all.
//
// Run solo:
//   npx playwright test reader-keyboard --config tests/e2e/playwright.config.js
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

// Free gtx endpoint mocked so translations are instant + deterministic (EN-<word>).
function mockTranslate(page) {
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', async (r) => {
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })
}

async function loadReflow(page, fixture = 'sample-malay.pdf') {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const focusedToken = (page) => page.evaluate(() => {
  const el = document.activeElement
  return el?.dataset?.tokenI !== undefined
    ? { i: Number(el.dataset.tokenI), text: el.textContent }
    : null
})

// The reader's polite live region (F7) — scoped to the reflow container.
const announce = (page) => page.locator('[data-testid="reader-reflow"] [role="status"]')

// Walk Tab from the page top until focus enters the token group (bounded).
async function tabToToken(page, max = 40) {
  for (let k = 0; k < max; k++) {
    await page.keyboard.press('Tab')
    if (await focusedToken(page)) return true
  }
  return false
}

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  // Suppress the first-run tour offer — its fixed-bottom dialog steals focus/clicks.
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
})

test('F1+F2 — single roving tab stop; arrows/Home/End walk words; visible focus ring', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)

  // Roving tabindex contract: exactly ONE token in the tab order.
  await expect(page.locator('[data-token-i][tabindex="0"]')).toHaveCount(1)

  // F1: Tab (real keyboard) reaches the token group…
  expect(await tabToToken(page)).toBe(true)
  const first = await focusedToken(page)
  // …with a visible ≥2px focus ring (:focus-visible fires on keyboard focus).
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth)
  expect(parseFloat(outline)).toBeGreaterThanOrEqual(2)

  // F2: arrows move word-to-word in document order.
  await page.keyboard.press('ArrowRight')
  const second = await focusedToken(page)
  expect(second.i).toBeGreaterThan(first.i)
  await page.keyboard.press('ArrowLeft')
  expect((await focusedToken(page)).i).toBe(first.i)
  // Clamp at the start: another ArrowLeft stays put.
  await page.keyboard.press('ArrowLeft')
  expect((await focusedToken(page)).i).toBe(first.i)
  await page.keyboard.press('End')
  const last = await focusedToken(page)
  expect(last.i).toBeGreaterThan(second.i)
  await page.keyboard.press('Home')
  expect((await focusedToken(page)).i).toBe(first.i)

  // F3 guard: ALL that movement revealed nothing (reveal-gate, D4).
  await expect(announce(page)).toHaveText('')
  await expect(page.getByText(/^EN-/)).toHaveCount(0)

  // Single tab stop: one more Tab leaves the token group entirely.
  await page.keyboard.press('Tab')
  expect(await focusedToken(page)).toBeNull()
})

test('F3+F7 — Enter (and only Enter) reveals the focused word\'s meaning', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)

  await page.locator('[data-token-i][tabindex="0"]').focus()
  const tok = await focusedToken(page)
  await page.keyboard.press('Enter')

  // Tap-to-translate fired for exactly the focused word; live region announced it.
  await expect(page.getByText(`EN-${tok.text}`)).toBeVisible()
  await expect(announce(page)).toHaveText(`Translating ${tok.text}`)
})

test('F4+F7 — Select mode: Enter + Shift+Arrow build the bucket, Add commits to FSRS', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)
  await page.getByRole('button', { name: 'Select', exact: true }).click()

  // Enter adds the focused word to the selection bucket.
  await page.locator('[data-token-i][tabindex="0"]').focus()
  const w0 = await focusedToken(page)
  await page.keyboard.press('Enter')
  await expect(announce(page)).toHaveText(`Added ${w0.text} to selection`)

  // Shift+Arrow extends a visible range, announced as it grows.
  await page.keyboard.press('Shift+ArrowRight')
  await expect(announce(page)).toHaveText('Selecting 2 words')
  await page.keyboard.press('Shift+ArrowRight')
  await expect(announce(page)).toHaveText('Selecting 3 words')

  // Enter commits the range through the SAME classifier a drag uses.
  await page.keyboard.press('Enter')
  await expect(announce(page)).toHaveText('Added 3 words to selection')

  // The existing "Add N" button saves to FSRS — activated by keyboard.
  const addBtn = page.getByRole('button', { name: /^Add \d+$/ })
  await expect(addBtn).toBeVisible()
  const n = Number((await addBtn.textContent()).match(/\d+/)[0])
  await addBtn.focus()
  await page.keyboard.press('Enter')
  await expect.poll(
    () => page.evaluate(() => window.__STORE.getState().cards.length),
  ).toBe(n)
})

test('F5+F7 — "a" adds only a REVEALED gloss to the deck', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)

  // No revealed meaning yet → polite hint, nothing added.
  await page.locator('[data-token-i][tabindex="0"]').focus()
  await page.keyboard.press('a')
  await expect(announce(page)).toHaveText('Press Enter to reveal the meaning first')
  expect(await page.evaluate(() => window.__STORE.getState().cards.length)).toBe(0)

  // Gloss the page, focus a token that HAS a gloss cue, reveal it with Enter…
  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(page.getByRole('button', { name: /^Reveal meaning of/ }).first()).toBeVisible()
  const tokI = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Reveal meaning of"]')
    return btn?.previousElementSibling?.dataset?.tokenI ?? null
  })
  expect(tokI).not.toBeNull()
  await page.locator(`#tok-${tokI}`).focus()
  await page.keyboard.press('Enter')
  // Glosses key on the NORMALIZED (lowercase) word — announcements use that form.
  const word = (await page.locator(`#tok-${tokI}`).textContent()).toLowerCase()
  await expect(announce(page)).toHaveText(new RegExp(`^${word}: `))

  // …then "a" routes it into FSRS via the existing addGloss.
  await page.keyboard.press('a')
  await expect(announce(page)).toHaveText(`Added ${word} to deck`)
  await expect.poll(
    () => page.evaluate(() => window.__STORE.getState().cards.length),
  ).toBe(1)
})

test('F6 — Escape clears an in-progress keyboard range', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page)

  await page.locator('[data-token-i][tabindex="0"]').focus()
  await page.keyboard.press('Shift+ArrowRight')
  await expect(announce(page)).toHaveText('Selecting 2 words')

  await page.keyboard.press('Escape')
  await expect(announce(page)).toHaveText('Selection cleared')

  // Proof the range is gone: Enter now acts on ONE word, not a range.
  const tok = await focusedToken(page)
  await page.keyboard.press('Enter')
  await expect(announce(page)).toHaveText(`Translating ${tok.text}`)
})
