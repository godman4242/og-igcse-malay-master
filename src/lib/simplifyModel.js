// Option F — L2 (Malay) sentence simplification: pure prompt-builder + parser.
// Spec: docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md (F4, F5)
//
// Simplification is a generative INSTRUCT task (rewrite-in-easier-Malay), not a
// translation — the free gtx pipeline can't do it. buildSimplifyPrompt produces the
// {systemPrompt, messages, maxTokens} payload for callInstruct; parseSimplifyResponse
// is the honesty guard: a generative rewrite can reply with junk, English, or a
// verbatim echo, and each of those must DEGRADE (the caller falls back to the shipped
// English reveal) rather than be shown as "simpler Malay". No DOM, no network.

import { MALAY_MARKERS } from './sentenceModel'

// One sentence in, one sentence out — a small cap keeps a rambling model from
// returning an essay and bounds the per-tap cost on the user's own key.
const SIMPLIFY_MAX_TOKENS = 220

/**
 * Build the instruct payload that rewrites ONE Malay sentence in simpler Malay.
 * The user message carries only the sentence (no instructions) so the model is
 * less likely to echo instruction text back into the rewrite.
 *
 * @param {string} sentenceText
 * @returns {{systemPrompt: string, messages: Array<{role:string,content:string}>, maxTokens: number}}
 */
export function buildSimplifyPrompt(sentenceText) {
  const systemPrompt = `You rewrite Malay sentences in simpler Malay for IGCSE learners (teens, intermediate level).

Rules:
- Rewrite the given sentence in simpler Bahasa Melayu: common everyday words, simpler grammar, shorter clauses.
- Keep the SAME meaning. Do not add or remove information.
- Stay entirely in Malay. Do NOT use English anywhere in the answer.
- Use standard Bahasa Melayu spelling (no slang, no abbreviations).
- Return ONLY the rewritten sentence — no preamble, no quotes, no labels, no explanation.`

  return {
    systemPrompt,
    messages: [{ role: 'user', content: String(sentenceText ?? '') }],
    maxTokens: SIMPLIFY_MAX_TOKENS,
  }
}

// Leading labels a model may prepend despite the prompt ("Simpler:", "Jawapan:").
// Matched case-insensitively at the very start, label word(s) + colon only — a real
// Malay sentence that merely CONTAINS a colon is untouched.
const LABEL_RE = /^\s*(?:simpler|simplified|simple|rewrite|rewritten|answer|output|jawapan|ayat\s+mudah|ayat\s+ringkas|versi\s+mudah|bahasa\s+melayu|malay)\s*[::]\s*/i

// Symmetric wrapping pairs to strip (straight/curly quotes, CJK brackets, markdown bold).
const WRAP_PAIRS = [
  ['"', '"'], ['“', '”'], ['‘', '’'], ["'", "'"],
  ['「', '」'], ['«', '»'], ['**', '**'], ['*', '*'], ['`', '`'],
]

// High-frequency English function words that are NOT Malay words — mirrors
// MALAY_MARKERS on the other side, so "is the rewrite still Malay?" is decided by
// which language's grammatical skeleton dominates, not by guessing content words.
const ENGLISH_MARKERS = new Set([
  'the', 'is', 'are', 'was', 'were', 'a', 'an', 'of', 'to', 'in', 'and', 'that',
  'this', 'it', 'he', 'she', 'they', 'you', 'we', 'i', 'with', 'for', 'on', 'as',
  'his', 'her', 'their', 'be', 'been', 'have', 'has', 'had', 'not', 'but', 'or',
  'from', 'by', 'at', 'my', 'your', 'so', 'still', 'went', 'go', 'goes', 'means',
])

// Lowercase + strip everything but letters/digits → order-preserving skeleton for
// the echo check ("did the model just hand the sentence back?").
function normalizeForEcho(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

function stripWrapping(s) {
  let out = s
  let changed = true
  while (changed) {
    changed = false
    out = out.trim()
    if (LABEL_RE.test(out)) {
      out = out.replace(LABEL_RE, '')
      changed = true
    }
    for (const [open, close] of WRAP_PAIRS) {
      if (out.length > open.length + close.length && out.startsWith(open) && out.endsWith(close)) {
        out = out.slice(open.length, out.length - close.length)
        changed = true
      }
    }
  }
  return out.trim()
}

/**
 * Clean a model's simplification and guard its honesty.
 * @param {*} raw            the model's response text
 * @param {*} originalText   the sentence that was sent for simplification
 * @returns {{status:'ok', text:string} | {status:'empty'|'echo'|'english'}}
 *   Any non-'ok' status means: do NOT show this as simpler Malay — degrade to the
 *   shipped English reveal instead. Never throws on junk input.
 */
export function parseSimplifyResponse(raw, originalText) {
  if (typeof raw !== 'string') return { status: 'empty' }

  // A preamble line ending in ":" is instruction noise ("Berikut ialah ayat...:") —
  // drop such lines, keep the rest, and collapse the answer onto one line.
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const kept = lines.filter(l => !l.endsWith(':'))
  let text = stripWrapping((kept.length ? kept : lines).join(' '))
  if (!text) return { status: 'empty' }

  const original = typeof originalText === 'string' ? originalText : ''
  if (original && normalizeForEcho(text) === normalizeForEcho(original)) {
    return { status: 'echo' }
  }

  // Still Malay? Count each language's function-word markers; an English-dominated
  // rewrite defeats the entire point of the L2 rung (and confuses the learner), so
  // it degrades. Zero markers on both sides fails OPEN to 'ok' — short concrete
  // Malay ("Ali makan nasi.") legitimately has no grammatical markers.
  let malayHits = 0
  let englishHits = 0
  for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!w) continue
    if (MALAY_MARKERS.has(w)) malayHits += 1
    if (ENGLISH_MARKERS.has(w)) englishHits += 1
  }
  if (englishHits > malayHits) return { status: 'english' }

  return { status: 'ok', text }
}
