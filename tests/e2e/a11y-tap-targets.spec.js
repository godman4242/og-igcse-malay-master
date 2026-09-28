// F10 — ≥44×44 px tap targets (WCAG 2.5.5 / the PRD's own "touch targets
// ≥ 44px" rule) across the three audited surfaces: app header, PDFReader
// toolbar, SearchModal rows. Measured with REAL Chromium layout
// (getBoundingClientRect) — jsdom has no layout engine.
//
// The sweep is generic (every button in scope), so newly added controls are
// covered automatically instead of silently shipping small.
//
// Run solo:
//   npx playwright test a11y-tap-targets --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)

const MIN = 44

// Every visible button-like control inside `scopeSel` smaller than MIN×MIN.
function offenders(page, scopeSel) {
  return page.evaluate(({ sel, min }) => {
    const out = []
    const els = document.querySelectorAll(`${sel} button, ${sel} a[href], ${sel} [role="button"]`)
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue // hidden
      // Round to whole pixels BEFORE comparing — and compare the same value we
      // print. A control sized exactly to MIN can measure 43.9x under headless
      // sub-pixel layout and falsely trip a raw `< 44` check (it then printed
      // "44×44" as an offender — a flake, not a real violation). A genuinely
      // small control (≤43px) still rounds below MIN and is caught.
      const w = Math.round(r.width)
      const h = Math.round(r.height)
      if (w < min || h < min) {
        const name = (el.getAttribute('aria-label') || el.textContent || '?').trim().slice(0, 40)
        out.push(`${name}: ${w}×${h}`)
      }
    }
    return out
  }, { sel: scopeSel, min: MIN })
}

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
})

test('header controls are all ≥44×44', async ({ page }) => {
  const small = await offenders(page, 'header')
  expect(small, `Header controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

test('PDFReader toolbar controls are all ≥44×44 (incl. Select-mode Group toggle)', async ({ page }) => {
  await page.locator('input[type=file]').first().setInputFiles(fx('sample-malay.pdf'))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  // Select mode reveals the Individual/Group toggle — include it in the sweep.
  await page.getByRole('button', { name: 'Select', exact: true }).click()

  const small = await offenders(page, 'div.sticky.top-0')
  expect(small, `Toolbar controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

test('SearchModal controls are all ≥44×44 (close, speak, add)', async ({ page }) => {
  await page.getByRole('button', { name: 'Search' }).click()
  const dialog = page.locator('[role="dialog"]')
  await expect(dialog).toBeVisible()
  // Surface result rows so the per-row speak/add chips render.
  await dialog.locator('input').fill('rumah')
  await expect(dialog.getByText('Dict').first()).toBeVisible()

  const small = await offenders(page, '[role="dialog"]')
  expect(small, `SearchModal controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

// The translate progress bars live in the same sticky toolbar but only exist
// mid-run, so the sweep above never saw their "Cancel" (it shipped as a 10 px
// text link). Hold every translate call open so the bar stays up while measured.
test('PDFReader translate progress bars: Cancel is ≥44×44 (page + sentences)', async ({ page }) => {
  await page.route('**/api/translate', (r) => r.abort())
  await page.route('**/translate_a/single**', () => new Promise(() => {})) // never resolves
  await page.locator('input[type=file]').first().setInputFiles(fx('sentences-malay.pdf'))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()

  await page.getByRole('button', { name: /Translate page/ }).click()
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
  let small = await offenders(page, 'div.sticky.top-0')
  expect(small, `Translate-page bar under ${MIN}px:\n${small.join('\n')}`).toEqual([])

  // Both runs at once stacks the two bars: their Cancels must not overlap, or a
  // tap on one edge cancels the other run.
  await page.getByRole('button', { name: 'Sentences', exact: true }).click()
  await page.getByRole('button', { name: 'Translate sentences' }).click()
  const cancels = page.getByRole('button', { name: 'Cancel', exact: true })
  await expect(cancels).toHaveCount(2)
  small = await offenders(page, 'div.sticky.top-0')
  expect(small, `Sentence bar under ${MIN}px:\n${small.join('\n')}`).toEqual([])
  const [a, b] = [await cancels.nth(0).boundingBox(), await cancels.nth(1).boundingBox()]
  expect(Math.round(a.y + a.height), 'page Cancel overlaps the sentence Cancel').toBeLessThanOrEqual(Math.round(b.y))
})
