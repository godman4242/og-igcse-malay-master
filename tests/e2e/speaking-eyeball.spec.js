// Eyeball harness for the Speaking A+D polish (branch feat/friction-polish).
// Drives the real states and screenshots them in dark AND light:
//   PREP  — "Speak my answer" / "Type my answer" buttons + mic pre-prompt
//   RECORD (pure-type) — entered via "Type my answer", NO transcript card
//   RESULTS (typed) — band card shows "N words · typed"
//   RECORD (mic error) — the prominent red "Mic problem" card
//   RECORD (flicker loop-break) — silent ms-MY end→restart loop stops after
//     3 empty cycles and opens the type fallback
//
// Headless Chromium has no SpeechRecognition, so we inject a controllable stub
// (window.__SR_MODE) before the app loads. Shots → test-results/speaking/.
// Run: npx playwright test speaking-eyeball --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

const SHOT = (name) => `test-results/speaking/${name}.png`

// Inject a fake SpeechRecognition so hasSpeechRecognition() is true and we can
// force the failure paths the real ms-MY backend produces.
const STUB = () => {
  class FakeSR {
    start() {
      const mode = window.__SR_MODE
      if (mode === 'error') {
        setTimeout(() => this.onerror && this.onerror({ error: 'not-allowed' }), 40)
      } else if (mode === 'silent') {
        // Start then end instantly with NO results — the ms-MY silent failure
        // that drives the flicker loop-break in onend.
        setTimeout(() => this.onend && this.onend(), 40)
      }
      // mode === null/undefined: just sit "recording" forever (no events).
    }
    stop() { /* app sets _stopRequested; nothing to do */ }
  }
  window.SpeechRecognition = FakeSR
  window.webkitSpeechRecognition = FakeSR
}

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    const mod = await import(url)
    window.__STORE = mod.default
  })
}

async function gotoSpeaking(page, { theme, srMode = null } = {}) {
  await page.addInitScript(STUB)
  await page.addInitScript(m => { window.__SR_MODE = m }, srMode)
  await page.goto('/speaking', { waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(t => window.__STORE.setState({ theme: t }), theme)
  // Open the first Malay topic (matched by its "~Ns" duration chip) → PREP.
  await page.locator('main button').filter({ hasText: /~\d+s/ }).first().click()
  await expect(page.getByRole('button', { name: /Bercakap jawapan|Speak my answer/ })).toBeVisible()
}

for (const theme of ['dark', 'light']) {
  test(`Speaking states — ${theme}`, async ({ page }) => {
    // 1. PREP — Speak/Type buttons + mic pre-prompt
    await gotoSpeaking(page, { theme })
    await expect(page.getByRole('button', { name: /Taip jawapan saya|Type my answer/ })).toBeVisible()
    await page.screenshot({ path: SHOT(`prep-${theme}`), fullPage: true })

    // 2. RECORD pure-type — no transcript card
    await page.getByRole('button', { name: /Taip jawapan saya|Type my answer/ }).click()
    await expect(page.getByText(/Taip jawapan anda|Type your answer instead/)).toBeVisible()
    await expect(page.getByText('Live transcript')).toHaveCount(0)
    await page.screenshot({ path: SHOT(`record-puretype-${theme}`), fullPage: true })

    // 3. RESULTS typed band card — "N words · typed"
    await page.locator('textarea').fill(
      'Pada pendapat saya, telefon pintar sangat berguna kerana ia membantu pelajar belajar. ' +
      'Selain itu, kita boleh berhubung dengan keluarga. Walau bagaimanapun, ia juga ada keburukan.')
    await page.getByRole('button', { name: /Nilai jawapan|Grade my answer/ }).click()
    await expect(page.getByText(/words · typed/)).toBeVisible()
    await page.screenshot({ path: SHOT(`results-typed-${theme}`), fullPage: true })

    // 4. RECORD mic-error card
    await gotoSpeaking(page, { theme, srMode: 'error' })
    await page.getByRole('button', { name: /Bercakap jawapan|Speak my answer/ }).click()
    await expect(page.getByText(/Masalah mikrofon|Mic problem/)).toBeVisible()
    await page.screenshot({ path: SHOT(`record-micerror-${theme}`), fullPage: true })

    // 5. RECORD flicker loop-break → type fallback
    await gotoSpeaking(page, { theme, srMode: 'silent' })
    await page.getByRole('button', { name: /Bercakap jawapan|Speak my answer/ }).click()
    await expect(page.getByText(/tidak dapat mengesan suara|can't pick up your voice/)).toBeVisible()
    await expect(page.getByText(/Taip jawapan anda|Type your answer instead/)).toBeVisible()
    await page.screenshot({ path: SHOT(`record-flickerbreak-${theme}`), fullPage: true })
  })
}
