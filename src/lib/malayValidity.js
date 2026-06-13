// src/lib/malayValidity.js
//
// Tier-2 grounding — a permissive (CC-BY 4.0) real-Malay-word VALIDITY check.
// Sits ABOVE Tier 1 (owned dictionary, src/lib/dictionaryGrounding.js) and below
// Tier 3 (CC0 Wikidata translations). Its ONE job: tell us whether an AI-proposed
// Malay word is a genuine word (so we can catch invented non-words) — it does NOT,
// and must never, confirm that the *translation* is right. So it only ever
// decorates the deck confirm-flow's "Check these" rows with a label; it never
// auto-verifies a pair (that stays Tier 1/3's job).
//
// Source/licence: iannho/Malay-Dataset dictionary/Malays.dic.txt (24.5k words,
// CC-BY 4.0) → src/data/malayValidityList.js (generated, lazy-imported).
// Decision: docs/superpowers/specs/2026-06-06-for-you-phase2-dictionary-licensing.md

function normWord(s) {
  return typeof s === 'string' ? s.toLowerCase().trim() : ''
}

/**
 * Build a fast lookup Set from the newline-delimited validity asset (or an array
 * of words). Lowercases, trims and drops blanks. Never throws.
 *
 * @param {string|string[]} source
 * @returns {Set<string>}
 */
export function buildValiditySet(source) {
  const set = new Set()
  const lines = typeof source === 'string' ? source.split('\n') : Array.isArray(source) ? source : []
  for (const line of lines) {
    const w = normWord(line)
    if (w) set.add(w)
  }
  return set
}

/**
 * Is `word` a real Malay word per the validity list? A multi-word phrase counts
 * as real only when EVERY whitespace-separated token is itself a real word (so
 * "makan malam" passes, "makan zzz" does not). Case/space-insensitive.
 *
 * Note: a `false` here means "not found in the list", NOT "definitely fake" — the
 * list omits some rarer inflected forms — so callers must only ever show a
 * POSITIVE label on `true`, never a warning on `false`.
 *
 * @param {string} word
 * @param {Set<string>} validitySet
 * @returns {boolean}
 */
export function isRealMalayWord(word, validitySet) {
  if (!(validitySet instanceof Set)) return false
  const w = normWord(word)
  if (!w) return false
  if (validitySet.has(w)) return true
  const tokens = w.split(/\s+/)
  if (tokens.length < 2) return false
  return tokens.every((t) => validitySet.has(t))
}

/**
 * Annotate the confirm-flow's "review" candidates with a `validWord` flag.
 * Additive only — returns a NEW array of NEW objects, preserving every existing
 * field (e/ex/suggestion/canonicalEn). Never changes verified/translation status.
 *
 * @param {Array<{m:string}>} reviewItems
 * @param {Set<string>} validitySet
 * @returns {Array<object>}
 */
export function annotateValidity(reviewItems, validitySet) {
  return (Array.isArray(reviewItems) ? reviewItems : []).map((c) => ({
    ...c,
    validWord: isRealMalayWord(c && c.m, validitySet),
  }))
}
