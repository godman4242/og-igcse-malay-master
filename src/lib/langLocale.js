// Single source of truth for the speech locale of a study language. Study modes
// must call this instead of hardcoding 'ms-MY' (spec Q-LOCALE). IGCSE English is
// the British exam → 'en-GB'. Unknown/undefined → Malay (back-compat: cards from
// before the v34 `lang` field are Malay).
export function localeFor(lang) {
  return lang === 'en' ? 'en-GB' : 'ms-MY'
}
