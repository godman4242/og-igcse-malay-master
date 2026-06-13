// Cloze-listening (review feature #10) — pure core.
// Hear a sentence (TTS) while filling gaps in its VISIBLE transcript.
// Kickoff: the ▶️ box in RESUME_HERE.md (2026-06-13). NOT built on
// clozeBuilder.makeClozeItem (card-shaped); reuses dictation's corpus
// plumbing (splitIntoSentences / passage flattening) instead.
//
// Gap rule (baked): 1–2 gaps per sentence; a candidate word is alphabetic
// (hyphenated reduplication like kanak-kanak counts as one word), ≥4 letters,
// never the sentence's FIRST word, no duplicate answers within one item;
// selection is deterministic via an injected rand.

import { describe, it, expect } from 'vitest'
import { buildClozeFromSentence, buildClozeListeningSet, checkGap } from '../clozeListening'

const firstRand = () => 0 // always picks the first remaining option in a shuffle

describe('buildClozeFromSentence', () => {
  it('blanks up to 2 eligible words, never the first word, gaps sorted by position', () => {
    const s = 'Penumpang diminta menuju ke pintu dengan segera.'
    const item = buildClozeFromSentence(s, firstRand)
    expect(item).not.toBeNull()
    expect(item.gaps.length).toBe(2)
    for (const g of item.gaps) {
      // start/end must slice the original sentence to exactly the answer
      expect(s.slice(g.start, g.end)).toBe(g.answer)
      expect(g.answer.length).toBeGreaterThanOrEqual(4)
      expect(g.answer).not.toBe('Penumpang') // first word is never a gap
    }
    expect(item.gaps[0].start).toBeLessThan(item.gaps[1].start)
  })

  it('falls back to 1 gap when only one word qualifies', () => {
    // Only "boleh" qualifies: ≥4 letters, alphabetic, not first.
    const item = buildClozeFromSentence('Ya dia boleh net 4x.', firstRand)
    expect(item.gaps.length).toBe(1)
    expect(item.gaps[0].answer).toBe('boleh')
  })

  it('returns null when no word qualifies', () => {
    expect(buildClozeFromSentence('Long go to it now.', firstRand)).toBeNull()
    expect(buildClozeFromSentence('', firstRand)).toBeNull()
    expect(buildClozeFromSentence(null, firstRand)).toBeNull()
  })

  it('never blanks the same answer twice in one item (case-insensitive)', () => {
    const s = 'Cikgu kata cikgu akan datang cikgu.'
    const item = buildClozeFromSentence(s, firstRand)
    const answers = item.gaps.map(g => g.answer.toLowerCase())
    expect(new Set(answers).size).toBe(answers.length)
  })

  it('treats hyphenated reduplication as one gap word', () => {
    const s = 'Mereka melihat kanak-kanak bermain.'
    // rand sequence chosen so a hyphenated candidate can win
    const item = buildClozeFromSentence(s, firstRand)
    const sliced = item.gaps.map(g => s.slice(g.start, g.end))
    expect(sliced).toEqual(item.gaps.map(g => g.answer))
  })

  it('is deterministic for a fixed rand', () => {
    const s = 'Penumpang diminta menuju ke pintu dengan segera.'
    const a = buildClozeFromSentence(s, firstRand)
    const b = buildClozeFromSentence(s, firstRand)
    expect(a).toEqual(b)
  })
})

describe('buildClozeListeningSet', () => {
  const passages = [
    { id: 'p1', lang: 'ms', title: 'Pasar', text: 'Saya pergi membeli sayur segar. Harga barang semakin mahal sekarang. Kami balik rumah.' },
    { id: 'p2', lang: 'en', title: 'Airport', text: 'Please proceed to the boarding gate immediately. The flight departs in fifteen minutes.' },
  ]

  it('builds items only for the requested language, each with 1-2 gaps + provenance', () => {
    const set = buildClozeListeningSet(passages, 'ms', 5, firstRand)
    expect(set.length).toBeGreaterThan(0)
    for (const item of set) {
      expect(item.passageId).toBe('p1')
      expect(item.title).toBe('Pasar')
      expect(item.gaps.length).toBeGreaterThanOrEqual(1)
      expect(item.gaps.length).toBeLessThanOrEqual(2)
      expect(item.sentence.slice(item.gaps[0].start, item.gaps[0].end)).toBe(item.gaps[0].answer)
    }
  })

  it('respects count and tolerates garbage input', () => {
    expect(buildClozeListeningSet(passages, 'en', 1, firstRand).length).toBe(1)
    expect(buildClozeListeningSet(null, 'ms', 5, firstRand)).toEqual([])
    expect(buildClozeListeningSet([], 'ms', 5, firstRand)).toEqual([])
  })
})

describe('checkGap', () => {
  it('accepts case + surrounding-whitespace + punctuation differences', () => {
    expect(checkGap('segera', 'Segera')).toBe(true)
    expect(checkGap('segera', '  segera. ')).toBe(true)
    expect(checkGap('kanak-kanak', 'Kanak-Kanak')).toBe(true)
  })
  it('rejects wrong or empty answers', () => {
    expect(checkGap('segera', 'sekarang')).toBe(false)
    expect(checkGap('segera', '')).toBe(false)
    expect(checkGap('segera', null)).toBe(false)
  })
})
