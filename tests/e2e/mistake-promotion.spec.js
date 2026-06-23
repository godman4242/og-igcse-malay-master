import { test, expect } from '@playwright/test'

// Ported from /tmp/igcse-verify/drive2.mjs (2026-05-27 verify session).
// Covers Phase 5 of the Zero-Waste Cognitive Engine plan: addMistake auto-
// promotes vocab/imbuhan Malay mistakes (severity ≥ med) into the FSRS deck,
// and MistakePromotedToast surfaces the moment.

// IMPORTANT — Vite "?t=…" module-URL trap.
// In dev, page.evaluate(() => import('/src/store/useStore.js')) gets a
// DIFFERENT instance than the one React subscribed to (Vite tags the
// React-side import with a ?t=<timestamp> cache-buster). Mutating the
// detached instance updates state but never triggers a React re-render —
// so the toast never appears and assertions silently fail. Workaround:
// pull the live URL out of performance.getEntriesByType('resource') and
// dynamic-import THAT URL. See CLAUDE.md "## E2E tests".
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

async function addMistake(page, payload) {
  return page.evaluate(m => window.__STORE.getState().addMistake(m), payload)
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

test.describe('Phase 5 — mistake → FSRS promotion toast', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('Malay vocab mistake (severity med) promotes and surfaces both toasts', async ({ page }) => {
    const result = await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'ms',
      category: 'vocab', severity: 'med',
      word: 'sebab', correct: 'reason', given: 'kerana',
      surface: 'Saya tidak tahu sebab itu.',
    })
    expect(result.added).toBeTruthy()
    expect(result.added.word).toBe('sebab')
    expect(result.promotedCard).toBeTruthy()
    expect(result.promotedCard.m).toBe('sebab')

    const promoted = page.getByRole('status').filter({ hasText: 'Added to your review deck' })
    await expect(promoted).toBeVisible()
    // Both the legacy MistakeToast and the new MistakePromotedToast use
    // role="status"; they should coexist on a triggering mistake.
    expect(await page.getByRole('status').count()).toBeGreaterThanOrEqual(2)
  })

  test('Open deck CTA navigates to /study', async ({ page }) => {
    await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'ms',
      category: 'vocab', severity: 'med',
      word: 'sebab', correct: 'reason',
      surface: 'Saya tidak tahu sebab itu.',
    })
    const openBtn = page.getByRole('button', { name: /open deck/i })
    await expect(openBtn).toBeVisible()
    await openBtn.click()
    await expect(page).toHaveURL(/\/study$/)
  })

  test('Dismiss button hides the promoted toast', async ({ page }) => {
    await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'ms',
      category: 'vocab', severity: 'med',
      word: 'sebab', correct: 'reason',
      surface: 'Saya tidak tahu sebab itu.',
    })
    const promoted = page.getByRole('status').filter({ hasText: 'Added to your review deck' })
    await expect(promoted).toBeVisible()
    await promoted.getByRole('button', { name: /dismiss/i }).click()
    // Component unmounts after EXIT_MS + 100 (≈320ms); allow a generous margin.
    await expect(promoted).toHaveCount(0, { timeout: 2_000 })
  })

  test('Duplicate within 24h does not promote again', async ({ page }) => {
    const first = await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'ms',
      category: 'vocab', severity: 'med',
      word: 'sebab', correct: 'reason',
      surface: 'Saya tidak tahu sebab itu.',
    })
    expect(first.promotedCard).toBeTruthy()

    const dup = await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'ms',
      category: 'vocab', severity: 'med',
      word: 'sebab', correct: 'reason',
      surface: 'Saya tidak tahu sebab itu.',
    })
    expect(dup.added).toBeFalsy()
    expect(dup.bumped).toBeTruthy()
    expect(dup.promotedCard).toBeFalsy()
  })

  test('Low-severity Malay vocab is logged but not promoted', async ({ page }) => {
    const result = await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'ms',
      category: 'vocab', severity: 'low',
      word: 'untuk', correct: 'for',
      surface: 'Hadiah ini untuk awak.',
    })
    expect(result.added).toBeTruthy()
    expect(result.promotedCard).toBeFalsy()
    // No emerald promotion toast should mount.
    await expect(page.getByRole('status').filter({ hasText: 'Added to your review deck' })).toHaveCount(0)
  })

  // v34 (True English study mode): English vocab mistakes auto-promote too —
  // canAutoPromoteMistake('en','vocab') === true (useStore.js). The promoted
  // card carries lang:'en' (promoteMistakeToCard) so an English learner reviews
  // their missed English word with the correct gloss direction.
  test('English vocab mistake promotes to a lang:en FSRS card (v34)', async ({ page }) => {
    const result = await addMistake(page, {
      type: 'vocab', source: 'e2e', language: 'en',
      category: 'vocab', severity: 'med',
      word: 'because', correct: 'kerana',
      surface: 'I am happy becuase the sun is out.',
    })
    expect(result.added).toBeTruthy()
    expect(result.promotedCard).toBeTruthy()
    expect(result.promotedCard.m).toBe('because')
    expect(result.promotedCard.lang).toBe('en')
    await expect(page.getByRole('status').filter({ hasText: 'Added to your review deck' })).toBeVisible()
  })

  // The OTHER half of the rule: English has no imbuhan, so a NON-vocab English
  // mistake (e.g. tense) is logged but NOT promoted — the "English: vocab only"
  // gate in canAutoPromoteMistake.
  test('English non-vocab mistake (tense) is logged but not promoted', async ({ page }) => {
    const result = await addMistake(page, {
      type: 'grammar', source: 'e2e', language: 'en',
      category: 'tense', severity: 'med',
      word: 'goed', correct: 'went',
      surface: 'Yesterday I goed to school.',
    })
    expect(result.added).toBeTruthy()
    expect(result.promotedCard).toBeFalsy()
    await expect(page.getByRole('status').filter({ hasText: 'Added to your review deck' })).toHaveCount(0)
  })
})
