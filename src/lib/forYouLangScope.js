// src/lib/forYouLangScope.js
//
// Pure: scope the language-TAGGED "For You" signals to the active study language
// so the page's "Keep going" daily plan + weak-spot signals reflect ONLY the
// language being studied (v34 no-mixing), matching the card slice ForYou already
// scopes via cardsForLang. buildDailyPlan / learnerProfile / the Dashboard plan
// are UNTOUCHED — this filters the INPUTS at the ForYou call site, so a key
// behaviour ("Keep going" mirrors the Dashboard plan) only diverges for a
// bilingual user, which is the intended v34 scoping (ForYou is the scoped surface).
//
// Field conventions (verified against source 2026-06-14):
//   mistakes[].language     'ms' | 'en'    — untagged = pre-v34 legacy → Malay only
//   speakingHistory[].lang   'eng'|'malay' — Speaking.jsx logSpeakingSession({lang})
//   writingHistory[].lang    'eng'|'malay' — learnerProfile.langKeyWriting
//   grammarCards key          'eng-…' = English drill, else Malay (grammarEng.js;
//                             Malay ids are error-/imbuhan-/tense-…, never eng-)

function arr(v) {
  return Array.isArray(v) ? v : []
}

// 'ms'|'en' studyLang → the 'eng'|'malay' key used by writing/speaking history.
function speechKey(lang) {
  return lang === 'en' ? 'eng' : 'malay'
}

// Keep a record whose language field is the 'ms'|'en' style (mistakes). An
// untagged record is pre-v34 legacy (Malay era) → kept ONLY for the Malay scope,
// never leaking into an English session. Mirrors learnerProfile.focusTopics intent
// (untagged is treated as Malay) but is STRICTER for English (no legacy bleed).
export function keepByLanguage(recordLang, lang) {
  if (!recordLang) return lang === 'ms'
  return lang === 'en' ? recordLang === 'en' : recordLang === 'ms'
}

// Keep a record whose language field is the 'eng'|'malay' style (writing/speaking).
export function keepBySpeechLang(recordLang, lang) {
  if (!recordLang) return lang === 'ms'
  return recordLang === speechKey(lang)
}

export function scopeMistakes(mistakes, lang) {
  return arr(mistakes).filter(m => m && keepByLanguage(m.language, lang))
}

export function scopeSpeaking(history, lang) {
  return arr(history).filter(e => e && keepBySpeechLang(e.lang, lang))
}

export function scopeWriting(history, lang) {
  return arr(history).filter(e => e && keepBySpeechLang(e.lang, lang))
}

// grammarCards is an object keyed by drill id; English drills are id-prefixed
// 'eng-'. Returns a new object with only the active language's drills.
export function scopeGrammarCards(grammarCards, lang) {
  const src = grammarCards && typeof grammarCards === 'object' ? grammarCards : {}
  const wantEng = lang === 'en'
  const out = {}
  for (const [id, card] of Object.entries(src)) {
    if (id.startsWith('eng-') === wantEng) out[id] = card
  }
  return out
}
