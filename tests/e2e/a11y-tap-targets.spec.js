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

// The OCR / transcription progress screens and the scanned-PDF offer replace the
// whole reader, so none of the sweeps above ever sees them. Hang the engines'
// asset fetches so each progress screen stays up while it is measured.
test('PDFReader OCR + transcription progress and the scanned-PDF offer: every control ≥44×44', async ({ page }) => {
  await page.route('**/ocr/**', () => new Promise(() => {}))
  await page.route('**/asr/**', () => new Promise(() => {}))
  const input = page.locator('input[type=file]').first()

  await input.setInputFiles(fx('ocr-clean-malay.png'))
  await expect(page.getByText(/Reading your page/)).toBeVisible()
  let small = await offenders(page, '[aria-live="polite"]')
  expect(small, `OCR progress controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
  // Reload between states, not Cancel: Cancel can't interrupt the (hung) engine
  // download, so the screen would stay up (GOAL.md bug-hunt #28).
  await page.reload({ waitUntil: 'networkidle' })

  await input.setInputFiles(fx('asr-silent.wav'))
  await expect(page.getByText(/Setting up the speech model/)).toBeVisible()
  small = await offenders(page, '[aria-live="polite"]')
  expect(small, `Transcription progress controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
  await page.reload({ waitUntil: 'networkidle' })

  await input.setInputFiles(fx('scanned.pdf'))
  await expect(page.getByTestId('pdf-ocr-offer')).toBeVisible()
  small = await offenders(page, '[data-testid="pdf-ocr-offer"]')
  expect(small, `Scanned-PDF offer controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

// The dense-page offer only appears on a too-hard page, so no sweep above saw
// its buttons (px-3 py-1.5 text-xs — the class that measured 30 px on the OCR
// screen, GOAL.md bug-hunt #29).
test('PDFReader dense-page offer: every control ≥44×44', async ({ page }) => {
  await page.locator('input[type=file]').first().setInputFiles(fx('dense-malay.pdf'))
  await expect(page.getByTestId('dense-page-nudge')).toBeVisible()
  const small = await offenders(page, '[data-testid="dense-page-nudge"]')
  expect(small, `Dense-page offer controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

// The Sharper-read consent dialog needs a finished free OCR read + a BYOK
// vision key (set before boot — gemini.js reads it at module load).
test('PDFReader Sharper-read consent dialog: every control ≥44×44', async ({ page }) => {
  test.setTimeout(120_000)
  await page.evaluate(() => {
    localStorage.setItem('igcse-gemini-key', 'AIzaTest')
    localStorage.setItem('igcse-gemini-models', JSON.stringify({ ts: Date.now(), ids: ['gemini-3.5-flash'] }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('input[type=file]').first().setInputFiles(fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i).first()).toBeVisible({ timeout: 90_000 })
  await page.getByTestId('sharper-read').click()
  await expect(page.getByTestId('vision-consent')).toBeVisible()
  let small = await offenders(page, '[data-testid="vision-consent"]')
  expect(small, `Consent dialog controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])

  // Same flow, offline: the Sharper-read error banner and its ✕.
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.context().setOffline(true)
  await page.getByTestId('sharper-read').click()
  await expect(page.getByTestId('vision-error')).toBeVisible()
  small = await offenders(page, '[data-testid="vision-error"]')
  expect(small, `Sharper-read error controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

// The Select-mode bucket only exists once words are picked, so no sweep above
// saw it: "Add N" (px-3 py-1.5 text-xs) and each chip's group / ungroup /
// remove icons (bare 10 px, GOAL.md bug-hunt #33).
test('PDFReader Select-mode bucket: every control ≥44×44 (word + phrase chips)', async ({ page }) => {
  await page.locator('input[type=file]').first().setInputFiles(fx('sample-malay.pdf'))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.locator('[data-token-i="0"]').click()
  await page.locator('[data-token-i="1"]').click()
  const bucket = page.getByTestId('selection-bucket')
  await expect(bucket).toBeVisible()
  let small = await offenders(page, '[data-testid="selection-bucket"]')
  expect(small, `Bucket controls (word chips) under ${MIN}px:\n${small.join('\n')}`).toEqual([])
  // Two adjacent words → each chip carries a NAMED remove, the first also "group".
  await expect(bucket.getByRole('button', { name: /^Remove / })).toHaveCount(2)

  // Group them → one phrase chip with "ungroup" + remove.
  await bucket.getByRole('button', { name: 'Group with next word' }).click()
  await expect(bucket.getByRole('button', { name: 'Ungroup' })).toBeVisible()
  small = await offenders(page, '[data-testid="selection-bucket"]')
  expect(small, `Bucket controls (phrase chip) under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})

// The first-run "New here?" card is a role="dialog" floating over every page
// (GOAL.md bug-hunt #41: ✕ measured 28×28, both buttons 40 tall). beforeEach
// marks the Quick tour seen, so un-see it and wait out the 2 s reveal.
test('first-run "New here?" tour offer: every control ≥44×44', async ({ page }) => {
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: false, seenFull: false } }))
  await expect(page.locator('[data-tour="guide-offer"]')).toBeVisible({ timeout: 5_000 })
  const small = await offenders(page, '[data-tour="guide-offer"]')
  expect(small, `Tour-offer controls under ${MIN}px:\n${small.join('\n')}`).toEqual([])
})
