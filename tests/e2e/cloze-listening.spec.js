import { test, expect } from '@playwright/test'

// Smoke + go-wild coverage for /cloze-listening (review feature #10) and its
// mistake-journal routing. Same TTS stub + bindStore patterns as
// dictation.spec.js (CLAUDE.md "Vite ?t= module-URL trap").

async function stubTTS(page) {
  await page.addInitScript(() => {
    window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text }
    }
    // window.speechSynthesis is a getter-only accessor in Chromium — plain
    // assignment silently no-ops. defineProperty shadows it on the instance.
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: u => { setTimeout(() => { if (u.onend) u.onend() }, 30) },
        cancel: () => {},
        getVoices: () => [],
      },
    })
  })
}

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
  })
}

async function playFillCheck(page, fillWith) {
  await page.getByRole('button', { name: /play sentence/i }).click()
  const inputs = page.locator('input[aria-label^="Gap"]')
  await expect(inputs.first()).toBeEnabled()
  const n = await inputs.count()
  expect(n).toBeGreaterThanOrEqual(1)
  expect(n).toBeLessThanOrEqual(2)
  for (let i = 0; i < n; i++) await inputs.nth(i).fill(fillWith)
  await page.getByRole('button', { name: /^check/i }).click()
  return n
}

test.describe('/cloze-listening — listen-and-fill-gaps smoke', () => {
  test.beforeEach(async ({ page }) => {
    await stubTTS(page)
    await page.goto('/cloze-listening', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)
  })

  test('wrong gaps show the correct answer and land in the mistake journal', async ({ page }) => {
    await page.getByRole('button', { name: /start cloze listening/i }).click()
    await expect(page.getByText(/sentence 1\/5/i)).toBeVisible()

    // Gap inputs are play-gated.
    await expect(page.locator('input[aria-label^="Gap"]').first()).toBeDisabled()

    const gapCount = await playFillCheck(page, 'zzzz')
    // Per-gap feedback shows what was typed → the correct answer.
    await expect(page.getByText(/zzzz →/).first()).toBeVisible()

    const mistakes = await page.evaluate(() => window.__STORE.getState().mistakes)
    expect(mistakes.length).toBe(gapCount)
    expect(mistakes.every(m => m.note.includes('[Cloze listening]'))).toBe(true)
    expect(mistakes.every(m => m.given === 'zzzz')).toBe(true)
  })

  test('completing a set reaches the results screen and logs one Listening activity', async ({ page }) => {
    await page.getByRole('button', { name: /start cloze listening/i }).click()
    for (let s = 0; s < 5; s++) {
      await playFillCheck(page, 'zzzz')
      await page.getByRole('button', { name: /next sentence|see results/i }).click()
    }
    await expect(page.getByText(/cloze listening complete/i)).toBeVisible()
    await expect(page.getByText(/%/).first()).toBeVisible()

    // The #7 paper-balance hook: exactly one Listening unit for the whole set.
    const activity = await page.evaluate(() => window.__STORE.getState().skillActivity)
    const todayTotals = Object.values(activity).reduce((a, day) => a + (day.listening || 0), 0)
    expect(todayTotals).toBe(1)
  })

  test('go-wild: exit mid-set returns to setup without crashing', async ({ page }) => {
    await page.getByRole('button', { name: /start cloze listening/i }).click()
    await page.getByRole('button', { name: /^exit/i }).click()
    await expect(page.getByRole('button', { name: /start cloze listening/i })).toBeVisible()
  })
})
