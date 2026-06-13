// E2E for the PDF Layout view (website-plan (a)): faithful canvas render + the
// invisible word-token overlay reusing Select v2, pinch/double-tap zoom, lazy
// per-page render, scanned-PDF degrade, and remember-last. Plus a GO WILD pass
// per [[feedback_go_wild_smoke_test]] (lazy page-N render, scanned note, double-
// tap + synthetic pinch re-render, Reflow<->Layout swap mid-selection, theme swap
// keeps the page white, rapid toggle, 1-finger drag selects while 2 fingers zoom).
// Run: npx playwright test pdf-layout --config tests/e2e/playwright.config.js
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

const tokenBox = (page, i) => page.locator(`[data-token-i="${i}"]`).boundingBox()

// A real mouse drag between two overlay tokens (addressed by global index, since
// the overlay spans are empty — the canvas carries the text).
async function dragTokens(page, i, j, button = 'left') {
  const a = await tokenBox(page, i)
  const b = await tokenBox(page, j)
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down({ button })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 })
  await page.mouse.up({ button })
}

async function tapToken(page, i) {
  const a = await tokenBox(page, i)
  await page.mouse.click(a.x + a.width / 2, a.y + a.height / 2)
}

const tokenBgByIndex = (page, i) => page.locator(`[data-token-i="${i}"]`)
  .evaluate((el) => getComputedStyle(el).backgroundColor)

const firstCanvasWidth = (page) => page.locator('canvas').first()
  .evaluate((c) => c.getBoundingClientRect().width)

// Synthetic 2-finger pinch-out on the first canvas (Desktop Chrome has no multi-touch).
async function pinchOut(page) {
  return page.evaluate(async () => {
    const cv = document.querySelector('canvas')
    const r = cv.getBoundingClientRect()
    const fire = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, {
      pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch',
    }))
    const mx = r.left + r.width / 2
    const my = r.top + 60
    fire('pointerdown', 1, mx - 20, my)
    fire('pointerdown', 2, mx + 20, my)
    await new Promise((res) => setTimeout(res, 16))
    fire('pointermove', 1, mx - 90, my)
    fire('pointermove', 2, mx + 90, my)
    await new Promise((res) => setTimeout(res, 16))
    fire('pointerup', 1, mx - 90, my)
    fire('pointerup', 2, mx + 90, my)
    return true
  })
}

async function loadInLayout(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await page.getByRole('button', { name: 'Layout' }).click()
  await expect(page.locator('canvas').first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  // Deterministic translations: fail the proxy, fulfil the free gtx endpoint with 'watch'.
  await page.route('**/api/translate', (r) => r.abort())
  await page.route('**/translate_a/single**', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([[['watch', 'src', null, null, 10]], null, 'ms']),
  }))
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('renders pages to canvas with an overlay of word tokens', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  await expect(page.locator('[data-page-index]')).toHaveCount(1) // 2-col fixture is 1 page
  expect(await page.locator('[data-token-i]').count()).toBeGreaterThan(5)
})

test('tap a token translates it', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  await tapToken(page, 1)
  await expect(page.getByText('Translation', { exact: true })).toBeVisible()
  await expect(page.getByText('watch').first()).toBeVisible()
})

test('left-drag selects two words and highlights them on the page image', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await dragTokens(page, 1, 2, 'left')
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()
  expect(await tokenBgByIndex(page, 1)).not.toBe('rgba(0, 0, 0, 0)')
  expect(await tokenBgByIndex(page, 2)).not.toBe('rgba(0, 0, 0, 0)')
  await expect(page.getByText('How the words combine')).toHaveCount(0)
})

test('right-drag groups into a phrase, teaches it, and adds it as p:phrase', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await dragTokens(page, 1, 2, 'right')
  await expect(page.getByRole('button', { name: /Add 1/ })).toBeVisible()
  await expect(page.getByText('How the words combine')).toBeVisible()
  await page.getByRole('button', { name: /Add 1/ }).click()
  const card = await page.evaluate(() => window.__STORE.getState().cards.find((c) => c.p === 'phrase'))
  expect(card).toBeTruthy()
  expect(card.p).toBe('phrase')
})

test('scanned (image-only) page is detected and offers on-device OCR (no blank reader)', async ({ page }) => {
  // Past-paper OCR (2026-06-11): an image-only PDF no longer dead-ends in a blank
  // reader — it's detected and offers free on-device OCR. Declining returns to the
  // upload card. (OCR'ing it is covered by past-paper-ocr.spec.js.)
  await page.locator('input[type=file]').first().setInputFiles(fx('scanned.pdf'))
  await expect(page.getByTestId('pdf-ocr-offer')).toBeVisible()
  await expect(page.getByText(/no selectable text/i)).toBeVisible()
  await expect(page.locator('[data-token-i]')).toHaveCount(0)
  await page.getByRole('button', { name: /^Cancel$/ }).click()
  await expect(page.getByText(/Drop a PDF/i)).toBeVisible()
})

test('remember-last: reopening lands back in Layout', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page) // navigation clears window.__STORE — rebind
  await page.locator('input[type=file]').first().setInputFiles(fx('layout-2col.pdf'))
  // No Layout click this time — the persisted pref should land us in Layout.
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect(page.getByText('No selectable text on this page')).toHaveCount(0)
  const pref = await page.evaluate(() => window.__STORE.getState().pdfReader.layoutView)
  expect(pref).toBe(true)
})

test('GO WILD: lazy render — a later page renders only after scrolling to it', async ({ page }) => {
  await loadInLayout(page, 'layout-multi.pdf')
  await expect(page.locator('[data-page-index]')).toHaveCount(4)
  // The last page starts as a placeholder (not yet rendered).
  await expect(page.locator('[data-page-index="3"] canvas')).toHaveCount(0)
  await page.locator('[data-page-index="3"]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-page-index="3"] canvas')).toHaveCount(1)
})

test('GO WILD: double-tap and synthetic pinch both re-render crisp (wider canvas)', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  const base = await firstCanvasWidth(page)
  const box = await page.locator('canvas').first().boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + 40
  await page.mouse.click(cx, cy)
  await page.mouse.click(cx, cy, { delay: 0 })
  await expect.poll(() => firstCanvasWidth(page)).toBeGreaterThan(base * 1.4)
  // back to fit, then pinch-out
  await page.mouse.click(cx, cy)
  await page.mouse.click(cx, cy, { delay: 0 })
  await expect.poll(() => firstCanvasWidth(page)).toBeLessThan(base * 1.2)
  await pinchOut(page)
  await expect.poll(() => firstCanvasWidth(page)).toBeGreaterThan(base * 1.4)
})

test('GO WILD: 1-finger drag still selects after zooming; Reflow<->Layout swap keeps the bucket', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  // zoom in then back to fit so tokens stay on-screen
  const box = await page.locator('canvas').first().boundingBox()
  await page.mouse.click(box.x + 30, box.y + 30)
  await page.mouse.click(box.x + 30, box.y + 30, { delay: 0 })
  await page.mouse.click(box.x + 30, box.y + 30)
  await page.mouse.click(box.x + 30, box.y + 30, { delay: 0 })
  // 1-finger drag selects (proves the pinch arbitration didn't leak state)
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await dragTokens(page, 1, 2, 'left')
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()
  // swap to Reflow and back — the selection bucket survives
  await page.getByRole('button', { name: 'Reflow' }).click()
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()
  await page.getByRole('button', { name: 'Layout' }).click()
  await expect(page.getByRole('button', { name: /Add 2/ })).toBeVisible()
})

test('GO WILD: theme swap keeps the page surface white; rapid view toggle survives', async ({ page }) => {
  await loadInLayout(page, 'layout-2col.pdf')
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  // The canvas background is the explicit white page surface, theme-independent.
  const bg = await page.locator('canvas').first().evaluate((c) => getComputedStyle(c).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')
  // Rapid Reflow<->Layout toggling shouldn't crash or lose the canvas.
  for (let n = 0; n < 4; n++) {
    await page.getByRole('button', { name: 'Reflow' }).click()
    await page.getByRole('button', { name: 'Layout' }).click()
  }
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/pdf-layout/light.png' })
})
