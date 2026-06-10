// Ollama instruct adapter — local AI on the user's OWN computer, advanced/
// desktop-only (spec R2): browsers exempt http://localhost from mixed-content
// blocking, but (a) Ollama rejects foreign origins unless OLLAMA_ORIGINS
// includes the site origin, and (b) Chrome 142+ gates public-site→loopback
// fetches behind the Local Network Access permission. Both failure modes
// surface as a TypeError fetch throw → typed cause 'network'. Phones never
// see this adapter's Settings card (a LAN URL from HTTPS is hard-blocked
// mixed content — only localhost is exempt).
//
// Slots: URL + model in their own localStorage entries (the BYOK pattern —
// never the Zustand store). hasKey() requires BOTH so a half-configured card
// can never route calls. SECURITY BAR: this module must not import useStore.
// Spec: docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md

const OLLAMA_URL_STORAGE = 'igcse-ollama-url'
const OLLAMA_MODEL_STORAGE = 'igcse-ollama-model'
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434'

function makeError(message, cause, extra = {}) {
  const err = new Error(message)
  err.cause = cause
  Object.assign(err, extra)
  return err
}

function readSlot(storageKey) {
  try { return localStorage.getItem(storageKey) || null } catch { return null }
}

let ollamaUrl = readSlot(OLLAMA_URL_STORAGE)
let ollamaModel = readSlot(OLLAMA_MODEL_STORAGE)

/** Set the Ollama base URL. Throws on anything that isn't a parseable http(s) URL. */
export function setOllamaUrl(u) {
  const trimmed = (u && u.trim()) || ''
  if (trimmed) {
    let parsed
    try { parsed = new URL(trimmed) } catch { throw new Error('Ollama URL must be a full http(s) URL') }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Ollama URL must use http or https')
    }
  }
  ollamaUrl = trimmed ? trimmed.replace(/\/+$/, '') : null
  try {
    if (ollamaUrl) localStorage.setItem(OLLAMA_URL_STORAGE, ollamaUrl)
    else localStorage.removeItem(OLLAMA_URL_STORAGE)
  } catch { /* private mode — keep in-memory only */ }
}

export function getOllamaUrl() {
  return ollamaUrl
}

export function setOllamaModel(m) {
  ollamaModel = (m && m.trim()) || null
  try {
    if (ollamaModel) localStorage.setItem(OLLAMA_MODEL_STORAGE, ollamaModel)
    else localStorage.removeItem(OLLAMA_MODEL_STORAGE)
  } catch { /* private mode — keep in-memory only */ }
}

export function getOllamaModel() {
  return ollamaModel
}

export function hasOllamaConfig() {
  return !!(ollamaUrl && ollamaModel)
}

/**
 * One instruct call against the local Ollama server (/api/chat, non-streamed).
 * Typed errors: 'no_key' | 'http' | 'empty' | 'network'; AbortError raw.
 */
export async function callOllama({ systemPrompt, messages, maxTokens = 1024, signal }) {
  if (!hasOllamaConfig()) throw makeError('Ollama is not configured (URL + model required)', 'no_key')

  const body = {
    model: ollamaModel,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...(messages || []),
    ],
    stream: false,
    options: { num_predict: maxTokens },
  }

  let res
  try {
    res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Connection refused / CORS (OLLAMA_ORIGINS) / Chrome LNA denial all land here.
    throw makeError(`Ollama network error: ${err?.message || err}`, 'network')
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw makeError(`Ollama ${res.status}: ${errText.slice(0, 200)}`, 'http', { status: res.status })
  }
  const data = await res.json()
  const text = data?.message?.content || ''
  if (!text) throw makeError('Ollama returned an empty response', 'empty')
  return text
}

/**
 * Verify the local server is reachable (GET /api/version) — also proves CORS
 * + the Chrome Local Network Access permission are open. Never a completion.
 */
export async function verifyOllama({ signal } = {}) {
  const base = ollamaUrl || DEFAULT_OLLAMA_URL
  const res = await fetch(`${base}/api/version`, { method: 'GET', signal })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Ollama check failed: ${res.status} ${body}`)
  }
  return true
}

/** Installed models from GET /api/tags — feeds the Settings model picker. */
export async function listOllamaModels({ signal } = {}) {
  const base = ollamaUrl || DEFAULT_OLLAMA_URL
  const res = await fetch(`${base}/api/tags`, { method: 'GET', signal })
  if (!res.ok) throw new Error(`Ollama tags failed: ${res.status}`)
  const json = await res.json().catch(() => null)
  const models = json && Array.isArray(json.models) ? json.models : []
  return models.map(m => m && m.name).filter(Boolean)
}

// ── registry contract (consumed by src/lib/instruct.js) ─────
export const ollamaAdapter = {
  id: 'ollama',
  label: 'Ollama (local)',
  hasKey: hasOllamaConfig,
  call: callOllama,
  verify: verifyOllama,
}
