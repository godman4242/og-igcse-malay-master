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

// ── Language direction ──────────────────────────────────────────────────────
// The popover used to translate ms→en unconditionally, so selecting an English
// word on an English surface produced nonsense. `detectLanguage` decides the
// source language so the component can translate the right way and file the
// card with `m` (Malay) / `e` (English) on the correct sides.
//
// Asymmetric on purpose: the app is Malay-first, so we DEFAULT to 'ms' and only
// flip to 'en' when we see real English signal. That makes the only dangerous
// case — an English word silently translated ms→en — the one we actively guard.

import DICTIONARY from '../data/dictionary'

// 804 known Malay headwords — the exact vocab a learner is likely to select.
const MALAY_WORDS = new Set(Object.keys(DICTIONARY).map(w => w.toLowerCase()))

// English suffixes that essentially never end a base Malay word. Length-gated so
// short coincidences (e.g. "kan", "lah") don't trip them.
const EN_SUFFIX = /(?:ing|tion|sion|ment|ness|ously|ous|able|ible|ful|ly|ed)$/
// High-frequency English function words — decisive when scoring a sentence.
const EN_FUNCTION = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'i', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'her', 'them',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as', 'but',
  'and', 'or', 'not', 'this', 'that', 'these', 'those', 'my', 'your', 'his',
  'what', 'where', 'when', 'who', 'why', 'how', 'which', 'do', 'does', 'did',
  'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'about',
])

// Does a single token carry decisive English signal? (suffix or function word)
function isEnglishToken(tok) {
  if (!tok) return false
  if (EN_FUNCTION.has(tok)) return true
  return tok.length >= 5 && EN_SUFFIX.test(tok)
}

// Score a blob of text: count tokens that vote Malay vs English. Malay is
// checked first so the app's primary language wins ambiguous tokens.
function scoreText(text) {
  let ms = 0, en = 0
  for (const tok of text.toLowerCase().split(/[^\p{L}]+/u)) {
    if (!tok) continue
    if (MALAY_WORDS.has(tok)) ms++
    else if (isEnglishToken(tok)) en++
  }
  return { ms, en }
}

// Decide the source language of `text` → 'ms' | 'en'.
// Priority: a strongly-marked term > the surrounding context sentence >
// the pageLang hint > default 'ms'.
export function detectLanguage(text, opts = {}) {
  const term = (text || '').trim()
  const termScore = scoreText(term)
  if (termScore.en > termScore.ms) return 'en'
  if (termScore.ms > termScore.en) return 'ms'

  // Lone word was unmarked — let the context sentence break the tie.
  if (opts.context) {
    const ctx = scoreText(opts.context)
    if (ctx.en > ctx.ms) return 'en'
    if (ctx.ms > ctx.en) return 'ms'
  }

  if (opts.pageLang === 'en' || opts.pageLang === 'ms') return opts.pageLang
  return 'ms'
}

// ── Card direction ──────────────────────────────────────────────────────────
import { glossPlanFor } from './glossPlan'

// Decide which side of a saved flashcard the selected term and its translation
// go on, honouring the learner's active `studyLang` (v34). The card's `m` is
// always the TARGET word being learned (in the study source language, plan.from)
// and `e` is the L1 gloss (plan.to); `lang` tags the deck so it joins the right
// v34 partition. Routing through glossPlanFor keeps Select-mode card direction
// consistent with Import + PDFReader (all one source of truth).
//
//   studyLang='ms' (plan.from='ms'): byte-identical to the legacy Malay-front card.
//   studyLang='en' (plan.from='en'): an English headword glossed in Malay → joins
//     the English (lang:'en') deck in the right direction instead of being filed
//     backwards (or invisible) in the English-scoped session.
//
// `source` is the detected language of `term` ('ms'|'en'); `translation` is its
// gloss in the other language. We place whichever of the two is in plan.from on `m`.
export function cardSidesFor({ term, translation, source }, studyLang) {
  const plan = glossPlanFor(studyLang)
  const termIsTarget = source === plan.from
  return {
    m: termIsTarget ? term : translation,
    e: termIsTarget ? translation : term,
    lang: plan.lang,
  }
}
