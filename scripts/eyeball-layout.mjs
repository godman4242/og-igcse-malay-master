// Throwaway eyeball for the PDF Layout View. Loads the 2-col fixture, flips to
// Layout, screenshots in BOTH themes. Run: node scripts/eyeball-layout.mjs
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.resolve(__dirname, '../tests/e2e/fixtures', f)

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 390, height: 844 } })
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text()) })
page.on('pageerror', (e) => console.log('PAGE CRASH:', e.message))

await page.goto('http://localhost:5173/pdf-reader', { waitUntil: 'networkidle' })
await page.setInputFiles('input[type=file]', fx(process.argv[2] || 'layout-2col.pdf'))
await page.getByRole('button', { name: 'Layout' }).click()
await page.waitForTimeout(1500)

const canvases = await page.locator('canvas').count()
console.log('canvases rendered:', canvases)
await page.screenshot({ path: '/tmp/layout-dark.png', fullPage: true })

// light theme: toggle .light on the root (the app uses a .light class)
await page.evaluate(() => {
  document.querySelector('.light, [class*="min-h-screen"]')
  const root = document.querySelector('div.min-h-screen') || document.body.firstElementChild
  root?.classList.add('light')
})
await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/layout-light.png', fullPage: true })

await b.close()
console.log('shots: /tmp/layout-dark.png /tmp/layout-light.png')
