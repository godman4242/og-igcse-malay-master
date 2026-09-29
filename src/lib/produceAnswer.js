import DICTIONARY from '../data/dictionary'

// Typed-answer normaliser for the "gloss → type the word" drills. iOS Smart
// Punctuation types ’ for ' — "don’t" must match "don't" (TypeMode's rule).
export const normAnswer = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()

// The dictionary gives 21 glosses to 2–3 words ("you" = awak/engkau/kamu), so the
// gloss alone can't tell the learner WHICH word a card wants. Another word the app
// itself glosses the same way (dictionary, Malay cards only, or a same-language
// card in their deck) is a near miss: real Malay, not this card's word — neither
// credited (it may not fit the context sentence) nor marked wrong.
export function isSameGlossWord(typed, card, deck = []) {
  const t = normAnswer(typed)
  const gloss = normAnswer(card.e)
  if (!t || !gloss || t === normAnswer(card.m)) return false
  const isEn = card.lang === 'en'
  if (!isEn && Object.hasOwn(DICTIONARY, t) && normAnswer(DICTIONARY[t]) === gloss) return true
  return deck.some(c => (c.lang === 'en') === isEn && normAnswer(c.m) === t && normAnswer(c.e) === gloss)
}

export const nearMissText = (typed, card) => `“${typed}” means “${card.e}” too, but this card wants another word. Try again.`
