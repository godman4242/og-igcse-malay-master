/**
 * OpenRouter free model integration.
 * Provides free AI responses using OpenRouter's free-tier models.
 *
 * IMPORTANT — OpenRouter rotates its free-tier model slugs every few months.
 * Hardcoding slugs guarantees a future 404 ("No endpoints found for X"): in
 * 2026-06 all three originally-hardcoded slugs (deepseek-r1-0528, llama-4-scout,
 * gemma-3-1b) were retired at once, 404'ing every AI feature. So instead of a
 * static list we DISCOVER the current free models from /api/v1/models at runtime
 * (cached 24h), filter to genuinely-free chat models, rank the strongest general
 * instruct families first, and fall back to a curated valid list when offline.
 *
 * To use: Set VITE_OPENROUTER_KEY in .env.local OR a Settings BYOK key (below).
 * If no key is set, callers fall back to the expert system.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

// Strongest general-instruct free families for JSON/teaching tasks, in
// preference order. Matched as substrings against the live model ids. Reasoning
// models (e.g. deepseek-r1) are intentionally NOT preferred — they emit <think>
// blocks and often return empty content for structured output.
const PREFERRED_PATTERNS = [
  'llama-3.3-70b-instruct',
  'gpt-oss-120b',
  'qwen3-next-80b',
  'gemma-4-31b',
  'glm-4.5-air',
  'gpt-oss-20b',
  'llama-3.3-8b-instruct',
]

// Model ids containing any of these substrings are not general text chat models
// (music, code-only, safety classifiers, embeddings, audio) — never deck/tutor
// candidates.
const EXCLUDE_PATTERNS = ['lyria', 'coder', 'content-safety', 'embed', 'guard', 'whisper', 'tts', 'rerank']

// Curated, currently-valid free chat slugs (verified 2026-06-07). Used only when
// the live /models fetch is unavailable (offline / rate-limited), so the app
// degrades to a known-good list instead of dead slugs.
export const FALLBACK_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-31b-it:free',
]

export const MODELS_CACHE_KEY = 'igcse-openrouter-models'
const MODELS_TTL_MS = 24 * 60 * 60 * 1000
const MODELS_LIMIT = 5

function isFreePricing(p) {
  if (!p || typeof p !== 'object') return false
  const z = (v) => String(v) === '0' || String(v) === '0.0'
  return z(p.prompt) && z(p.completion)
}

/**
 * Pure: turn a raw /api/v1/models response into a ranked list of free chat model
 * ids. Filters to genuinely-free models, drops unsuitable categories, ranks
 * preferred general-instruct families first (in PREFERRED order) then the rest by
 * context length, dedupes, and caps at `limit`. Never throws.
 *
 * @param {{data?: Array}} json
 * @param {{limit?: number}} [opts]
 * @returns {string[]}
 */
export function pickFreeModels(json, { limit = MODELS_LIMIT } = {}) {
  const data = json && Array.isArray(json.data) ? json.data : []
  const free = data.filter((m) => m && typeof m.id === 'string' && isFreePricing(m.pricing))
  const suitable = free.filter((m) => !EXCLUDE_PATTERNS.some((p) => m.id.toLowerCase().includes(p)))

  const rank = (m) => {
    const idx = PREFERRED_PATTERNS.findIndex((p) => m.id.includes(p))
    return idx === -1 ? PREFERRED_PATTERNS.length : idx
  }
  suitable.sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    if (ra !== rb) return ra - rb
    return (b.context_length || 0) - (a.context_length || 0)
  })

  const out = []
  const seen = new Set()
  for (const m of suitable) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m.id)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Resolve the current free chat models: a fresh (<24h) localStorage cache first,
 * else a live /models fetch (then cached), else the curated FALLBACK list. Only
 * an AbortError propagates; every other failure degrades to the fallback.
 *
 * @param {{signal?: AbortSignal, now?: number}} [opts]
 * @returns {Promise<string[]>}
 */
export async function getFreeModels({ signal, now = Date.now() } = {}) {
  try {
    const raw = localStorage.getItem(MODELS_CACHE_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c && Array.isArray(c.ids) && c.ids.length && typeof c.ts === 'number' && (now - c.ts) < MODELS_TTL_MS) {
        return c.ids
      }
    }
  } catch { /* unparseable / no storage — fall through to fetch */ }

  try {
    const res = await fetch(OPENROUTER_MODELS_URL, { signal })
    if (!res.ok) throw new Error(`models fetch ${res.status}`)
    const json = await res.json()
    const ids = pickFreeModels(json)
    if (ids.length) {
      try { localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: now, ids })) } catch { /* no storage */ }
      return ids
    }
    return FALLBACK_FREE_MODELS
  } catch (err) {
    if (err && err.name === 'AbortError') throw err
    return FALLBACK_FREE_MODELS
  }
}

// ── Bring-Your-Own-Key (BYOK) ───────────────────────────────
// A user-supplied OpenRouter key, stored in its OWN localStorage entry (never
// in the Zustand store, so it can never enter the cloud sync blob). When set,
// it takes precedence over the build-time env key, so the user's AI is billed
// to them and stays on their device. Design:
// docs/superpowers/specs/2026-05-30-byok-design.md
const USER_KEY_STORAGE = 'igcse-openrouter-key'

let userKey = (() => {
  try { return localStorage.getItem(USER_KEY_STORAGE) || null } catch { return null }
})()

export function setUserOpenRouterKey(k) {
  userKey = (k && k.trim()) || null
  try {
    if (userKey) localStorage.setItem(USER_KEY_STORAGE, userKey)
    else localStorage.removeItem(USER_KEY_STORAGE)
  } catch { /* private mode / no localStorage — keep in-memory only */ }
}

export function getUserOpenRouterKey() {
  return userKey
}

// True only when the USER has supplied their own key (not the env key). Used to
// decide whether to reroute the Gemini-default features — so non-key users are
// never affected.
export function hasUserOpenRouterKey() {
  return !!userKey
}

// The key actually used for calls: the user's first, then the env fallback.
function resolveKey() {
  return userKey || import.meta.env.VITE_OPENROUTER_KEY || null
}

/**
 * Check if OpenRouter is usable (a user key OR the build-time env key exists).
 */
export function isOpenRouterAvailable() {
  return !!resolveKey()
}

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key'

/**
 * Verify an OpenRouter key by checking AUTH only — never a chat completion.
 *
 * The "Test key" button used to proxy a completion through the flaky `:free`
 * models, so a perfectly valid key reported "Invalid or unreachable" whenever
 * those models were rate-limited or a reasoning model returned empty content.
 * `GET /api/v1/key` returns 200 for any valid key and 401/403 for a bad one,
 * independent of model availability — the canonical validity check.
 *
 * @param {string} [key] - Key to test; falls back to the resolved (user/env) key.
 * @param {AbortSignal} [signal]
 * @returns {Promise<true>} Resolves when the key authenticates; throws otherwise.
 */
export async function verifyOpenRouterKey(key, { signal } = {}) {
  const apiKey = (key && key.trim()) || resolveKey()
  if (!apiKey) throw new Error('No OpenRouter key to verify')

  const res = await fetch(OPENROUTER_KEY_URL, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal,
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid OpenRouter key')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenRouter key check failed: ${res.status} ${body}`)
  }
  return true
}

/**
 * Call OpenRouter's free models.
 *
 * @param {Object} options
 * @param {string} options.systemPrompt - System instructions
 * @param {Array} options.messages - Chat messages [{role, content}]
 * @param {number} [options.maxTokens=1024] - Max response tokens
 * @param {AbortSignal} [options.signal] - Cancellation signal
 * @returns {Promise<string>} Response text
 */
export async function callOpenRouter({ systemPrompt, messages, maxTokens = 1024, signal }) {
  const apiKey = resolveKey()
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // Try each currently-available free model in order until one works. The list
  // is discovered live (cached 24h) so a retired slug can't dead-end every call.
  const models = await getFreeModels({ signal })
  let lastError = null
  for (const model of models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://igcse-malay.app',
          'X-Title': 'IGCSE Malay Master',
        },
        body: JSON.stringify({
          model,
          messages: fullMessages,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        signal,
      })

      if (!res.ok) {
        const err = await res.text().catch(() => '')
        lastError = new Error(`OpenRouter ${model}: ${res.status} ${err}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content) return content

      lastError = new Error(`OpenRouter ${model}: empty response`)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      lastError = err
    }
  }

  throw lastError || new Error('All free models failed')
}

/**
 * Simplified Cikgu Maya chat via OpenRouter free models.
 * Uses a condensed system prompt optimized for free model capabilities.
 */
export async function chatWithFreeModel(messages, contextNote = '', signal) {
  const systemPrompt = `You are Cikgu Maya, an IGCSE Malay tutor for a 16-year-old student preparing for the exam.

HOW TO ANSWER:
- Lead with the answer, then explain. No filler openings ("Great question!", "I'm happy to help!").
- Always include a concrete Malay example sentence with English gloss for any rule you teach.
- Keep responses tight: 120-200 words for normal questions, longer only when the student asks for depth.
- If the student writes a Malay sentence, mark it: ✓ for correct parts, ✗ for issues, then a corrected version.
- For grammar questions, name the rule (e.g., "meN- + p → mem- because of nasal assimilation"), give 2 examples, then warn of the most common student mistake.

WHAT TO TEACH (IGCSE 0546 syllabus focus):
- Imbuhan: meN- assimilation (mem-, men-, meng-, meny-, me-), ber-, di-, ter-, peN-, -an, -kan, -i.
- Tense markers: sudah, sedang, akan, telah, pernah, belum.
- Kata hubung & penanda wacana: kerana, walaupun, supaya, apabila, jika, sambil, lalu / selain itu, walau bagaimanapun, oleh itu, kesimpulannya.
- Sentence structure: ayat aktif vs ayat pasif (di- forms), ayat majmuk.
- Paper-specific: writing format conventions (formal letter, article, narrative); Paper 3 oral roleplay tactics (vocab range, connectors, register).
- Vocabulary upgrades: replace high-frequency words with formal alternatives (suka → gemar/meminati; banyak → pelbagai).

WHAT TO AVOID:
- Generic encouragement without substance.
- Long preamble before the actual answer.
- Mixed-up romanisation (always use standard Bahasa Melayu spelling, not slang).

${contextNote}`

  return callOpenRouter({ systemPrompt, messages, maxTokens: 512, signal })
}
