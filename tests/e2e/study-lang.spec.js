import { test, expect } from '@playwright/test'

// True English study mode (v34): the global studyLang switch persists, the English
// starter-deck seed creates an English-only deck, the Study page renders an English
// session without crashing, and Malay/English decks never mix.
// Spec/plan: docs/superpowers/{specs,plans}/2026-06-14-true-english-study-mode*.

// CLAUDE.md "Vite ?t= module-URL trap": import the SAME store instance React
// subscribed to, via its resource-timing URL. Re-bind after every goto/reload.
async function bindStore(page) {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
  })
}

// Fresh state + suppress the first-run tour offer (it can intercept clicks).
async function reset(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
}

test('studyLang switch persists across reload', async ({ page }) => {
  await reset(page)
  await page.goto('/settings')
  const group = page.getByRole('group', { name: 'Study language' })
  await group.getByRole('button', { name: /English/ }).click()
  await expect(group.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  const group2 = page.getByRole('group', { name: 'Study language' })
  await expect(group2.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'true')
})

test('English empty-state seeds an English-only deck; Study renders; no MS/EN mixing', async ({ page }) => {
  await reset(page)
  await page.evaluate(() => window.__STORE.setState({ studyLang: 'en' }))

  await page.goto('/')
  const seedBtn = page.getByRole('button', { name: /Add the starter set/i })
  await expect(seedBtn).toBeVisible()
  await seedBtn.click()
  await expect(seedBtn).toBeHidden({ timeout: 15000 })

  // Direct no-mixing assertion: the seed created English cards only.
  await bindStore(page)
  const counts = await page.evaluate(() => {
    const cs = window.__STORE.getState().cards
    return { en: cs.filter((c) => c.lang === 'en').length, ms: cs.filter((c) => c.lang === 'ms').length }
  })
  expect(counts.en).toBeGreaterThan(100)
  expect(counts.ms).toBe(0)

  // The English study session renders without an infinite-render crash.
  await page.goto('/study')
  await expect(page.locator('body')).not.toContainText('Maximum update depth')

  // Flip to Malay: the English seed card is gone (English cards don't bleed into Malay).
  await bindStore(page)
  await page.evaluate(() => window.__STORE.setState({ studyLang: 'ms' }))
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Add the starter set/i })).toHaveCount(0)
})

// F5 (Phase 1.5): with studyLang='en' the Import page glosses an ENGLISH source
// word into Malay (English→Malay seed) and files it as an English-deck card —
// never a Malay card, never an English→English miss.
test('English-source Import builds an English-deck card (F5)', async ({ page }) => {
  await reset(page)
  await page.evaluate(() => window.__STORE.setState({ studyLang: 'en' }))

  await page.goto('/import')
  await page.getByPlaceholder(/Paste English text/i).fill('about house school')
  await page.getByRole('button', { name: /^Process$/ }).click()

  // The English headword resolves against the reversed seed (English→Malay).
  await page.getByRole('button', { name: 'about', exact: true }).click()
  await page.getByRole('button', { name: /Add \d+ cards/ }).click()

  await bindStore(page)
  const card = await page.evaluate(() =>
    window.__STORE.getState().cards.find((c) => c.m === 'about'))
  expect(card).toBeTruthy()
  expect(card.lang).toBe('en')
  expect(card.e).toBe('tentang') // Malay gloss — not an English→English no-op

  // No Malay card leaked in from the English-source import (no MS/EN mixing).
  const msCount = await page.evaluate(() =>
    window.__STORE.getState().cards.filter((c) => c.lang === 'ms').length)
  expect(msCount).toBe(0)
})
