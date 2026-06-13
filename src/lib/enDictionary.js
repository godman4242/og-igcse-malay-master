// Lazy loader for the reversed English→Malay study seed. Keeps dictionaryEn out
// of the eager bundle (guardrail N4) and memoises the promise so the Import page
// and the PDF reader share one fetch. The store's seedEnglishStarter imports the
// same module directly — Vite dedupes them to one chunk regardless.
let _enDictPromise = null
export const loadEnDictionary = () => (_enDictPromise ||= import('../data/dictionaryEn').then((m) => m.default))
