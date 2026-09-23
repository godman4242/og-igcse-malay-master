/* global process */
// Enforced CSP guard. vercel.json's Content-Security-Policy is ENFORCED (2026-09-23), and
// `vite preview` serves those exact headers (vite.config.js → PROD_HEADERS), so this runs every
// route and the worker-heavy OCR path under the real policy. A violation here would otherwise
// first show up as a silently broken feature in production. Runs on PREVIEW (:4173), not dev.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_META } from '../../src/lib/routeMeta.js'

// E2E_PREVIEW_URL: point at another preview port when something else squats on :4173 locally.
const PREVIEW = process.env.E2E_PREVIEW_URL || 'http://localhost:4173'
const fx = (f) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', f)

async function watchViolations(page) {
  const seen = []
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) =>
    console.error(`CSPV ${e.effectiveDirective} blocked=${e.blockedURI} src=${e.sourceFile}`)))
  page.on('console', (m) => { if (/CSPV|Content Security Policy/.test(m.text())) seen.push(m.text().slice(0, 200)) })
  return seen
}

test('preview serves the enforced CSP and Permissions-Policy from vercel.json', async ({ request }) => {
  const res = await request.get(`${PREVIEW}/`)
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'")
  expect(res.headers()['content-security-policy-report-only']).toBeUndefined()
  expect(res.headers()['permissions-policy']).toContain('microphone=(self)')
})

test('every route renders with zero CSP violations', async ({ page }) => {
  test.setTimeout(180_000)
  const seen = await watchViolations(page)
  for (const route of Object.keys(ROUTE_META).filter((r) => r.startsWith('/'))) {
    await page.goto(`${PREVIEW}${route}`, { waitUntil: 'networkidle' })
  }
  expect(seen).toEqual([])
})

test('photo OCR (Tesseract worker + wasm) works with zero CSP violations', async ({ page }) => {
  test.setTimeout(180_000) // cold Tesseract WASM is slow
  const seen = await watchViolations(page)
  await page.goto(`${PREVIEW}/pdf-reader`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Maybe later|Dismiss/i }).first().click({ timeout: 2500 }).catch(() => {})
  await page.locator('input[type=file]').first().setInputFiles(fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i).first()).toBeVisible({ timeout: 150_000 })
  expect(seen).toEqual([])
})
