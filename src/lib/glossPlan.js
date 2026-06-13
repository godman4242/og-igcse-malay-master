// The source-language plan for the card-creation gloss path (Import + PDF reader).
// The active `studyLang` signals the SOURCE language of the text the learner is
// working with, which fixes the gloss direction:
//   'en' → an English headword glossed in Malay (English→Malay), no Malay stemmer,
//          card stamped lang:'en' (it joins the English deck).
//   'ms' → the legacy Malay→English path with the Malay stemmer (lang:'ms').
// Pure; the decision lives in ONE place so Import and the reader can't diverge
// (mirrors localeFor / cardsForLang). The dictionary itself is INJECTED by the
// caller — dictionaryEn stays a lazy chunk (N4) — this only returns the direction.
export function glossPlanFor(studyLang) {
  return studyLang === 'en'
    ? { lang: 'en', from: 'en', to: 'ms', useStemmer: false }
    : { lang: 'ms', from: 'ms', to: 'en', useStemmer: true }
}
