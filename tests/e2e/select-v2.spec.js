// E2E for Select v2 in the PDF reader: inline highlight (b), the compositional
// teaching moment + group/ungroup (c), and TOUCH support — driven against the
// real dev build with a committed 1-page Malay fixture. Plus a GO WILD pass
// (backwards drag, single-token group no-op, ungroup, chip-group, mode/theme
// swap, non-token pointer-down) per [[feedback_go_wild_smoke_test]].
// Run: npx playwright test select-v2 --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(__dirname, 'fixtures', 'sample-malay.pdf')

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

// A real mouse drag from one token to another (pointerType 'mouse' via Playwright).
async function mouseDrag(page, startWord, endWord, button = 'left') {
  const a = await page.getByText(startWord, { exact: true }).first().boundingBox()
  const b = await page.getByText(endWord, { exact: true }).first().boundingBox()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down({ button })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 })
  await page.mouse.up({ button })
}

// A synthetic TOUCH drag (Desktop Chrome has no touchscreen): dispatch pointer
// events with pointerType 'touch' straight at the token spans, exercising the
// hook's pointer path the way a phone would.
async function touchDrag(page, startWord, endWord) {
  return page.evaluate(({ startWord, endWord }) => {
    const spans = [...document.querySelectorAll('[data-token-i]')]
    const a = spans.find(s => s.textContent.trim() === startWord)
    const b = spans.find(s => s.textContent.trim() === endWord)
    if (!a || !b) return false
    const c = el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 } }
    const ev = (type, el, buttons) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, buttons, ...c(el) })
    a.dispatchEvent(ev('pointerdown', a, 1))
    b.dispatchEvent(ev('pointermove', b, 1))
    b.dispatchEvent(ev('pointerup', b, 0))
    return true
  }, { startWord, endWord })
}

async function tokenBg(page, word) {
  return page.evaluate((word) => {
    const el = [...document.querySelectorAll('[data-token-i]')].find(s => s.textContent.trim() === word)
    return el ? getComputedStyle(el).backgroundColor : null
  }, word)
}

test.beforeEach(async ({ page }) => {
  // Deterministic, fast translations: fail the proxy, fulfil the free gtx endpoint.
  await page.route('**/api/translate', r => r.abort())
  await page.route('**/translate_a/single**', r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([[['watch', 'jam tangan', null, null, 10]], null, 'ms']),
  }))
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)

  await page.locator('input[type=file]').first().setInputFiles(FIXTURE)
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await page.getByRole('button', { name: /^Select$/ }).click()
})

test('left-drag selects individual words and highlights them inline', async ({ page }) => {
  await mouseDrag(page, 'jam', 'tangan', 'left')

  // Two word-chips → the Add button counts 2.
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()
  // Both tokens are highlighted in the text (delivers plan (b)).
  expect(await tokenBg(page, 'jam')).not.toBe('rgba(0, 0, 0, 0)')
  expect(await tokenBg(page, 'tangan')).not.toBe('rgba(0, 0, 0, 0)')
  // Not a phrase → no teaching block.
  await expect(page.getByText('How the words combine')).toHaveCount(0)
})

test('right-drag groups into one phrase, shows the teaching moment, and adds as a phrase', async ({ page }) => {
  await mouseDrag(page, 'jam', 'tangan', 'right')

  // One phrase chip → Add 1; the compositional block appears.
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()
  await expect(page.getByText('How the words combine')).toBeVisible()

  await page.getByRole('button', { name: /Add 1/ }).click()
  const card = await page.evaluate(() =>
    window.__STORE.getState().cards.find(c => c.m === 'jam tangan'))
  expect(card).toBeTruthy()
  expect(card.p).toBe('phrase')
})

test('Group toggle makes a left-drag group (the touch-free way to group)', async ({ page }) => {
  await page.getByRole('button', { name: 'Group', exact: true }).click()
  await mouseDrag(page, 'jam', 'tangan', 'left')

  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()
  await expect(page.getByText('How the words combine')).toBeVisible()
})

test('touch drag works (phone-first): default selects words, toggle groups', async ({ page }) => {
  // Default (Individual) touch drag → two word chips.
  expect(await touchDrag(page, 'jam', 'tangan')).toBe(true)
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()

  // Flip to Group, touch-drag another pair → a phrase forms.
  await page.getByRole('button', { name: 'Group', exact: true }).click()
  expect(await touchDrag(page, 'membaca', 'buku')).toBe(true)
  await expect(page.getByText('How the words combine')).toBeVisible()
})

test('GO WILD: backwards drag, single-token no-op, ungroup, chip-group, mode/theme swap', async ({ page }) => {
  // Backwards right-drag (end before start) still groups.
  await mouseDrag(page, 'tangan', 'jam', 'right')
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()
  // Ungroup via the chip's unlink button → back to two word chips.
  await page.getByRole('button', { name: /Ungroup into separate words/ }).click()
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()
  // Chip-group the two adjacent words back into a phrase (touch-friendly path).
  await page.getByRole('button', { name: /Group with next word into a phrase/ }).first().click()
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()

  // Mode swap mid-selection: Translate ↔ Select — the selection persists.
  await page.getByRole('button', { name: /^Translate$/ }).click()
  await page.getByRole('button', { name: /^Select$/ }).click()
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()

  // Theme swap mid-selection — still renders, selection intact.
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/select-v2/grouped-light.png' })
})

test('GO WILD: a single-token right-drag stays a word, not a phrase', async ({ page }) => {
  await mouseDrag(page, 'Rumah', 'Rumah', 'right')
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()
  // A single token never becomes a phrase, so no teaching block.
  await expect(page.getByText('How the words combine')).toHaveCount(0)
})

test('GO WILD: a pointer-down off any token starts no selection', async ({ page }) => {
  // The "Page 1" label sits inside the drag root but carries no data-token-i.
  await page.evaluate(() => {
    const label = [...document.querySelectorAll('div')].find(d => /^Page \d/.test(d.textContent.trim()))
    const r = label.getBoundingClientRect()
    const ev = (t) => new PointerEvent(t, { bubbles: true, pointerId: 2, pointerType: 'touch', clientX: r.x + 2, clientY: r.y + 2 })
    label.dispatchEvent(ev('pointerdown'))
    label.dispatchEvent(ev('pointerup'))
  })
  await expect(page.getByRole('button', { name: /Add \d/ })).toHaveCount(0)
})
