// F5 Increment 5 (True English study mode, Fork I) — passage-picker ordering.
//
// Pure leaf module, deliberately shaped like interests.js: a stable
// "reorder, don't filter" sort so the Comprehension (Paper 1) and Listening
// (Paper 4) pickers LEAD with the learner's active study language without ever
// hiding the other language's passages. No React, no store imports — vitest
// pins the contract without spinning up JSDOM.
//
// Why lead-not-filter: matches the app's non-punitive UX (an English learner
// can still scroll down to a Malay passage) and mirrors how
// prioritiseByInterests floats starred topics up without dropping the rest.

// Pure: stable-sort `items` so anything in the active study language floats to
// the top. Within the "active-language" and "other-language" groups the
// original order is preserved (the explicit `idx` tiebreak keeps the stable
// contract obvious and independent of engine sort guarantees) — so when
// Comprehension feeds an already interest-prioritised array, language becomes
// the PRIMARY key and the interest order rides along as the stable secondary.
//
// `lang` is the studyLang signal ('en' leads English; anything else, including
// undefined / garbage, falls back to the Malay default — matching studyLang's
// own 'ms' default). `getLang(item) → 'en'｜'ms'｜…` lets the caller point at
// the language field: Listening passes raw passages (default accessor reads
// `item.lang`); Comprehension passes `{ item, matchedInterests }` wrappers and
// supplies `(w) => w.item.lang`. Items with no language sink to the bottom group.
export function leadByLang(items, lang, getLang = (it) => (it && it.lang) || '') {
  if (!Array.isArray(items)) return []
  const target = lang === 'en' ? 'en' : 'ms'
  const decorated = items.map((item, idx) => ({ item, idx }))
  decorated.sort((a, b) => {
    const aHit = getLang(a.item) === target
    const bHit = getLang(b.item) === target
    if (aHit !== bHit) return aHit ? -1 : 1
    return a.idx - b.idx
  })
  return decorated.map((d) => d.item)
}
