// Pure helper: blank the target word inside its own example sentence for the
// produce/cloze study surfaces (FlashcardMode, ProduceMode, ClozeMode,
// MixedSession). Replaces a naive substring `.replace(/word/gi)` that was
// duplicated at 7 sites and blanked MID-WORD — e.g. "compute" inside
// "Computers can compute…" became "_____rs can _____…", mangling the word AND
// leaking the answer (the leftover "rs" ⇒ "Computers" ⇒ the word is "compute").
//
// Uses the SAME whole-word, Unicode-aware boundary notion as
// savedWordHighlight.js ("so 'ada' won't match inside 'kepada'"): letter/number
// lookarounds, hyphen treated as a boundary (reduplication like 'jalan-jalan'
// still matches as a whole). Blanks ALL whole-word occurrences (preserving the
// old `g`-flag multiplicity — the bug was substring matching, not multiplicity).

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// blankInExample(sentence, word, blank='_____') → sentence with every whole-word
// occurrence of `word` replaced by `blank`. Non-string sentence / empty word →
// the sentence coerced to a string (never throws — drop-in for `card.ex.replace`).
export function blankInExample(sentence, word, blank = '_____') {
  const text = typeof sentence === 'string' ? sentence : ''
  const w = typeof word === 'string' ? word.trim() : ''
  if (!text || !w) return text
  // Whole-word, case-insensitive, Unicode-aware — same boundary notion as
  // savedWordHighlight.js (letter/number lookarounds; hyphen is a boundary).
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escapeRegExp(w)})(?![\\p{L}\\p{N}])`, 'giu')
  return text.replace(re, blank)
}
