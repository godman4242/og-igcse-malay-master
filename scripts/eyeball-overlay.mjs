// Throwaway: prove the Layout-view word-token overlay drives Select v2.
// Run: node scripts/eyeball-overlay.mjs
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

const spans = await page.locator('[data-token-i]').count()
console.log('overlay token spans:', spans)

// Tap token index 1 ("rajah") → translation panel should show it.
const tok1 = page.locator('[data-token-i="1"]')
await tok1.click()
await page.waitForTimeout(800)
const transText = await page.locator('text=Translation').first().isVisible().catch(() => false)
console.log('translation panel after tap:', transText)
const bodyHas = await page.locator('body').innerText()
console.log('panel mentions a Malay src word:', /rajah|jam|lihat/i.test(bodyHas))

// Switch to Select mode, left-drag across two tokens → 2 highlighted spans.
await page.getByRole('button', { name: 'Select', exact: true }).click()
const a = await page.locator('[data-token-i="1"]').boundingBox()
const c = await page.locator('[data-token-i="2"]').boundingBox()
if (a && c) {
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(500)
}
const bucket = await page.locator('text=/Add \\d+/').first().isVisible().catch(() => false)
console.log('selection bucket after drag:', bucket)

await page.screenshot({ path: '/tmp/overlay.png', fullPage: true })
await b.close()
console.log('shot: /tmp/overlay.png')
