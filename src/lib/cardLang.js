// The deck is ONE array partitioned by card.lang. This guard ('ms' when absent)
// lives in exactly one place so every consumer (Dashboard counts, Study source,
// Smart-Study focal pool) filters identically and pre-v34 cards stay Malay.
export const LANGS = ['ms', 'en']

/** The card's study language, defaulting un-tagged (pre-v34) cards to Malay. */
export function cardLang(card) {
  return card && card.lang === 'en' ? 'en' : 'ms'
}

/** Cards whose study language matches `lang` ('en' or — for anything else — 'ms'). */
export function cardsForLang(cards, lang) {
  if (!Array.isArray(cards)) return []
  const want = lang === 'en' ? 'en' : 'ms'
  return cards.filter((c) => cardLang(c) === want)
}
