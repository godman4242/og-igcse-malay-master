// Phase 3c T14 — the Writing Analyzer deep-dive Full Page Guide, MICRO-GUIDE STYLE
// (2026-06-24, UDL + ADD — spec: docs/superpowers/specs/2026-06-24-micro-guide-udl-
// style.md): one idea per step, ≤~14-word bodies, no example line, ≤5 steps. The
// header ▶ "Tour this page" works on /writing.
//
// The flow setup → write → analyze → improve is five tight steps: a centered intro,
// an arrow on the always-present language toggle (with the format folded into its
// copy), the composer, the Analyze button, then a centered "answer a task + improve
// it" card. The CONDITIONAL controls are never anchored — the "Try a sample" CTA
// (showSampleCta = lang!=='templates' && !text && !results) is folded inline into
// the compose step's cue, and the task picker + "Improve your answer" ReattemptPanel
// (both render only in some states) are taught by the final centered card. So the
// tour skips nothing whether the composer is empty or holds a returning user's draft.
//
// Writing is a normal page at LANDING — theater mode engages only while DRAFTING
// (the textarea is focused AND non-empty), so on arrival the header ▶ is the entry.
//
// Three proofs:
//  A) the guide launches from the header ▶, shows the centered intro (no arrow),
//     then walks every step IN ORDER to a clean finish — the first arrow draws on
//     the always-present language toggle.
//  B) every always-mounted control the steps anchor (lang, compose, analyze) exists
//     (count 1), so those arrows resolve (no hang-then-skip on a missing node).
//  C) with a DRAFT already in the composer (the sample CTA gone), the whole tour
//     still launches and reaches its final centered card — no dead-end, no skip.
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

// The five micro steps, in order. Partial matches avoid the curly apostrophe.
const TITLES = [
  /Tour: writing/i,              // 0 — centered intro (no arrow)
  /Tell it what you/i,           // 1 — anchored lang toggle (first arrow)
  /Write or paste your essay/i,  // 2 — anchored composer
  /Get your band/i,              // 3 — anchored Analyze button
  /Answer a task/i,              // 4 — centered improve card (last)
]

test('deep dive: ▶ on Writing launches; centered intro, then the first arrow on the lang toggle, and walks to a clean finish', async ({ page }) => {
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

  // Step 0: the centered intro draws NO arrow.
  await expect(popover).toContainText(TITLES[0])
  await expect(page.locator('svg.guide-pointer')).toHaveCount(0)

  // Step 1: the FIRST anchored step draws its arrow on the always-present lang toggle.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toContainText(TITLES[1])
  await expect(page.locator('svg.guide-pointer')).toBeVisible()

  // Walk the rest IN ORDER — reaching the last card proves nothing skips.
  for (let i = 2; i < TITLES.length; i++) {
    await popover.getByRole('button', { name: /Next/i }).click()
    await expect(popover, `step ${i}`).toContainText(TITLES[i])
  }
  // Finish cleanly — the tour completes, never dead-ends.
  await popover.getByRole('button', { name: /Done/i }).click()
  await expect(popover).toHaveCount(0)
})

test('deep dive: every always-mounted control the steps anchor exists so the arrows resolve', async ({ page }) => {
  await prep(page)
  await page.goto('/writing', { waitUntil: 'networkidle' })

  for (const anchor of [
    '[data-guide="writing-lang"]',
    '[data-guide="writing-compose"]',
    '[data-guide="writing-analyze"]',
  ]) {
    await expect(page.locator(anchor), anchor).toHaveCount(1)
  }
})

test('deep dive: with a draft in the composer (sample CTA gone) the whole tour still reaches its final card', async ({ page }) => {
  await prep(page)
  await page.goto('/writing', { waitUntil: 'networkidle' })

  // Returning-user state: put a draft in the composer, then blur (click the page
  // heading) so theater mode — focused + non-empty — disengages and the header ▶
  // returns. A non-empty composer hides the "Try a sample" CTA (showSampleCta =
  // !text && !results) — the exact state where an anchored conditional step would
  // skip-hang. The micro tour never anchors a conditional node, so it must survive.
  const composer = page.locator('[data-guide="writing-compose"]')
  await composer.fill('Saya suka belajar Bahasa Melayu pada setiap hari.')
  await page.getByRole('heading', { name: /Writing Analyzer/i }).click() // blur the textarea
  await expect(page.locator('[data-guide="writing-sample"]')).toHaveCount(0) // CTA gone

  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Walk every step IN ORDER to the final centered card — no skip, no dead-end.
  await expect(popover).toContainText(TITLES[0])
  for (let i = 1; i < TITLES.length; i++) {
    await popover.getByRole('button', { name: /Next/i }).click()
    await expect(popover, `step ${i}`).toContainText(TITLES[i])
  }
  await popover.getByRole('button', { name: /Done/i }).click()
  await expect(popover).toHaveCount(0)
})
