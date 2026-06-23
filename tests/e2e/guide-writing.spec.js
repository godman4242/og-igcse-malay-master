// Phase 3c T14 — the Writing Analyzer deep-dive Full Page Guide. The header ▶
// "Tour this page" works on /writing: a centered intro, a centered "Try a sample"
// card, then an arrow pointing at each always-mounted control (language toggle,
// format card, the composer textarea, the Analyze button) with a plain-English
// "what it does + example".
//
// Empty-vs-draft robustness (2026-06-23): the "Try a sample" CTA renders ONLY while
// the composer is empty (showSampleCta = !text && !results), so a returning user
// with a draft/results has no such node. Anchoring the sample step at it used to
// fast-skip the step for those users (guideController drops a missing anchor). Fix:
// the sample is a centered arrow:'none' card — it renders in ANY composer state, so
// the tour skips nothing whether the composer is empty or holds a draft. The first
// ARROW therefore draws on the always-present language toggle.
//
// Writing is a normal page at LANDING — theater mode engages only while DRAFTING
// (the textarea is focused AND non-empty), so on arrival the header is visible and
// the deep-dive entry is the standard HEADER ▶.
//
// Three proofs:
//  A) the guide launches from the header ▶, shows the intro, then the centered
//     sample card (no arrow), then the FIRST ARROW on the language toggle.
//  B) every always-mounted control anchor the steps point at physically exists
//     (count 1), so those arrows resolve (no hang-then-skip on a missing node).
//  C) with a DRAFT already in the composer (CTA gone), the sample step STILL shows
//     — it no longer skips for a returning user.
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

test('deep dive: ▶ on Writing launches; sample is a centered card, the first arrow is the lang toggle', async ({ page }) => {
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

  // Next → the centered "Try a sample" card: shows, but draws NO arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toContainText(/Try a sample/i)
  await expect(page.locator('svg.guide-pointer')).toHaveCount(0)

  // Next → the language toggle: the FIRST anchored step draws its arrow.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toContainText(/English, Malay, or Templates/i)
  await expect(page.locator('svg.guide-pointer')).toBeVisible()
})

test('deep dive: every always-mounted control anchor exists so the later arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/writing', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="writing-lang"]',
    '[data-guide="writing-format"]',
    '[data-guide="writing-compose"]',
    '[data-guide="writing-analyze"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})

test('deep dive: the sample step shows even with a draft in the composer (no skip)', async ({ page }) => {
  await prep(page)
  await page.goto('/writing', { waitUntil: 'networkidle' })

  // Returning-user state: put a draft in the composer, then blur (click the page
  // heading) so theater mode — focused + non-empty — disengages and the header ▶
  // returns. A non-empty composer hides the "Try a sample" CTA (showSampleCta =
  // !text && !results) — the exact state where the OLD anchored sample step skipped.
  const composer = page.locator('[data-guide="writing-compose"]')
  await composer.fill('Saya suka belajar Bahasa Melayu pada setiap hari.')
  await page.getByRole('heading', { name: /Writing Analyzer/i }).click() // blur the textarea
  await expect(page.locator('[data-guide="writing-sample"]')).toHaveCount(0) // CTA gone

  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText(/writing analyzer/i) // intro

  // Advance off the intro — the sample step MUST still render (centered card),
  // not skip straight to the language toggle.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toContainText(/Try a sample/i)
})
