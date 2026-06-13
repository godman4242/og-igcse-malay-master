// Cloze-listening (review feature #10) — pure helpers (no DOM/TTS).
// The learner HEARS a sentence while its transcript is VISIBLE with 1-2 words
// blanked; they fill the gaps. Bridges dictation (text hidden, type all) and
// reading cloze: retrieval + listening in one drill.
//
// Corpus plumbing reuses dictation.js (same Paper-4 passages, same sentence
// splitter — zero new content authored, no native-speaker risk). NOT built on
// clozeBuilder.makeClozeItem: that is CARD-shaped (blanks a saved word inside
// the card's own example); here gaps are chosen from arbitrary corpus
// sentences. Selection is deterministic via an injected rand (no Math.random
// in render — React 19 purity).

import { buildDictationSet } from './dictation'

// A gap candidate is an alphabetic word (hyphenated reduplication like
// kanak-kanak counts as ONE word) with ≥4 letters, never the sentence's first
// word (its capitalisation + position make it a giveaway and a grammar anchor).
const MIN_GAP_LETTERS = 4
const MAX_GAPS = 2

const WORD_RE = /[A-Za-zÀ-ɏ]+(?:-[A-Za-zÀ-ɏ]+)*/g

function gapCandidates(sentence) {
  const out = []
  const re = new RegExp(WORD_RE.source, 'g')
  let m
  let first = true
  while ((m = re.exec(sentence))) {
    const word = m[0]
    if (first) { first = false; continue }
    if (word.replace(/-/g, '').length < MIN_GAP_LETTERS) continue
    out.push({ start: m.index, end: m.index + word.length, answer: word })
  }
  return out
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// buildClozeFromSentence(sentence, rand) →
//   { sentence, gaps: [{ start, end, answer }] }  with 1-2 gaps, sorted by
//     position, no duplicate answers (case-insensitive), OR
//   null  when no word qualifies (gap-less cloze is not a drill).
export function buildClozeFromSentence(sentence, rand = Math.random) {
  if (typeof sentence !== 'string' || !sentence) return null
  const candidates = gapCandidates(sentence)
  if (!candidates.length) return null

  const gaps = []
  const seen = new Set()
  for (const c of shuffleInPlace([...candidates], rand)) {
    const key = c.answer.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    gaps.push(c)
    if (gaps.length === MAX_GAPS) break
  }
  gaps.sort((a, b) => a.start - b.start)
  return { sentence, gaps }
}

// Flatten one language's passages into cloze items (sentence + provenance +
// gaps), shuffled and capped via the same injected-rand pattern as
// pickDictationItems. Sentences with no qualifying gap word are skipped.
export function buildClozeListeningSet(passages, lang, count = 5, rand = Math.random) {
  const items = []
  for (const s of buildDictationSet(passages, lang)) {
    const cloze = buildClozeFromSentence(s.sentence, rand)
    if (cloze) items.push({ ...s, gaps: cloze.gaps })
  }
  return shuffleInPlace(items, rand).slice(0, count)
}

// Per-gap check: exact word match, case-insensitive, sentence punctuation and
// surrounding whitespace neutralised (same character set as dictation's
// normalize). Hyphens are kept — kanak-kanak must be typed hyphenated.
export function checkGap(expected, typed) {
  const norm = v => String(v ?? '').toLowerCase().replace(/[.,!?;:'"()]/g, '').trim()
  const t = norm(typed)
  return !!t && t === norm(expected)
}
