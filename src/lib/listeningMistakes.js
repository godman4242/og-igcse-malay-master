// "Close the listening loop" — pure helpers that turn Dictation / ClozeListening
// results into journal-worthy mistakes (no store access; the pages call
// addMistake with these, mirroring Listening.jsx's existing call shape).
//
// Why: retrieval failures need corrective follow-up to convert into learning
// (test-effect literature; PROJECT_VISION Phase 5 — "every mistake routes into
// the Mistake Journal and FSRS pipeline"). Listening/Comprehension already
// journal wrong answers; these two surfaces previously let errors evaporate.
//
// The store's auto-promotion gate (useStore.addMistake) needs category vocab/
// imbuhan + word + correct(gloss) + severity≥med + language 'ms' — pages use
// glossFor to fill `correct` from the dictionary; words without a gloss stay
// journal-only (the store gate already blocks their promotion).

// Same content-word notion as clozeListening's gap rule: alphabetic, ≥4
// letters, hyphenated reduplication (kanak-kanak) counts as one word.
const CONTENT_WORD_RE = /^[A-Za-zÀ-ɏ]+(?:-[A-Za-zÀ-ɏ]+)*$/
const MIN_LETTERS = 4

function isContentWord(word) {
  return CONTENT_WORD_RE.test(word) && word.replace(/-/g, '').length >= MIN_LETTERS
}

// Missed content words from a scoreDictation result ({ words: [{word, ok}] }).
// Longest-first (the most contentful misses), deduped, capped at `limit` so a
// completely flubbed sentence can't flood the journal.
export function missedDictationWords(scoreResult, { limit = 2 } = {}) {
  const words = Array.isArray(scoreResult?.words) ? scoreResult.words : []
  const missed = []
  const seen = new Set()
  for (const w of words) {
    if (w?.ok || typeof w?.word !== 'string') continue
    if (!isContentWord(w.word)) continue
    const key = w.word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    missed.push(w.word)
  }
  return missed.sort((a, b) => b.length - a.length).slice(0, limit)
}

// One record per WRONG cloze gap: the expected word + what the learner typed.
// Gaps/marks/answers are index-aligned (ClozeListening keeps them that way).
export function clozeGapMistakes(gaps, marks, answers) {
  if (!Array.isArray(gaps) || !Array.isArray(marks)) return []
  const out = []
  gaps.forEach((g, i) => {
    if (marks[i]?.ok || !g?.answer) return
    out.push({ word: g.answer, given: String(answers?.[i] ?? '').trim() })
  })
  return out
}

// English gloss for a word from the app dictionary, matched case-insensitively
// on the headword. Accepts BOTH dictionary shapes: the real
// src/data/dictionary.js OBJECT MAP ({ malay: english } — what the pages pass)
// and an array of { m, e } entries. '' when unknown — the caller passes it as
// `correct`, and the store's promotion gate treats '' as "do not promote"
// (journal-only).
export function glossFor(word, dictionary) {
  const w = String(word ?? '').trim().toLowerCase()
  if (!w || !dictionary) return ''
  if (Array.isArray(dictionary)) {
    const entry = dictionary.find(d => d?.m?.toLowerCase() === w)
    return entry?.e || ''
  }
  if (typeof dictionary === 'object') {
    const hit = dictionary[w]
    if (typeof hit === 'string') return hit
    // Headwords are lowercase in practice; fall back to a case-insensitive scan.
    const key = Object.keys(dictionary).find(k => k.toLowerCase() === w)
    return key && typeof dictionary[key] === 'string' ? dictionary[key] : ''
  }
  return ''
}
