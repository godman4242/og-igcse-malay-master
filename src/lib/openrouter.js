/**
 * OpenRouter free model integration.
 * Provides free AI responses using OpenRouter's free-tier models.
 *
 * Free models available on OpenRouter (no API key required for some):
 * - google/gemma-3-1b-it:free
 * - meta-llama/llama-4-scout:free
 * - deepseek/deepseek-r1-0528:free
 *
 * To use: Set VITE_OPENROUTER_KEY in .env.local (free key from openrouter.ai)
 * If no key is set, falls back to the expert system.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free models ranked by quality for educational use
const FREE_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'meta-llama/llama-4-scout:free',
  'google/gemma-3-1b-it:free',
]

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

  // Try each free model in order until one works
  let lastError = null
  for (const model of FREE_MODELS) {
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
