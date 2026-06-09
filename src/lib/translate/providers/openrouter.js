// "Higher quality" translation provider — routes Malay→English glosses through
// OpenRouter's free instruct models (via the shared `callOpenRouter` chain),
// which read more idiomatically than the free `gtx` endpoint, especially for
// phrases and sentences. Same `{ one, batch }` shape as the gtx/google/deepl
// providers so the router can treat it interchangeably.
//
// Two realities this module handles (see the BYOK plan, "Two gotchas"):
//  1. OpenRouter returns ONE completion — a batch of N words is asked for as a
//     numbered list and parsed back into N glosses; a count mismatch degrades to
//     bounded per-word calls.
//  2. Soft-degrade contract: a genuine failure (no key, model/network error)
//     THROWS so the router (`providerOrder`) falls through to the free gtx chain
//     rather than dead-ending. Only a recoverable count-mismatch is handled here.

import { callOpenRouter, isOpenRouterAvailable } from '../../openrouter'

const RESULT = (text) => ({ text, source: 'openrouter', provider: 'openrouter' })

// Strict, low-rambling instruction: free instruct models love to add notes, so
// the prompt pins the shape (numbered list, same numbers, one short gloss each).
function batchPrompt(texts, from, to) {
  const list = texts.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return `Translate each numbered ${from} item to ${to}. Reply with ONLY a numbered list, `
    + `same numbers, one short gloss each (1-4 words), no notes, no explanations.\n\n${list}`
}

function onePrompt(text, from, to) {
  return `Translate this single ${from} word or phrase to ${to}. `
    + `Reply with ONLY the translation (1-4 words), no notes.\n\n${text}`
}

// Trim a raw gloss: drop surrounding quotes/markdown emphasis and collapse
// whitespace. Grounding (verifyPair) downstream still flags anything off.
function cleanGloss(s) {
  return String(s)
    .replace(/[*_`]+/g, '')        // markdown emphasis
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '') // surrounding quotes/space
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse a numbered-list completion into ordered glosses. Tolerates ragged
 * markers ("1." "1)" "2 -" "3:"), blank lines, and ignores non-numbered prose
 * (preamble/notes). Returns the glosses in encounter order — the caller decides
 * whether the count matches the request.
 *
 * @param {string} reply
 * @returns {string[]}
 */
export function parseNumberedList(reply) {
  const out = []
  for (const raw of String(reply || '').split('\n')) {
    const m = raw.match(/^\s*\d+\s*[.)\-:]\s*(.+?)\s*$/)
    if (!m) continue
    const gloss = cleanGloss(m[1])
    if (gloss) out.push(gloss)
  }
  return out
}

async function perWord(texts, from, to, opts) {
  const out = []
  for (const t of texts) {
    const reply = await callOpenRouter({
      systemPrompt: 'You are a precise bilingual dictionary. Output only the translation.',
      messages: [{ role: 'user', content: onePrompt(t, from, to) }],
      maxTokens: 64,
      signal: opts.signal,
    })
    // The reply may itself come back numbered ("1. gloss") or bare — handle both.
    const parsed = parseNumberedList(reply)
    out.push(RESULT(parsed[0] || cleanGloss(reply) || t))
  }
  return out
}

/**
 * Translate a batch of texts via OpenRouter. Throws if OpenRouter is unavailable
 * or the model call fails (so the router degrades to gtx). Empty input → [].
 *
 * @param {string[]} texts
 * @param {string} [from]
 * @param {string} [to]
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<Array<{text:string,source:string,provider:string}>>}
 */
export async function openrouterTranslateBatch(texts, from = 'ms', to = 'en', opts = {}) {
  if (!texts?.length) return []
  if (!isOpenRouterAvailable()) throw new Error('OpenRouter unavailable')

  const reply = await callOpenRouter({
    systemPrompt: 'You are a precise bilingual dictionary. Output only a numbered list of translations.',
    messages: [{ role: 'user', content: batchPrompt(texts, from, to) }],
    maxTokens: Math.max(128, texts.length * 24),
    signal: opts.signal,
  })

  const parsed = parseNumberedList(reply)
  if (parsed.length === texts.length) return parsed.map(RESULT)
  // Count mismatch (model dropped/merged items) — fall back to per-word calls.
  return perWord(texts, from, to, opts)
}

/**
 * Single-item convenience mirroring the other providers' `*One` export.
 *
 * @param {string} text
 * @param {string} [from]
 * @param {string} [to]
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{text:string,source:string,provider:string}>}
 */
export async function openrouterTranslateOne(text, from = 'ms', to = 'en', opts = {}) {
  const [res] = await openrouterTranslateBatch([text], from, to, opts)
  return res || RESULT(text)
}
