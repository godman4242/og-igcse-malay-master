import DICTIONARY from '../data/dictionary'
import { PLACEHOLDER_EX } from './speakTarget'

// Typed-answer normaliser for the "gloss → type the word" drills. iOS Smart
// Punctuation types ’ for ' — "don’t" must match "don't" (TypeMode's rule).
export const normAnswer = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()

// Same word, so a typed answer is correct (2026-09-29 review P3-2). Malay cards only.
// Spelling variants share ONE sense: PRPM — baru and baharu are both the adjective
// "new"; only baru is the auxiliary "just" (baru sampai), so the card's gloss must be
// that sense alone. -kah is the question particle on a question word (bila → bilakah),
// so it is added only when the card's context sentence, if any, is a question — the
// app's placeholder `ex` (`bila (when).`, `bila — when`) is no context sentence.
const SPELLING_VARIANTS = [{ words: ['baru', 'baharu'], gloss: 'new' }]
const KAH_QUESTION_WORDS = new Set(['apa', 'siapa', 'bila', 'mana', 'mengapa', 'kenapa', 'bagaimana', 'berapa'])
const isQuestionContext = (ex, m) => !ex || ex.includes('?') || PLACEHOLDER_EX.test(ex) || normAnswer(ex).startsWith(`${m} — `)
const withoutKah = w => (w.endsWith('kah') && KAH_QUESTION_WORDS.has(w.slice(0, -3).split(' ').pop()) ? w.slice(0, -3) : w)

export function isProducedMatch(typed, card) {
  const t = normAnswer(typed)
  const m = normAnswer(card.m)
  if (!t) return false
  if (t === m) return true
  if (card.lang === 'en') return false
  if (withoutKah(t) === m) return isQuestionContext(card.ex, m)
  if (withoutKah(m) === t) return true
  const senses = normAnswer(card.e).split(/\s*[;,/]\s*/)
  return SPELLING_VARIANTS.some(v => v.words.includes(t) && v.words.includes(m) && senses.every(s => s === v.gloss))
}

// The dictionary gives 21 glosses to 2–3 words ("you" = awak/engkau/kamu), so the
// gloss alone can't tell the learner WHICH word a card wants. Another word the app
// itself glosses the same way (dictionary, Malay cards only, or a same-language
// card in their deck) is a near miss: real Malay, not this card's word — neither
// credited (it may not fit the context sentence) nor marked wrong.
export function isSameGlossWord(typed, card, deck = []) {
  const t = normAnswer(typed)
  const gloss = normAnswer(card.e)
  if (!t || !gloss || isProducedMatch(t, card)) return false
  const isEn = card.lang === 'en'
  if (!isEn && Object.hasOwn(DICTIONARY, t) && normAnswer(DICTIONARY[t]) === gloss) return true
  return deck.some(c => (c.lang === 'en') === isEn && normAnswer(c.m) === t && normAnswer(c.e) === gloss)
}

export const nearMissText = (typed, card) => `“${typed}” means “${card.e}” too, but this card wants another word. Try again.`
