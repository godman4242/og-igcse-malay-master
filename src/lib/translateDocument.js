// Pure document-translation pipeline for "Translate the whole document, free".
// Spec:  docs/superpowers/specs/2026-06-08-translate-document-design.md
// Plan:  docs/superpowers/plans/2026-06-08-translate-document.md  (Steps 1–2)
//
// No DOM and no network live here. The runner (`translateDocument`) takes an
// INJECTED `translateBatch`, so the orchestration — chunk + throttle + retry/
// backoff + abort + progress — is fully unit-testable; the PDFReader wiring passes
// the real `translateBatch` from `./translate.js` (IndexedDB-cached, so a half-done
// document resumes cheap). Reveal-gating lives in `./docGlossState.js`.

import { verifyPair } from './dictionaryGrounding.js'

const STRIP_LEAD = /^[^\p{L}\p{N}]+/u
const STRIP_TRAIL = /[^\p{L}\p{N}]+$/u

/** Lowercase + strip surrounding punctuation; keep internal hyphens/apostrophes. */
export function normalizeWord(word) {
  if (typeof word !== 'string') return ''
  return word.toLowerCase().trim().replace(STRIP_LEAD, '').replace(STRIP_TRAIL, '')
}

/**
 * Reduce a page/document's tokens to the deduped set actually worth translating:
 * skip dictionary-known words and translation-cache hits, ignore punctuation-only
 * tokens. Accepts `{word}` objects (the live `activeTokens` shape) or plain strings.
 * @returns {{toTranslate:string[], knownCount:number, cachedCount:number}}
 */
export function collectDocTokens(tokens, dictionary = {}, { cacheLookup } = {}) {
  const toTranslate = []
  let knownCount = 0
  let cachedCount = 0
  const seen = new Set()
  for (const t of tokens || []) {
    const raw = typeof t === 'string' ? t : (t && t.word)
    const norm = normalizeWord(raw)
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    if (dictionary && dictionary[norm]) { knownCount += 1; continue }
    if (cacheLookup && cacheLookup(norm)) { cachedCount += 1; continue }
    toTranslate.push(norm)
  }
  return { toTranslate, knownCount, cachedCount }
}

/**
 * Greedily group words into chunks that never exceed the char/item caps and never
 * split a word (gtx caps a call at ~5000 chars and rate-limits fast). A single
 * over-long word gets its own chunk rather than being split.
 */
export function chunkTexts(texts, { maxChars = 4000, maxItems = 100 } = {}) {
  const chunks = []
  let cur = []
  let chars = 0
  for (const w of texts || []) {
    const len = w.length
    if (cur.length > 0 && (cur.length >= maxItems || chars + len > maxChars)) {
      chunks.push(cur)
      cur = []
      chars = 0
    }
    cur.push(w)
    chars += len
  }
  if (cur.length) chunks.push(cur)
  return chunks
}

/** Deterministic exponential backoff (ms), capped. attempt is 0-indexed. */
export function backoffDelay(attempt, { base = 500, factor = 2, max = 8000 } = {}) {
  return Math.min(max, base * Math.pow(factor, attempt))
}

/**
 * Turn a machine gloss into a render-ready decision against the owned grounding
 * index. Verified pairs display the canonical English; a known word with a wrong
 * meaning is flagged `mismatch` and the canonical is shown instead; an unknown
 * word keeps the machine output but is flagged `unverified` (never silent-shipped
 * as authoritative).
 * @returns {{display:string, verified:boolean, confidence:string, canonicalEn?:string, marker:null|'mismatch'|'unverified'}}
 */
export function groundGloss(malay, english, index) {
  const v = verifyPair(malay, english, index)
  if (v.verified) {
    return {
      display: v.canonicalEn || english,
      verified: true,
      confidence: v.confidence,
      canonicalEn: v.canonicalEn,
      marker: null,
    }
  }
  if (v.canonicalEn) {
    return {
      display: v.canonicalEn,
      verified: false,
      confidence: 'low',
      canonicalEn: v.canonicalEn,
      marker: 'mismatch',
    }
  }
  return { display: english, verified: false, confidence: 'low', marker: 'unverified' }
}

/**
 * Build the render map for the in-place gloss layer: token global-index → gloss
 * decision, for UNKNOWN words that already have a translation result. Mirrors the
 * `selIdx` Map both PDF views consume (LayoutView overlay + the reflow token spans),
 * so the gloss renders identically in reflow and layout. Dictionary-known words are
 * skipped (already colour-coded + tappable); words not yet translated are skipped.
 * @param {Array<{word:string,i:number}>} tokens  activeTokens (reflow or layout)
 * @param {Record<string,string>} dictionary  the built-in DICTIONARY map
 * @param {Record<string,{text:string,source:string}>} results  normalizedWord → translation
 * @param {Map} groundingIndex  from buildGroundingIndex
 * @returns {Map<number,{malay:string, display:string, marker:null|'mismatch'|'unverified', verified:boolean, source:string}>}
 */
export function buildGlossIndex(tokens, dictionary = {}, results = {}, groundingIndex) {
  const map = new Map()
  for (const t of tokens || []) {
    const norm = normalizeWord(t && t.word)
    if (!norm || (dictionary && dictionary[norm])) continue
    const res = results[norm]
    // Skip words with no result and failed lookups (source:'error' fills text with
    // the original Malay word) — a failed word gets NO cue, not a bogus self-gloss.
    if (!res || !res.text || res.source === 'error') continue
    const g = groundGloss(norm, res.text, groundingIndex)
    map.set(t.i, { malay: norm, display: g.display, marker: g.marker, verified: g.verified, source: res.source })
  }
  return map
}

const defaultDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Translate a list of words in chunks, with retry/backoff on transient failure,
 * cancellation via AbortSignal, and progress callbacks. Returns a map keyed by
 * the input word. Resumability comes for free from `translateBatch`'s own cache.
 *
 * @param {string[]} words
 * @param {object} opts
 * @param {(texts:string[], from:string, to:string)=>Promise<Array<{text:string,source:string}>>} opts.translateBatch
 * @param {(ms:number)=>Promise<void>} [opts.delay]
 * @param {AbortSignal} [opts.signal]
 * @param {(p:{done:number,total:number})=>void} [opts.onProgress]
 * @returns {Promise<Record<string,{text:string,source:string}>>}
 */
export async function translateDocument(words, {
  translateBatch,
  delay = defaultDelay,
  from = 'ms',
  to = 'en',
  signal,
  onProgress,
  maxChars = 4000,
  maxItems = 100,
  maxRetries = 3,
  backoff = backoffDelay,
} = {}) {
  const out = {}
  if (typeof translateBatch !== 'function') return out
  const chunks = chunkTexts(words, { maxChars, maxItems })
  let done = 0
  for (const chunk of chunks) {
    if (signal && signal.aborted) break
    let results = null
    let aborted = false
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (signal && signal.aborted) { aborted = true; break }
      try {
        results = await translateBatch(chunk, from, to)
        break
      } catch {
        if (attempt < maxRetries) await delay(backoff(attempt))
      }
    }
    // A cancel mid-retry leaves the chunk UNRECORDED (not errored) — the cache
    // makes a later resume cheap, and the caller can tell "cancelled" from "failed".
    if (aborted) break
    if (results) {
      chunk.forEach((w, i) => { out[w] = results[i] || { text: w, source: 'error' } })
    } else {
      chunk.forEach((w) => { out[w] = { text: w, source: 'error' } })
    }
    done += chunk.length
    if (onProgress) onProgress({ done, total: words.length })
  }
  return out
}
