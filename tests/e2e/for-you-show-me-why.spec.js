import { test, expect } from '@playwright/test'

// Covers the Direction B "show me why" feature on /for-you:
// - WhyLine on Picked/Keep-going items
// - MixSteer "Tune your focus" preset chooser (preset persists across reload)
// - CompetencePanel "Where you stand"
// - Empty deck: only GetStarted card, no why/steer/panel

// IMPORTANT — Vite "?t=…" module-URL trap.
// In dev, page.evaluate(() => import('/src/store/useStore.js')) gets a
// DIFFERENT instance than the one React subscribed to (Vite tags the
// React-side import with a ?t=<timestamp> cache-buster). Mutating the
// detached instance updates state but never triggers a React re-render.
// Workaround: pull the live URL out of performance.getEntriesByType('resource')
// and dynamic-import THAT URL. Re-bind after every goto/reload.
// See CLAUDE.md "## E2E tests" + tests/e2e/mistake-promotion.spec.js.
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('For-You "show me why"', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('empty deck shows only Get Started — no why/steer/panel', async ({ page }) => {
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await expect(page.getByText('Your home fills up as you learn')).toBeVisible()
    await expect(page.getByText('Where you stand')).toHaveCount(0)
    await expect(page.getByText('Tune your focus')).toHaveCount(0)
  })

  test('seeded deck shows reason, steer and competence panel; preset persists', async ({ page }) => {
    await page.goto('/for-you', { waitUntil: 'networkidle' })
    await bindStore(page)

    // Seed a few Malay cards so the "Picked for you" shelf becomes visible
    // (buildPicked: hidden = cards.length === 0).
    await page.evaluate(() => {
      const store = window.__STORE.getState()
      store.addCards([
        { m: 'buku', e: 'book', t: 'General', lang: 'ms' },
        { m: 'meja', e: 'table', t: 'General', lang: 'ms' },
        { m: 'kerusi', e: 'chair', t: 'General', lang: 'ms' },
      ])
    })

    // Reload so ForYou re-snapshots (AnimatedRoutes remounts on navigation;
    // a reload on the same path also remounts). Re-bind after reload (new ?t= URL).
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)

    // The "Picked for you" why-line: either weak-spot copy or the fallback
    // ("need to review" appears in the PICKED_FALLBACK string).
    // Both the shelf subtitle AND the WhyLine span can match the regex —
    // assert at least one is visible (the why text is surfaced, which is the
    // load-bearing assertion; strict-mode .toBeVisible() would fail on 2 nodes).
    await expect(
      page.getByText(/Built around your weak spots|need to review/).first()
    ).toBeVisible()

    // "Tune your focus" heading is visible (MixSteer — shown when deck is non-empty)
    await expect(page.getByText('Tune your focus')).toBeVisible()

    // "Where you stand" heading is visible (CompetencePanel)
    await expect(page.getByText('Where you stand')).toBeVisible()

    // Click "More writing" preset button
    await page.getByRole('button', { name: 'More writing' }).click()

    // Reload and re-navigate to /for-you; re-bind store after load
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)

    // The "More writing" button should now have aria-pressed="true" (persisted via studyMix store)
    await expect(
      page.getByRole('button', { name: 'More writing' })
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
