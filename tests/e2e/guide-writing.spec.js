// Phase 3c T14 — the Writing Analyzer deep-dive Full Page Guide. The header ▶
// "Tour this page" now works on /writing: a centered intro, then an arrow
// pointing at each landing-state control (Try-a-sample CTA, language toggle,
// format card, the composer textarea, the Analyze button) with a plain-English
// "what it does + example".
//
// Writing is a normal page at LANDING — theater mode engages only while DRAFTING
// (the textarea is focused AND non-empty), so on arrival the header is visible and
// the deep-dive entry is the standard HEADER ▶. Every anchor sits on a control that
// mounts at landing: the language toggle, format card, textarea and Analyze button
// all render when lang !== 'templates' (the default — a fresh store seeds
// studyLang 'ms' → lang 'malay'); the "Try a sample" CTA renders while the composer
// is still empty.
//
// Two proofs:
//  A) the guide launches from the header ▶, shows the intro, and the FIRST
//     anchored step (the sample CTA) draws its arrow.
//  B) every control anchor the steps point at physically exists (count 1), so
//     those arrows resolve (no hang-then-skip on a missing node).
//
// Run solo:
//   npx playwright test guide-writing --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

// Bind the LIVE store module instance (the one React subscribed to) — see the
// `?t=` module-URL trap note in CLAUDE.md. Required after every goto/reload.
async function bindStore(page) {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    window.__STORE = (await import(url)).default
  })
}

// Fresh state + suppress the first-run tour offer so only our deep-dive launches.
// No card seeding needed — the Writing Analyzer renders from built-in formats.
async function prep(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => {
    window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } })
  })
}

test('deep dive: ▶ on Writing launches and the first arrow draws', async ({ page }) => {
  await prep(page)
  await page.goto('/writing', { waitUntil: 'networkidle' })

  // Landing — the "Try a sample" CTA is up (composer empty, not drafting).
  await expect(page.locator('[data-guide="writing-sample"]')).toBeVisible()

  // No theater mode at landing → the normal header ▶ is the deep-dive entry.
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/writing analyzer/i) // the centered intro step

  // Advance off the intro → the first anchored step (sample CTA) draws an arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
  await expect(popover).toContainText(/Try a sample/i)
})

test('deep dive: every control anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/writing', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="writing-sample"]',
    '[data-guide="writing-lang"]',
    '[data-guide="writing-format"]',
    '[data-guide="writing-compose"]',
    '[data-guide="writing-analyze"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})
