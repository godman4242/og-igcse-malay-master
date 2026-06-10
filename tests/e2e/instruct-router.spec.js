// E2E for the multi-provider instruct router: users register their OWN
// OpenRouter / Gemini / Ollama key; the unchanged instruct.js seam auto-picks
// and auto-switches on quota with an honest toast. Locks the spec bars:
// - a Gemini-ONLY key lights the Option F ladder (the seam gates feature-wide,
//   not OpenRouter-specific), via the NATIVE endpoint + x-goog-api-key header
// - primary 429 → fallback succeeds + throttled switch toast → /settings#byok
// - no keys → the shipped English reveal, zero instruct calls (no paywall)
// - Settings: per-provider cards, garbage keys, spam, picker only at ≥2,
//   #byok deep-link, Ollama card desktop-only (hidden at 390×844)
// Spec: docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md
//
// Run SOLO: npx playwright test instruct-router --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

// gtx mock (the English rung / degrade target): q=<text> → "EN-<text>".
function mockTranslate(page) {
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', async (r) => {
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })
}

// OpenRouter mock. status: 200 (reply) | 429 | abort. Counts completions calls.
function mockOpenRouter(page, { status = 200, calls } = {}) {
  page.route('https://openrouter.ai/**', async (r) => {
    const url = r.request().url()
    if (url.includes('/api/v1/key')) {
      const auth = r.request().headers()['authorization'] || ''
      return r.fulfill(auth.includes('garbage')
        ? { status: 401, body: 'Unauthorized' }
        : { contentType: 'application/json', body: JSON.stringify({ data: { label: 'k' } }) })
    }
    if (url.includes('/api/v1/models')) {
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'test/instruct-model', pricing: { prompt: '0', completion: '0' }, context_length: 8192 }] }),
      })
    }
    if (url.includes('/api/v1/chat/completions')) {
      if (calls) calls.n += 1
      if (status === 'abort') return r.abort()
      if (status !== 200) return r.fulfill({ status, body: 'rate limited' })
      const body = JSON.parse(r.request().postData() || '{}')
      const sentence = (body.messages || []).find((m) => m.role === 'user')?.content || ''
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: `Ayat mudah ini ialah ${sentence}` } }] }),
      })
    }
    return r.abort()
  })
}

// Gemini NATIVE-endpoint mock. Asserts the key travels in the x-goog-api-key
// header (never the URL) on every request. status: 200 | 429 | abort.
function mockGemini(page, { status = 200, calls, headerSeen } = {}) {
  page.route('https://generativelanguage.googleapis.com/**', async (r) => {
    const url = r.request().url()
    const headers = r.request().headers()
    if (headerSeen && headers['x-goog-api-key']) headerSeen.keys.push(headers['x-goog-api-key'])
    if (url.includes('key=')) return r.fulfill({ status: 500, body: 'KEY IN URL — forbidden by spec' })
    if (url.includes(':generateContent')) {
      if (calls) calls.n += 1
      if (status === 'abort') return r.abort()
      if (status !== 200) return r.fulfill({ status, body: 'quota exceeded' })
      const body = JSON.parse(r.request().postData() || '{}')
      const sentence = (body.contents || []).find((c) => c.role === 'user')?.parts?.[0]?.text || ''
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: `Ayat mudah ini ialah ${sentence}` }] } }] }),
      })
    }
    // ListModels (verify + discovery)
    if ((headers['x-goog-api-key'] || '').includes('garbage')) return r.fulfill({ status: 400, body: 'API key not valid' })
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] }),
    })
  })
}

async function loadReflow(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const sentencesToggle = (page) => page.getByRole('button', { name: 'Sentences', exact: true })
const ladderCues = (page) => page.getByRole('button', { name: 'Get help with this sentence' })
const englishCues = (page) => page.getByRole('button', { name: 'Reveal English for this sentence' })
const switchToast = (page) => page.getByTestId('instruct-switch-toast')
const S1_MALAY = /Ayat mudah ini ialah Saya suka membaca buku/

// Seed keys BEFORE the app boots (adapters read localStorage at module load).
async function seedKeys(page, { openrouter, gemini } = {}) {
  await page.evaluate(({ openrouter, gemini }) => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-openrouter-key')
    localStorage.removeItem('igcse-gemini-key')
    localStorage.removeItem('igcse-ollama-url')
    localStorage.removeItem('igcse-ollama-model')
    localStorage.removeItem('igcse-instruct-preferred')
    if (openrouter) {
      localStorage.setItem('igcse-openrouter-key', openrouter)
      localStorage.setItem('igcse-openrouter-models', JSON.stringify({ ts: Date.now(), ids: ['test/instruct-model'] }))
    }
    if (gemini) {
      localStorage.setItem('igcse-gemini-key', gemini)
      localStorage.setItem('igcse-gemini-models', JSON.stringify({ ts: Date.now(), ids: ['gemini-3.5-flash'] }))
    }
  }, { openrouter, gemini })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('router in the PDF ladder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  })

  test('Gemini-ONLY key lights the ladder — native endpoint, key in header only', async ({ page }) => {
    const gem = { n: 0 }
    const headerSeen = { keys: [] }
    mockTranslate(page)
    mockGemini(page, { calls: gem, headerSeen })
    await seedKeys(page, { gemini: 'AIza-e2e-test' })
    await loadReflow(page, 'sentences-malay.pdf')
    await sentencesToggle(page).click()
    // The seam gates feature-wide: a Gemini key alone shows the help cue.
    await expect(ladderCues(page).first()).toBeVisible()
    await expect(englishCues(page)).toHaveCount(0)
    await ladderCues(page).first().click()
    await expect(page.getByText(S1_MALAY).first()).toBeVisible()
    expect(gem.n).toBe(1)
    expect(headerSeen.keys.every((k) => k === 'AIza-e2e-test')).toBe(true)
  })

  test('primary 429 → Gemini fallback succeeds + switch toast → AI settings; throttled on spam', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e))
    mockTranslate(page)
    mockOpenRouter(page, { status: 429 })
    mockGemini(page)
    await seedKeys(page, { openrouter: 'sk-or-e2e', gemini: 'AIza-e2e-test' })
    await loadReflow(page, 'sentences-malay.pdf')
    await sentencesToggle(page).click()
    await ladderCues(page).first().click()
    // The call still succeeds — via Gemini — and the toast names the switch.
    await expect(page.getByText(S1_MALAY).first()).toBeVisible()
    await expect(switchToast(page)).toBeVisible()
    await expect(switchToast(page)).toContainText(/OpenRouter.*switched to.*Gemini/)
    // Spam more reveals during the cooldown window: still exactly ONE toast.
    await ladderCues(page).first().click() // collapse… actually reveals next; spam a second sentence
    await ladderCues(page).first().click()
    await expect(switchToast(page)).toHaveCount(1)
    // The link lands on the providers section.
    await switchToast(page).getByRole('button', { name: 'AI settings →' }).click()
    await expect(page).toHaveURL(/\/settings#byok/)
    await expect(page.locator('#byok')).toBeInViewport()
    expect(errors).toHaveLength(0)
  })

  test('no keys → the shipped English reveal, ZERO instruct calls (no paywall)', async ({ page }) => {
    const or = { n: 0 }
    const gem = { n: 0 }
    mockTranslate(page)
    mockOpenRouter(page, { calls: or })
    mockGemini(page, { calls: gem })
    await seedKeys(page, {})
    await loadReflow(page, 'sentences-malay.pdf')
    await sentencesToggle(page).click()
    await expect(englishCues(page).first()).toBeVisible()
    await expect(ladderCues(page)).toHaveCount(0)
    await englishCues(page).first().click()
    await expect(page.getByText(/EN-Saya suka membaca buku/).first()).toBeVisible()
    expect(or.n).toBe(0)
    expect(gem.n).toBe(0)
  })

  test('GO WILD: both providers dead (offline) — degrade gracefully, no crash, no toast spam', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e))
    page.route('**/api/translate', (r) => r.abort())
    page.route('**/translate_a/single**', (r) => r.abort())
    mockOpenRouter(page, { status: 'abort' })
    mockGemini(page, { status: 'abort' })
    await seedKeys(page, { openrouter: 'sk-or-e2e', gemini: 'AIza-e2e-test' })
    await loadReflow(page, 'sentences-malay.pdf')
    await sentencesToggle(page).click()
    await ladderCues(page).first().click()
    await page.waitForTimeout(500)
    // All adapters failed → Option F's shipped degrade ran; app still alive.
    await expect(sentencesToggle(page)).toBeEnabled()
    await expect(switchToast(page)).toHaveCount(0) // a switch never happened — nothing succeeded
    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings — AI providers section (390×844)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await seedKeys(page, {})
    mockOpenRouter(page)
    mockGemini(page)
    await page.goto('/settings#byok', { waitUntil: 'networkidle' })
  })

  test('#byok deep-link scrolls the section into view; both key cards render; Ollama card hidden on phones', async ({ page }) => {
    await expect(page.locator('#byok')).toBeInViewport()
    await expect(page.getByText('OpenRouter key', { exact: true })).toBeVisible()
    await expect(page.getByText('Gemini key', { exact: true })).toBeVisible()
    await expect(page.getByTestId('ollama-advanced-card')).toHaveCount(0) // desktop-only
  })

  test('save → test (✓) → clear for both cards; garbage keys read ✗; spam-proof', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e))
    const section = page.locator('#byok')
    const cards = section.locator('div.mb-3').filter({ has: page.locator('input[type=password]') })
    const orCard = cards.first()
    const gemCard = cards.nth(1)

    // OpenRouter: save + auth-only test
    await orCard.locator('input').fill('sk-or-live')
    await orCard.getByRole('button', { name: 'Save' }).click()
    await expect(orCard.getByText('Saved on this device')).toBeVisible()
    await orCard.getByRole('button', { name: 'Test key' }).click()
    await expect(orCard.getByText('✓ Working')).toBeVisible()

    // Gemini: garbage key first (400 from ListModels), then a valid one
    await gemCard.locator('input').fill('AIza-garbage')
    for (let i = 0; i < 4; i++) await gemCard.getByRole('button', { name: 'Save' }).click() // spam Save
    await gemCard.getByRole('button', { name: 'Test key' }).click()
    await expect(gemCard.getByText('✗ Invalid or unreachable')).toBeVisible()
    await gemCard.locator('input').fill('AIza-live')
    await gemCard.getByRole('button', { name: 'Test key' }).click()
    await expect(gemCard.getByText('✓ Working')).toBeVisible()

    // Clear OpenRouter → its slot empties, Gemini's survives (independent slots)
    await orCard.getByRole('button', { name: 'Clear' }).click()
    const slots = await page.evaluate(() => ({
      or: localStorage.getItem('igcse-openrouter-key'),
      gem: localStorage.getItem('igcse-gemini-key'),
    }))
    expect(slots.or).toBe(null)
    expect(slots.gem).toBe('AIza-live')
    expect(errors).toHaveLength(0)
  })

  test('preferred-provider picker appears only at ≥2 configured and persists the choice', async ({ page }) => {
    const section = page.locator('#byok')
    const cards = section.locator('div.mb-3').filter({ has: page.locator('input[type=password]') })
    await expect(page.getByTestId('preferred-provider-picker')).toHaveCount(0) // 0 configured

    await cards.first().locator('input').fill('sk-or-live')
    await cards.first().getByRole('button', { name: 'Save' }).click()
    await expect(page.getByTestId('preferred-provider-picker')).toHaveCount(0) // 1 configured

    await cards.nth(1).locator('input').fill('AIza-live')
    await cards.nth(1).getByRole('button', { name: 'Save' }).click()
    const picker = page.getByTestId('preferred-provider-picker')
    await expect(picker).toBeVisible() // 2 configured
    await expect(picker.getByRole('button', { name: 'Auto (recommended)' })).toBeVisible()

    await picker.getByRole('button', { name: 'Gemini', exact: true }).click()
    expect(await page.evaluate(() => localStorage.getItem('igcse-instruct-preferred'))).toBe('gemini')
    // Back to Auto clears the slot
    await picker.getByRole('button', { name: 'Auto (recommended)' }).click()
    expect(await page.evaluate(() => localStorage.getItem('igcse-instruct-preferred'))).toBe(null)
  })

  test('keys NEVER enter the Zustand store or its persisted blob', async ({ page }) => {
    const section = page.locator('#byok')
    const cards = section.locator('div.mb-3').filter({ has: page.locator('input[type=password]') })
    await cards.first().locator('input').fill('sk-or-secret-xyz')
    await cards.first().getByRole('button', { name: 'Save' }).click()
    await cards.nth(1).locator('input').fill('AIza-secret-xyz')
    await cards.nth(1).getByRole('button', { name: 'Save' }).click()
    const leak = await page.evaluate(() => {
      const blob = localStorage.getItem('igcse-malay-store') || ''
      const state = JSON.stringify(window.__STORE?.getState?.() ?? {})
      return { blobLeak: blob.includes('secret-xyz'), stateLeak: state.includes('secret-xyz') }
    })
    expect(leak.blobLeak).toBe(false)
    expect(leak.stateLeak).toBe(false)
  })

  test('GO WILD: theme swap with the section open — light & dark screenshots', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e))
    const section = page.locator('#byok')
    const cards = section.locator('div.mb-3').filter({ has: page.locator('input[type=password]') })
    await cards.first().locator('input').fill('sk-or-live')
    await cards.first().getByRole('button', { name: 'Save' }).click()
    await cards.nth(1).locator('input').fill('AIza-live')
    await cards.nth(1).getByRole('button', { name: 'Save' }).click()
    await expect(page.getByTestId('preferred-provider-picker')).toBeVisible()
    await page.screenshot({ path: 'test-results/instruct-router/settings-dark.png', fullPage: true })
    await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
    await expect(page.getByTestId('preferred-provider-picker')).toBeVisible()
    await page.screenshot({ path: 'test-results/instruct-router/settings-light.png', fullPage: true })
    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings — Ollama advanced card (desktop viewport)', () => {
  test.use({ viewport: { width: 1024, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await seedKeys(page, {})
    await page.goto('/settings#byok', { waitUntil: 'networkidle' })
  })

  test('collapsed disclosure → Connect (auth-only /api/version) → model picker → configured', async ({ page }) => {
    page.route('http://localhost:11434/**', async (r) => {
      const url = r.request().url()
      if (url.endsWith('/api/version')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '0.9.0' }) })
      if (url.endsWith('/api/tags')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'qwen3:4b' }, { name: 'llama3.2:3b' }] }) })
      return r.abort()
    })
    const card = page.getByTestId('ollama-advanced-card')
    await expect(card).toBeVisible()
    // Collapsed by default — the setup note is hidden until opened.
    await expect(card.getByText(/ollama pull/)).toHaveCount(0)
    await card.getByRole('button', { name: /Advanced — local AI on your computer/ }).click()
    await expect(card.getByText(/OLLAMA_ORIGINS/)).toBeVisible()
    await card.getByRole('button', { name: 'Connect' }).click()
    await expect(card.getByText('✓ Connected')).toBeVisible()
    await card.locator('select').selectOption('llama3.2:3b')
    const slots = await page.evaluate(() => ({
      url: localStorage.getItem('igcse-ollama-url'),
      model: localStorage.getItem('igcse-ollama-model'),
    }))
    expect(slots.url).toBe('http://localhost:11434')
    expect(slots.model).toBe('llama3.2:3b')
  })

  test('unreachable Ollama reads ✗ honestly; garbage URL rejected; no crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e))
    page.route('http://localhost:11434/**', (r) => r.abort())
    const card = page.getByTestId('ollama-advanced-card')
    await card.getByRole('button', { name: /Advanced — local AI on your computer/ }).click()
    await card.getByRole('button', { name: 'Connect' }).click()
    await expect(card.getByText(/✗/)).toBeVisible()
    await card.locator('input').fill('not a url')
    await card.getByRole('button', { name: 'Connect' }).click()
    await expect(card.getByText(/✗/)).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})
