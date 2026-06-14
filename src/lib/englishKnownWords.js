// English "known word" classification for the reader's dense-page easing.
//
// Mirrors the Malay grounding path's job (collectDocTokens / buildGroundingIndex)
// but for an English (0510 ESL) learner reading an English doc: a word counts as
// "known" if it — or a lightly de-inflected form of it — is in the learner's
// reachable English vocabulary. That set is a BLEND (spec Fork 1):
//   • a high-frequency English list (the principled base — Nation's running-word
//     coverage research, the same basis as unknownDensity's 40% threshold),
//   • the dictionaryEn 682-headword IGCSE seed,
//   • the learner's own lang:'en' cards.
//
// No Malay stemmer here — English needs different inflection rules. We keep the
// known LIST untouched and instead generate a few regular de-inflected CANDIDATES
// from the surface token, testing each against the set. Over-generation is safe:
// a garbage candidate only matters if it coincidentally equals a real known word,
// and the only effect is counting a token as "known" → the proxy errs toward
// FEWER nudges (conservative), never toward a wrong gloss.
//
// Pure: no DOM, no network, no store. The frequency list / seed / cards are all
// INJECTED by the caller (PDFReader lazy-loads them), so this stays unit-testable
// and the data assets stay lazy chunks.
import { normalizeWord } from './translateDocument.js'

const isVowel = (c) => c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u'

// 'runn' → 'run' (trailing doubled consonant collapses to one). Returns null if
// the word doesn't end in a doubled consonant.
function undouble(s) {
  const n = s.length
  if (n >= 3 && s[n - 1] === s[n - 2] && !isVowel(s[n - 1])) return s.slice(0, -1)
  return null
}

/**
 * Regular de-inflected base-form candidates for an English surface word.
 * Returns ONLY candidates (never the surface word itself), each ≥ 2 chars.
 * Covers: possessive, plural/3sg (-s/-es/-ies), past (-ed incl. e-restore +
 * doubled consonant), gerund (-ing incl. e-restore + doubled consonant),
 * comparative/superlative (-er/-est, -ier/-iest→y), adverb (-ly, -ily→y).
 * @param {string} word
 * @returns {string[]}
 */
export function enLemmaCandidates(word) {
  const w = typeof word === 'string' ? word.toLowerCase() : ''
  if (w.length < 3) return []
  const out = new Set()
  const add = (s) => { if (s && s.length >= 2 && s !== w) out.add(s) }

  // possessive: teacher's → teacher  ('’s' curly too)
  if (w.endsWith("'s") || w.endsWith('’s')) add(w.slice(0, -2))

  // -ies → y : studies → study, parties → party
  if (w.length > 4 && w.endsWith('ies')) add(`${w.slice(0, -3)}y`)
  // -es → strip 'es' and 'e' : boxes → box, wishes → wish, buses → bus
  if (w.length > 3 && w.endsWith('es')) { add(w.slice(0, -2)); add(w.slice(0, -1)) }
  // generic plural / 3sg -s : cats → cat, runs → run. Skip -ss/-us/-is (class, bus, this).
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
    add(w.slice(0, -1))
  }

  // -ied → y : studied → study
  if (w.length > 4 && w.endsWith('ied')) add(`${w.slice(0, -3)}y`)
  // past -ed : walked → walk; used → use (e-restore); stopped → stop (undouble)
  if (w.length > 3 && w.endsWith('ed')) {
    const base = w.slice(0, -2)
    add(base)
    add(`${base}e`)
    add(undouble(base))
  }
  // gerund -ing : reading → read; making → make (e-restore); running → run (undouble)
  if (w.length > 4 && w.endsWith('ing')) {
    const base = w.slice(0, -3)
    add(base)
    add(`${base}e`)
    add(undouble(base))
  }

  // superlative
  if (w.length > 4 && w.endsWith('iest')) add(`${w.slice(0, -4)}y`)        // happiest → happy
  else if (w.length > 4 && w.endsWith('est')) { const b = w.slice(0, -3); add(b); add(undouble(b)) } // fastest→fast, biggest→big
  // comparative
  if (w.length > 4 && w.endsWith('ier')) add(`${w.slice(0, -3)}y`)          // happier → happy
  else if (w.length > 3 && w.endsWith('er')) { const b = w.slice(0, -2); add(b); add(undouble(b)) } // faster→fast, bigger→big

  // adverb -ly : quickly → quick; happily/easily → happy/easy
  if (w.length > 4 && w.endsWith('ily')) add(`${w.slice(0, -3)}y`)
  else if (w.length > 3 && w.endsWith('ly')) add(w.slice(0, -2))

  return [...out]
}

// Add every component word of a (possibly multi-word) entry to the set, normalised.
// Splits on whitespace so seed/card headwords like 'a little' contribute 'little'.
function addEntry(set, raw) {
  if (typeof raw !== 'string') return
  for (const part of raw.toLowerCase().split(/\s+/)) {
    const norm = normalizeWord(part)
    if (norm && norm.length >= 2) set.add(norm)
  }
}

/**
 * Build the blended "known English" set from the three injected sources.
 * @param {object} [opts]
 * @param {string[]} [opts.frequency]  high-frequency English word list (the base)
 * @param {string[]} [opts.seed]       dictionaryEn headwords (English side)
 * @param {Array<string|{m:string}>} [opts.cards]  the learner's lang:'en' cards (or m-strings)
 * @returns {Set<string>}
 */
export function buildKnownEnglish({ frequency = [], seed = [], cards = [] } = {}) {
  const set = new Set()
  for (const w of frequency || []) addEntry(set, w)
  for (const w of seed || []) addEntry(set, w)
  for (const c of cards || []) addEntry(set, typeof c === 'string' ? c : (c && c.m))
  return set
}

/**
 * Make a predicate `(word) => boolean`: known if its normalised surface form is in
 * the set OR any regular de-inflected candidate is. Shaped for `unknownDensity`'s
 * injected `isKnown` 4th argument.
 * @param {Set<string>} knownSet
 */
export function makeIsKnownEnglish(knownSet) {
  const set = knownSet instanceof Set ? knownSet : new Set()
  return (word) => {
    const norm = normalizeWord(word)
    if (!norm || norm.length < 2) return false
    if (set.has(norm)) return true
    for (const cand of enLemmaCandidates(norm)) if (set.has(cand)) return true
    return false
  }
}
