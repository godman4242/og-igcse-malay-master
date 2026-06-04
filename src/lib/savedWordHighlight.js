// Pure word-finder for Tier-2 persistent highlighting of saved words.
// Given a string of page text and the learner's saved Malay terms, return the
// non-overlapping character spans to highlight. No DOM, no CSS — the DOM walk
// + CSS Custom Highlight registration that consumes these lives in the
// useSavedWordHighlights hook. Fully unit-tested.

// Escape a saved term so its characters are matched literally inside a RegExp.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build one case-insensitive, Unicode-aware regex that matches any saved term
// as a *whole* word/phrase. Longer terms come first so an alternation prefers
// "rumah sakit" over the bare "rumah" inside it. Letter/number lookarounds act
// as boundaries (so 'ada' won't match inside 'kepada'); a hyphen is a boundary,
// which is what we want for reduplication like 'jalan-jalan'.
function buildRegex(words) {
  const cleaned = [...new Set(words.map(w => w.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
  if (!cleaned.length) return null
  const alt = cleaned.map(escapeRegExp).join('|')
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, 'giu')
}

// Pick which Malay words to highlight given the user's setting:
//   'off'   → none
//   'saved' → only words they personally captured (the 'Saved' deck)  [default]
//   'all'   → every Malay word across all decks
// Returns a de-duplicated list of non-empty Malay terms.
export function savedWordsForMode(cards, mode) {
  if (mode === 'off' || !Array.isArray(cards)) return []
  const wanted = mode === 'all' ? cards : cards.filter(c => c.t === 'Saved')
  return [...new Set(wanted.map(c => c.m).filter(Boolean))]
}

// matchAtOffset(text, offset, words) → the full { start, end, word } match covering
// `offset`, else null. Reuses findSavedWordMatches so tap-targeting shares the exact
// same notion of a "saved word" as the highlighter (whole-word, longest-match,
// reduplication). The span is half-open [start, end): an offset == end is the
// boundary AFTER the word (the space), correctly NOT a hit. The tap hook uses this
// (it needs start/end to position the popover over the word).
export function matchAtOffset(text, offset, words) {
  if (typeof offset !== 'number') return null
  return findSavedWordMatches(text, words).find(m => offset >= m.start && offset < m.end) || null
}

// wordAtOffset(text, offset, words) → just the lowercased saved word at `offset`,
// else null. The pure decision "did the tap land on a saved word?", unit-tested.
export function wordAtOffset(text, offset, words) {
  return matchAtOffset(text, offset, words)?.word ?? null
}

// findSavedWordMatches(text, words) → [{ start, end, word }] in document order,
// non-overlapping (the global regex advances past each match).
export function findSavedWordMatches(text, words) {
  if (!text || !Array.isArray(words) || !words.length) return []
  const re = buildRegex(words)
  if (!re) return []
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, word: m[0].toLowerCase() })
  }
  return out
}
