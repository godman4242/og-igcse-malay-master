// Pure whole-word matching for the roleplay scorecard's key-vocab / key-imbuhan
// detection + highlighting. Replaces a naive substring `.includes()` that
// credited a key word when it only appeared INSIDE a different, unrelated word
// — e.g. keyVocab 'menu' matching inside 'menunggu' (to wait), firing a false
// green "✓ used" chip and mangling the highlight. Same whole-word, Unicode-aware
// boundary notion as savedWordHighlight.js / blankWord.js (letter/number
// lookarounds; a hyphen is a boundary, so reduplication 'gula-gula' and phrases
// 'kapal terbang' still match as a unit).

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// containsWholeWord(text, word) → true if `word` (a word or multi-word phrase)
// occurs as a WHOLE word/phrase in `text`, case-insensitively. Non-string /
// empty inputs → false (never throws — drop-in for `text.includes(word)`).
export function containsWholeWord(text, word) {
  const t = typeof text === 'string' ? text : ''
  const w = typeof word === 'string' ? word.trim() : ''
  if (!t || !w) return false
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escapeRegExp(w)})(?![\\p{L}\\p{N}])`, 'iu')
  return re.test(t)
}

// wholeWordSplitRegex(words) → a global, capturing regex matching any of `words`
// as a WHOLE word/phrase (longest first, so 'kapal terbang' beats 'kapal'). The
// capture group keeps the matched delimiters when used with String.split (for
// highlighting). null when no non-empty word.
export function wholeWordSplitRegex(words) {
  const cleaned = [...new Set((Array.isArray(words) ? words : [])
    .map(w => (typeof w === 'string' ? w.trim() : '')).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
  if (!cleaned.length) return null
  const alt = cleaned.map(escapeRegExp).join('|')
  // One capture group (kept by String.split) wrapped in whole-word lookarounds.
  return new RegExp(`((?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}]))`, 'giu')
}
