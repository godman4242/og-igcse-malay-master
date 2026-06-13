// E2E for "study from a recording" (Phase 1, free on-device Whisper). An uploaded or
// recorded clip feeds the SAME reveal-gated reader as a digital PDF / photo — the
// gloss → FSRS core is untouched (it's just another producer of the {pages} shape).
// Plus a GO WILD pass ([[feedback_go_wild_smoke_test]]).
//
// Fixtures (asr-clean-malay.wav / asr-clean-english.wav / asr-silent.wav /
// asr-ground-truth.json) are generated + model-validated by scripts/gen-asr-fixtures.mjs
// (Malay 100% / English 87.5% word accuracy via scripts/asr-accuracy-harness.mjs).
//
// Transcription runs the real Whisper ONNX in the browser — a cold run loads the
// self-hosted model (~322 MB) + ORT WASM, so these tests raise the per-test timeout.
//
// Run: npx playwright test audio-transcribe --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)
const groundTruth = JSON.parse(readFileSync(fx('asr-ground-truth.json'), 'utf8'))

// ASR runs against the PRODUCTION PREVIEW server (:4173), not dev — ONNX Runtime's
// wasm glue is served from /public (Vite dev can't import it) and the offline test
// needs the built service worker. See the webServer note in playwright.config.js.
const PREVIEW = 'http://localhost:4173'
const reader = (p = '') => `${PREVIEW}/pdf-reader${p}`

const fileInput = (page) => page.locator('input[type=file]').first()

test.beforeEach(async ({ page }) => {
  await page.goto(reader(), { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
})

test('recording of clear Malay → readable, tappable transcript (F1, Q-ACC)', async ({ page }) => {
  test.setTimeout(180_000)
  await fileInput(page).setInputFiles(fx('asr-clean-malay.wav'))
  // Progress UI appears (one-time model download / decode / transcribe)…
  await expect(page.getByText(/transcrib|speech model|reading your audio/i)).toBeVisible()
  // …then resolves into reader text with the expected content word tappable.
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 150_000 })

  // Q-ACC: ≥85% of ground-truth content words present in the rendered reflow.
  const rendered = (await page.getByTestId('reader-reflow').innerText()).toLowerCase()
  const words = groundTruth.ms.toLowerCase().replace(/[.,]/g, '').split(/\s+/)
  const hit = words.filter((w) => rendered.includes(w)).length
  expect(hit / words.length).toBeGreaterThanOrEqual(0.85)

  // The transcript feeds the SAME reader: tokens carry data-token-i, so the
  // selection / reveal-gated gloss / FSRS-add path engages with no ASR-specific code.
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
})
