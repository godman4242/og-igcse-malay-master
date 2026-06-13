// "Close the listening loop" (kickoff 2026-06-13) — pure extraction of
// journal-worthy mistakes from Dictation + ClozeListening results, so listening
// errors stop evaporating (Vision Phase 5: every mistake routes into the
// Mistake Journal / FSRS pipeline; Listening.jsx:187 is the existing precedent).
//
// Baked rules: dictation logs at most `limit` (default 2) missed CONTENT words
// per sentence (alphabetic, ≥4 letters, hyphenated reduplication = one word,
// longest-first, deduped) so one flubbed sentence can't flood the journal.
// Cloze logs every wrong gap (≤2 by construction). glossFor looks a word up in
// the dictionary ({ m, e } entries) so vocab mistakes carry the English gloss
// the store's auto-promotion gate requires.

import { describe, it, expect } from 'vitest'
import { missedDictationWords, clozeGapMistakes, glossFor } from '../listeningMistakes'
import DICTIONARY from '../../data/dictionary'

describe('missedDictationWords', () => {
  const score = words => ({ words }) // minimal scoreDictation-shaped input

  it('returns missed content words, longest first, capped at 2 by default', () => {
    const r = missedDictationWords(score([
      { word: 'saya', ok: true },
      { word: 'membeli', ok: false },
      { word: 'di', ok: false },        // <4 letters — never journaled
      { word: 'pasar', ok: false },
      { word: 'sekarang', ok: false },  // longest miss
    ]))
    expect(r).toEqual(['sekarang', 'membeli'])
  })

  it('respects a custom limit and dedupes repeated misses', () => {
    const r = missedDictationWords(score([
      { word: 'rumah', ok: false },
      { word: 'rumah', ok: false },
      { word: 'besar', ok: false },
    ]), { limit: 3 })
    expect(r).toEqual(['rumah', 'besar'])
  })

  it('keeps hyphenated reduplication as one word and ignores non-alphabetic tokens', () => {
    const r = missedDictationWords(score([
      { word: 'kanak-kanak', ok: false },
      { word: '1230', ok: false },
      { word: 'ba289', ok: false },
    ]))
    expect(r).toEqual(['kanak-kanak'])
  })

  it('returns [] for all-correct, empty, or malformed input', () => {
    expect(missedDictationWords(score([{ word: 'betul', ok: true }]))).toEqual([])
    expect(missedDictationWords(score([]))).toEqual([])
    expect(missedDictationWords(null)).toEqual([])
    expect(missedDictationWords({})).toEqual([])
  })
})

describe('clozeGapMistakes', () => {
  it('returns one record per WRONG gap with the expected word and what was typed', () => {
    const gaps = [{ start: 5, end: 12, answer: 'membeli' }, { start: 20, end: 25, answer: 'pasar' }]
    const marks = [{ ok: false }, { ok: true }]
    const answers = ['membali', 'pasar']
    expect(clozeGapMistakes(gaps, marks, answers)).toEqual([
      { word: 'membeli', given: 'membali' },
    ])
  })

  it('handles empty typed answers and malformed input', () => {
    const gaps = [{ start: 0, end: 4, answer: '昨日' }] // non-alphabetic answers still journal (cloze answers are pre-filtered by the gap rule anyway)
    expect(clozeGapMistakes(gaps, [{ ok: false }], [''])).toEqual([{ word: '昨日', given: '' }])
    expect(clozeGapMistakes(null, null, null)).toEqual([])
  })
})

describe('glossFor', () => {
  const dict = [
    { m: 'membeli', e: 'to buy', ex: 'Saya membeli buku.' },
    { m: 'pasar', e: 'market', ex: '' },
  ]
  it('finds the English gloss case-insensitively', () => {
    expect(glossFor('Membeli', dict)).toBe('to buy')
    expect(glossFor('pasar', dict)).toBe('market')
  })
  it('returns empty string when the word is not in the dictionary', () => {
    expect(glossFor('zzz', dict)).toBe('')
    expect(glossFor('', dict)).toBe('')
    expect(glossFor('pasar', null)).toBe('')
  })
  // REGRESSION (2026-06-13): src/data/dictionary.js default-exports an OBJECT
  // MAP { malay: english } — the shape the pages actually pass. The first
  // glossFor only accepted arrays, silently returning '' for every word, so
  // dictionary-known listening mistakes never auto-promoted to FSRS cards.
  it('accepts the real dictionary OBJECT-MAP shape', () => {
    const objDict = { membeli: 'to buy', pasar: 'market' }
    expect(glossFor('Membeli', objDict)).toBe('to buy')
    expect(glossFor('pasar', objDict)).toBe('market')
    expect(glossFor('zzz', objDict)).toBe('')
  })

  // The synthetic objects above prove glossFor's BRANCHING, but they can't catch
  // src/data/dictionary.js itself silently changing shape — which is exactly the
  // 2026-06-13 bug (the helper guarded Array.isArray while the real export is an
  // OBJECT MAP, so every gloss came back '' and nothing auto-promoted). Pin the
  // helper against the REAL imported dictionary so a future shape-drift fails
  // HERE, loudly, instead of silently killing FSRS promotion in production.
  describe('against the REAL src/data/dictionary.js (shape-drift guard)', () => {
    it('the imported dictionary is the object-map shape glossFor expects', () => {
      expect(Array.isArray(DICTIONARY)).toBe(false)
      expect(typeof DICTIONARY).toBe('object')
    })
    it('returns the real English gloss for known headwords', () => {
      expect(glossFor('air', DICTIONARY)).toBe('water')
      expect(glossFor('rumah', DICTIONARY)).toBe('house')
      expect(glossFor('membeli', DICTIONARY)).toBe('to buy')
    })
    it('matches headwords case-insensitively against real data', () => {
      expect(glossFor('Air', DICTIONARY)).toBe('water')
      expect(glossFor('PASAR', DICTIONARY)).toBe('market')
    })
    it('returns "" for a word genuinely absent from the real dictionary', () => {
      expect(glossFor('belalbuztik', DICTIONARY)).toBe('')
    })
  })
})
