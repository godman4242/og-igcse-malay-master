// Unknown-word density for a PDF page (Claim 6 — ease the reveal-gate when a
// passage is demonstrably too hard). The reveal-gate is a *desirable difficulty*
// only when the text is within reach (Bjork/Sweller): for a page where most
// words are unknown, Malay-only makes a genuine beginner flounder. This computes
// the proxy signal — the fraction of CONTENT running words the learner has no
// known gloss for — so the PDFReader can offer (never force) the English layer.
//
// Single source of truth: classification reuses `normalizeWord` and the same
// "known = built-in dictionary OR grounding-verified" test the gloss layer uses
// (collectDocTokens / buildGlossIndex). Machine-translation cache hits do NOT
// count as known — they're unknown words we happened to auto-gloss, not words
// the learner knows.
import { normalizeWord } from './translateDocument.js'

// Conservative trigger: Nation puts comprehension at ~95–98% known running
// words, and unaided reading already strains past ~5–10% unknown. 40% unknown
// is unambiguously beyond reach → minimises false nudges on healthy
// desirable-difficulty text. Tunable; validate with telemetry post-ship.
export const DENSE_THRESHOLD = 0.4

// Don't nudge on a sliver of text (a title page, a caption) — "a lot of new
// words" only means something over a real stretch of running words.
export const MIN_DENSE_TOKENS = 20

const HAS_LETTER = /\p{L}/u

/**
 * @param {Array<string|{word:string}>} tokens  page tokens (strings or {word})
 * @param {Record<string,unknown>} [dictionary]  built-in DICTIONARY (norm → entry)
 * @param {Map} [groundingIndex]  from buildGroundingIndex (norm → {en,senses})
 * @param {(norm:string)=>boolean} [isKnown]  optional injected "known?" predicate.
 *   The Malay path omits it (dictionary + grounding index, byte-identical). The
 *   English path injects a `makeIsKnownEnglish` predicate — English can't use the
 *   Malay dictionary/grounding, so the caller supplies its own known-word test.
 * @returns {{unknown:number, total:number, ratio:number}}
 */
export function unknownDensity(tokens, dictionary = {}, groundingIndex, isKnown) {
  let total = 0
  let unknown = 0
  const grounded = groundingIndex instanceof Map
  const hasPredicate = typeof isKnown === 'function'
  for (const t of tokens || []) {
    const raw = typeof t === 'string' ? t : (t && t.word)
    const norm = normalizeWord(raw)
    // Content words only: ≥ 2 chars AND containing a letter (drops punctuation,
    // pure numbers, and single characters).
    if (!norm || norm.length <= 1 || !HAS_LETTER.test(norm)) continue
    total += 1
    const known = hasPredicate
      ? isKnown(norm)
      : ((dictionary && dictionary[norm]) || (grounded && groundingIndex.has(norm)))
    if (!known) unknown += 1
  }
  return { unknown, total, ratio: total === 0 ? 0 : unknown / total }
}

/**
 * Is this page dense enough to offer the English-help nudge? True only over a
 * real stretch of text (≥ MIN_DENSE_TOKENS content words) AND at/above the
 * unknown-ratio threshold. The boundary is inclusive (ratio === threshold is
 * dense).
 * @param {{total:number, ratio:number}} result  from unknownDensity()
 */
export function isDense(result) {
  const total = result?.total || 0
  const ratio = result?.ratio || 0
  return total >= MIN_DENSE_TOKENS && ratio >= DENSE_THRESHOLD
}
