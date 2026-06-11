// Gemini BYOK instruct adapter — the user's OWN Gemini key, called directly
// from the browser.
//
// CRITICAL (spec R1, verified 2026-06-10): browsers can call Gemini's NATIVE
// endpoint (…/v1beta/models/<model>:generateContent) with the key in the
// x-goog-api-key HEADER. The OpenAI-compatibility endpoint (/v1beta/openai/…)
// CORS-fails client-side — never use it here. The key never goes in the URL
// (keys don't belong in URLs/logs) and NEVER touches our /api/gemini proxy:
// that proxy runs on the deployment owner's key and stays reserved for the
// aiText features.
//
// Key slot: its own localStorage entry (the shipped BYOK pattern,
// openrouter.js) — never the Zustand store, so it can never reach the cloud
// sync blob. SECURITY BAR: this module must not import useStore.
//
// Model slugs rotate (gemini-2.0-flash was retired 2025-12): discover via
// ListModels (24h cache), never hardcode — FALLBACK_GEMINI_MODELS is the
// offline backstop only.
// Spec: docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const GEMINI_KEY_STORAGE = 'igcse-gemini-key'
export const GEMINI_MODELS_CACHE_KEY = 'igcse-gemini-models'
export const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash']
const MODELS_TTL_MS = 24 * 60 * 60 * 1000
const MODELS_LIMIT = 3

// Flash variants that are not general text-chat models — never instruct
// candidates.
const EXCLUDE_PATTERNS = ['tts', 'image', 'live', 'audio', 'embed', 'veo', 'thinking']

function makeError(message, cause, extra = {}) {
  const err = new Error(message)
  err.cause = cause
  Object.assign(err, extra)
  return err
}

// ── key slot (mirrors openrouter.js USER_KEY_STORAGE) ───────
let userKey = (() => {
  try { return localStorage.getItem(GEMINI_KEY_STORAGE) || null } catch { return null }
})()

export function setUserGeminiKey(k) {
  userKey = (k && k.trim()) || null
  try {
    if (userKey) localStorage.setItem(GEMINI_KEY_STORAGE, userKey)
    else localStorage.removeItem(GEMINI_KEY_STORAGE)
  } catch { /* private mode / no localStorage — keep in-memory only */ }
}

export function getUserGeminiKey() {
  return userKey
}

export function hasUserGeminiKey() {
  return !!userKey
}

// ── request / response shaping (pure, mirrors gemini.js) ────
export function buildGeminiRequest({ systemPrompt, messages, maxTokens = 1024 }) {
  const body = {
    contents: (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
    },
  }
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] }
  }
  return body
}

export function parseGeminiResponse(json) {
  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!text) throw makeError('Gemini returned an empty response', 'empty')
  return text
}

/**
 * Pure: turn a ListModels response into a ranked list of flash chat model ids.
 * Filters to generateContent-supporting flash models, drops non-text variants,
 * strips the models/ prefix, sorts newest version first, dedupes, caps. Never
 * throws.
 */
export function pickGeminiModels(json, { limit = MODELS_LIMIT } = {}) {
  const models = json && Array.isArray(json.models) ? json.models : []
  const ids = models
    .filter(m => m && typeof m.name === 'string')
    .filter(m => (m.supportedGenerationMethods || m.supportedActions || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(id => id.includes('flash'))
    .filter(id => !EXCLUDE_PATTERNS.some(p => id.toLowerCase().includes(p)))

  // Newest version first ("gemini-3.5-flash" > "gemini-2.5-flash"); the plain
  // flash model sorts before its -lite/-preview variants at the same version.
  ids.sort((a, b) => b.localeCompare(a) || a.length - b.length)
  ids.sort((a, b) => {
    const va = parseFloat((a.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0')
    const vb = parseFloat((b.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0')
    if (va !== vb) return vb - va
    return a.length - b.length
  })

  const out = []
  const seen = new Set()
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Resolve current Gemini flash models: fresh (<24h) cache first, else a live
 * ListModels fetch (then cached), else FALLBACK_GEMINI_MODELS. Only an
 * AbortError propagates (mirrors getFreeModels).
 */
export async function getGeminiModels({ signal, now = Date.now() } = {}) {
  try {
    const raw = localStorage.getItem(GEMINI_MODELS_CACHE_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c && Array.isArray(c.ids) && c.ids.length && typeof c.ts === 'number' && (now - c.ts) < MODELS_TTL_MS) {
        return c.ids
      }
    }
  } catch { /* unparseable / no storage — fall through to fetch */ }

  try {
    const res = await fetch(`${GEMINI_BASE}/models`, {
      headers: { 'x-goog-api-key': userKey || '' },
      signal,
    })
    if (!res.ok) throw new Error(`models fetch ${res.status}`)
    const json = await res.json()
    const ids = pickGeminiModels(json)
    if (ids.length) {
      try { localStorage.setItem(GEMINI_MODELS_CACHE_KEY, JSON.stringify({ ts: now, ids })) } catch { /* no storage */ }
      return ids
    }
    return FALLBACK_GEMINI_MODELS
  } catch (err) {
    if (err && err.name === 'AbortError') throw err
    return FALLBACK_GEMINI_MODELS
  }
}

// Shared POST to the native generateContent endpoint (key check, model
// discovery, typed errors) — used by both the text and vision calls so their
// error semantics can never drift apart.
async function postGenerateContent(buildBody, { signal }) {
  if (!userKey) throw makeError('No Gemini key configured', 'no_key')

  const models = await getGeminiModels({ signal })
  const model = models[0] || FALLBACK_GEMINI_MODELS[0]
  const body = buildBody()

  let res
  try {
    res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': userKey,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw makeError(`Gemini network error: ${err?.message || err}`, 'network')
  }

  if (res.status === 429) {
    throw makeError('Gemini rate/quota limit (429)', 'quota', { status: 429 })
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw makeError(`Gemini ${res.status}: ${errText.slice(0, 200)}`, 'http', { status: res.status })
  }
  return parseGeminiResponse(await res.json())
}

/**
 * One instruct call on the user's Gemini key, via the NATIVE endpoint.
 * Throws typed errors: 'no_key' | 'quota' (429) | 'http' | 'empty' | 'network';
 * AbortError propagates raw.
 */
export async function callGeminiByok({ systemPrompt, messages, maxTokens = 1024, signal }) {
  return postGenerateContent(() => buildGeminiRequest({ systemPrompt, messages, maxTokens }), { signal })
}

// ── Phase 2 vision rung (Sharper read) ──────────────────────
// Spec: docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md
// D8: the native endpoint accepts camelCase inlineData{mimeType,data} (this
// file already posts camelCase generationConfig there). Flash models take
// image input natively, so the SAME discovered model list serves vision.

/**
 * Pure: text request body + inlineData image parts prepended to the LAST user
 * content (images first, then the instruction text). No user message ⇒ a new
 * user content carrying just the images.
 */
export function buildGeminiVisionRequest({ systemPrompt, messages, images, maxTokens = 1024 }) {
  const body = buildGeminiRequest({ systemPrompt, messages, maxTokens })
  const imageParts = (images || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
  if (!imageParts.length) return body

  let target = null
  for (let i = body.contents.length - 1; i >= 0; i -= 1) {
    if (body.contents[i].role === 'user') { target = body.contents[i]; break }
  }
  if (!target) {
    target = { role: 'user', parts: [] }
    body.contents.push(target)
  }
  target.parts = [...imageParts, ...target.parts]
  return body
}

/**
 * One VISION call (image transcription) on the user's Gemini key — same
 * native endpoint, headers, and typed errors as callGeminiByok.
 * @param {{systemPrompt:string, messages:Array, images:Array<{mimeType:string,data:string}>,
 *          maxTokens?:number, signal?:AbortSignal}} args
 */
export async function callGeminiVisionByok({ systemPrompt, messages, images, maxTokens = 1024, signal }) {
  return postGenerateContent(() => buildGeminiVisionRequest({ systemPrompt, messages, images, maxTokens }), { signal })
}

/**
 * Verify a Gemini key by AUTH only (GET /v1beta/models) — never a completion
 * (spec R10: the "Test key proxied a flaky completion" lesson). The response
 * doubles as model discovery, but here we only care that the key authenticates.
 */
export async function verifyGeminiKey(key, { signal } = {}) {
  const apiKey = (key && key.trim()) || userKey
  if (!apiKey) throw new Error('No Gemini key to verify')

  const res = await fetch(`${GEMINI_BASE}/models`, {
    method: 'GET',
    headers: { 'x-goog-api-key': apiKey },
    signal,
  })
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new Error('Invalid Gemini key')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini key check failed: ${res.status} ${body}`)
  }
  return true
}

// ── registry contract (consumed by src/lib/instruct.js) ─────
export const geminiAdapter = {
  id: 'gemini',
  label: 'Gemini',
  hasKey: hasUserGeminiKey,
  call: callGeminiByok,
  verify: ({ signal } = {}) => verifyGeminiKey(userKey, { signal }),
  // Vision capability (Phase 2 Sharper read): free-tier generateContent
  // accepts inline images on the same flash models — primary vision provider.
  supportsVision: true,
  callVision: callGeminiVisionByok,
}
