// Lazy loader for the high-frequency English word list (the base "known word"
// set for the reader's dense-page easing on English docs). Keeps the ~16 KB
// asset out of the eager bundle and memoises the promise so repeated reads share
// one fetch. Mirrors enDictionary.js. Returns the words as an array.
let _enFreqPromise = null
export const loadEnglishFrequency = () =>
  (_enFreqPromise ||= import('../data/englishFrequency').then((m) => m.default.split('\n')))
