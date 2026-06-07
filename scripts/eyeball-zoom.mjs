// Throwaway: prove Layout-view zoom (double-tap + synthetic 2-finger pinch) and
// that a 1-finger drag still selects. Run: node scripts/eyeball-zoom.mjs
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.resolve(__dirname, '../tests/e2e/fixtures', f)

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', (e) => console.log('PAGE CRASH:', e.message))

await page.goto('http://localhost:5173/pdf-reader', { waitUntil: 'networkidle' })
await page.setInputFiles('input[type=file]', fx('layout-2col.pdf'))
await page.getByRole('button', { name: 'Layout' }).click()
await page.waitForTimeout(1200)

const canvasW = async () => (await page.locator('canvas').first().evaluate((c) => c.getBoundingClientRect().width))
const before = await canvasW()
console.log('canvas width @ fit:', Math.round(before))

// --- double-tap on the page → should zoom to ~2× and re-render wider ---
const box = await page.locator('canvas').first().boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + 40
await page.mouse.click(cx, cy)
await page.mouse.click(cx, cy, { delay: 0 })
await page.waitForTimeout(900)
const afterDbl = await canvasW()
console.log('canvas width after double-tap:', Math.round(afterDbl), afterDbl > before * 1.4 ? '✅ zoomed' : '❌')

// reset with another double-tap (back to fit)
await page.mouse.click(cx, cy)
await page.mouse.click(cx, cy, { delay: 0 })
await page.waitForTimeout(900)
console.log('canvas width back to fit:', Math.round(await canvasW()))

// --- synthetic 2-finger pinch-out via raw PointerEvents on the wrapper ---
const pinched = await page.evaluate(async () => {
  const cv = document.querySelector('canvas')
  const r = cv.getBoundingClientRect()
  const fire = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, {
    pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch',
  }))
  const midX = r.left + r.width / 2
  const midY = r.top + 60
  fire('pointerdown', 1, midX - 20, midY)
  fire('pointerdown', 2, midX + 20, midY)
  await new Promise((res) => setTimeout(res, 16))
  fire('pointermove', 1, midX - 80, midY)
  fire('pointermove', 2, midX + 80, midY)
  await new Promise((res) => setTimeout(res, 16))
  fire('pointerup', 1, midX - 80, midY)
  fire('pointerup', 2, midX + 80, midY)
  return true
})
await page.waitForTimeout(900)
const afterPinch = await canvasW()
console.log('canvas width after pinch-out:', Math.round(afterPinch), afterPinch > before * 1.4 ? '✅ zoomed' : '❌')

// reset to fit (double-tap toggles back) so tokens are on-screen for the drag test
await page.mouse.click(cx, cy)
await page.mouse.click(cx, cy, { delay: 0 })
await page.waitForTimeout(900)
console.log('canvas width reset to fit before drag:', Math.round(await canvasW()))

// --- 1-finger drag STILL selects after all the zooming ---
await page.getByRole('button', { name: 'Select', exact: true }).click()
const a = await page.locator('[data-token-i="1"]').boundingBox()
const c = await page.locator('[data-token-i="2"]').boundingBox()
if (a && c) {
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}
const bucket = await page.locator('text=/Add \\d+/').first().isVisible().catch(() => false)
console.log('1-finger drag still selects:', bucket ? '✅' : '❌')

await page.screenshot({ path: '/tmp/zoom.png', fullPage: true })
await b.close()
console.log('shot: /tmp/zoom.png')
