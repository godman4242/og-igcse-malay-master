// Word-by-word translation → renderable vocab chips (Issue 1).
//
// The raw word-by-word result (from Import's processWordByWord) interleaves real
// vocab tokens with 'skip' tokens (pure punctuation / whitespace). The chip grid
// is a scannable VOCAB reference, not a reading view, so skip tokens are dropped
// and each remaining token becomes a chip with a normalized source + a meaning
// that always renders ('?' when a gloss is missing). Per-source counts feed the
// summary header. Pure + deterministic so it's unit-testable.

export const WBW_SOURCES = ['dict', 'stem', 'google', 'unknown']

export function buildWbwChips(tokens) {
  const counts = { dict: 0, stem: 0, google: 0, unknown: 0 }
  const chips = []
  if (!Array.isArray(tokens)) return { chips, counts }
  for (const t of tokens) {
    if (!t || t.source === 'skip') continue
    const source = WBW_SOURCES.includes(t.source) ? t.source : 'unknown'
    chips.push({ word: t.word, meaning: t.meaning ?? '?', source })
    counts[source] += 1
  }
  return { chips, counts }
}
