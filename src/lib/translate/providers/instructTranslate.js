// Shared core for "higher quality" translation providers that run on a chat
// instruct model (OpenRouter free models, the user's own Gemini key, …) rather
// than a dedicated MT endpoint. Extracted from the openrouter provider
// (2026-06-10) so each new instruct backend is a thin makeInstructTranslator()
// call instead of a copy of the prompt/parse/fallback logic.
//
// Two realities every instruct translator handles (see the BYOK plan):
//  1. A chat model returns ONE completion — a batch of N words is asked for as
//     a numbered list and parsed back into N glosses; a count mismatch degrades
//     to bounded per-word calls.
//  2. Soft-degrade contract: a genuine failure (no key, model/network error)
//     THROWS so the router (`providerOrder`) falls through to the free gtx
//     chain rather than dead-ending. Only a recoverable count-mismatch is
//     handled here.

// Free instruct models follow full language names more reliably than ISO codes
// (e.g. "Malay → English" vs "ms → en"). Fall back to the raw code for any pair
// we don't have a name for, so an unknown locale still produces a usable prompt.
const LANG_NAMES = { ms: 'Malay', en: 'English' }
const langName = (code) => LANG_NAMES[code] || code

// Strict, low-rambling instruction: instruct models love to add notes, so the
// prompt pins the shape (numbered list, same numbers, one short gloss each).
function batchPrompt(texts, from, to) {
  const list = texts.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return `Translate each numbered ${langName(from)} item to ${langName(to)}. Reply with ONLY a numbered list, `
    + `same numbers, one short gloss each (1-4 words), no notes, no explanations.\n\n${list}`
}

function onePrompt(text, from, to) {
  return `Translate this single ${langName(from)} word or phrase to ${langName(to)}. `
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

/**
 * Build a `{ one, batch }` quality-translate provider over a chat instruct
 * backend.
 *
 * @param {{
 *   providerId: string,
 *   isAvailable: () => boolean,
 *   call: (args: {systemPrompt: string, messages: Array<{role:string,content:string}>,
 *                 maxTokens?: number, signal?: AbortSignal}) => Promise<string>,
 * }} backend
 * @returns {{
 *   one: (text: string, from?: string, to?: string, opts?: {signal?: AbortSignal})
 *     => Promise<{text:string,source:string,provider:string}>,
 *   batch: (texts: string[], from?: string, to?: string, opts?: {signal?: AbortSignal})
 *     => Promise<Array<{text:string,source:string,provider:string}>>,
 * }}
 */
export function makeInstructTranslator({ providerId, isAvailable, call }) {
  const RESULT = (text) => ({ text, source: providerId, provider: providerId })

  async function perWord(texts, from, to, opts) {
    const out = []
    for (const t of texts) {
      const reply = await call({
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

  async function batch(texts, from = 'ms', to = 'en', opts = {}) {
    if (!texts?.length) return []
    if (!isAvailable()) throw new Error(`${providerId} unavailable`)

    const reply = await call({
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

  async function one(text, from = 'ms', to = 'en', opts = {}) {
    const [res] = await batch([text], from, to, opts)
    return res || RESULT(text)
  }

  return { one, batch }
}
