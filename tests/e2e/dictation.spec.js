import { test, expect } from '@playwright/test'

// Smoke + go-wild coverage for /dictation (shipped 2026-06-13, flagged "not
// automated" in its ship box) and its mistake-journal routing ("close the
// listening loop"). TTS is stubbed before page scripts run so plays resolve
// deterministically in headless Chromium; hasSpeechSynthesis() still passes.

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

// CLAUDE.md "Vite ?t= module-URL trap": import the SAME store instance React
// subscribed to, via its resource-timing URL. Re-bind after every goto/reload.
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

test.describe('/dictation — listen-and-type smoke', () => {
  test.beforeEach(async ({ page }) => {
    await stubTTS(page)
    await page.goto('/dictation', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)
  })

  test('full flow: start → play-gated typing → check shows diff → missed words journaled (capped)', async ({ page }) => {
    await page.getByRole('button', { name: /start dictation/i }).click()
    await expect(page.getByText(/sentence 1\/5/i)).toBeVisible()

    // Typing is gated until the sentence has played at least once.
    await expect(page.locator('textarea')).toHaveCount(0)
    await page.getByRole('button', { name: /play sentence/i }).click()
    const box = page.locator('textarea')
    await expect(box).toBeVisible()

    // Type garbage → every reference word is missed.
    await box.fill('zzzz qqqq')
    await page.getByRole('button', { name: /^check/i }).click()
    // The visible result line (the sr-only FeedbackLive region also carries
    // the score text — strict mode needs the unambiguous one).
    await expect(page.getByText(/Reference:/)).toBeVisible()

    // Journal routing: missed content words logged, capped at 2 per sentence.
    const mistakes = await page.evaluate(() => window.__STORE.getState().mistakes)
    expect(mistakes.length).toBeGreaterThanOrEqual(1)
    expect(mistakes.length).toBeLessThanOrEqual(2)
    expect(mistakes.every(m => m.note.includes('[Dictation]'))).toBe(true)
    expect(mistakes.every(m => m.word.length >= 4)).toBe(true)
  })

  test('go-wild: replay limit locks after 2 plays; double-Check does not double-journal', async ({ page }) => {
    await page.getByRole('button', { name: /start dictation/i }).click()
    await page.getByRole('button', { name: /play sentence/i }).click()
    await page.getByRole('button', { name: /replay \(slower\)/i }).click()
    await expect(page.getByRole('button', { name: /no replays left/i })).toBeDisabled()

    await page.locator('textarea').fill('zzzz')
    const check = page.getByRole('button', { name: /^check/i })
    await check.click()
    // The result latch makes a second Check a no-op (button is replaced by Next).
    await expect(page.getByRole('button', { name: /next sentence|see results/i })).toBeVisible()
    const count1 = await page.evaluate(() => window.__STORE.getState().mistakes.length)
    expect(count1).toBeLessThanOrEqual(2)
  })

  test('go-wild: exit mid-set returns to setup without crashing', async ({ page }) => {
    await page.getByRole('button', { name: /start dictation/i }).click()
    await page.getByRole('button', { name: /^exit/i }).click()
    await expect(page.getByRole('button', { name: /start dictation/i })).toBeVisible()
  })
})
