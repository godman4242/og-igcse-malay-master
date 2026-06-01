// Pure helpers for the universal select→translate→add-to-cards feature
// (spec 2026-06-01-universal-select-to-card-design.md, MVP/Tier 1). Decide
// whether a raw text selection is worth offering as a flashcard, and normalize
// it to a clean term. No DOM, no network — fully unit-tested; the popover that
// uses these lives in src/components/SelectionToCard.jsx.

const MAX_WORDS = 6

// A "letter" for our purposes = any Unicode letter (Malay is Latin-script, but
// stay permissive). We only require that the cleaned term contains at least one
// letter — that's what rules out numbers-only and punctuation-only selections.
const HAS_LETTER = /\p{L}/u
// Punctuation/symbols to peel off the OUTER edges of each token. Inner hyphens
// and apostrophes are preserved (jalan-jalan, covid-19, it's).
const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu

// Normalize a raw selection → { term, wordCount } or null when it isn't a
// sensible card (empty, too long, or no actual word in it).
export function normalizeSelection(rawText) {
  if (typeof rawText !== 'string') return null
  const collapsed = rawText.replace(/\s+/g, ' ').trim()
  if (!collapsed) return null

  const tokens = collapsed
    .split(' ')
    .map(t => t.replace(EDGE_PUNCT, ''))
    .filter(Boolean)
  if (!tokens.length) return null
  if (tokens.length > MAX_WORDS) return null

  const term = tokens.join(' ')
  if (!HAS_LETTER.test(term)) return null // numbers-only / punctuation-only

  return { term, wordCount: tokens.length }
}

// Boolean wrapper: is this selection worth offering as a card?
export function isCardWorthy(rawText) {
  return normalizeSelection(rawText) !== null
}
