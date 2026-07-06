// Behaviour-preserving coverage for src/lib/pronunciation.js — the pronunciation
// scorer behind the Speak study mode (SpeakMode.jsx imports scorePronunciation).
// Two exported functions:
//   - scorePronunciation(expected, spoken): PURE + deterministic (no randomness,
//     no DOM) → fully pinnable. We pin word-status classification (correct/close/
//     wrong/extra), the missing-word '—' render, score rounding, and the tip
//     selection precedence (MALAY_TIPS → general fallbacks → perfect), incl. the
//     Set-dedup + slice(0,3) cap.
//   - generatePracticeSentences(cards, count): contains a shuffle (Math.random),
//     so we assert the FILTER (ex.length > 5), the count cap, and the mapped
//     shape/extraction — NEVER the shuffled order.
// Expected numbers/strings are hand-calculated LITERALS (not re-derived from the
// SUT) so a threshold/rounding/precedence regression actually fails.
// pronunciation.js is byte-identical: this adds tests only.
import { describe, it, expect } from 'vitest'
import { scorePronunciation, generatePracticeSentences } from '../pronunciation'

describe('scorePronunciation — word classification & score', () => {
  it('all exact matches → 100% + the "Perfect pronunciation" tip', () => {
    const r = scorePronunciation('saya makan nasi', 'saya makan nasi')
    expect(r.score).toBe(100)
    expect(r.correct).toBe(3)
    expect(r.close).toBe(0)
    expect(r.wrong).toBe(0)
    expect(r.total).toBe(3)
    expect(r.words.every(w => w.status === 'correct')).toBe(true)
    expect(r.tips).toEqual(['Perfect pronunciation! Try a harder sentence.'])
  })

  it('normalizes case + punctuation before comparing → still 100%', () => {
    // "Saya, makan!" → lowercase, strip , and ! , collapse space → "saya makan"
    const r = scorePronunciation('Saya, makan!', 'saya makan')
    expect(r.score).toBe(100)
    expect(r.correct).toBe(2)
  })

  it('1 edit on a 5-char word is "close" (lev 1 <= ceil(5*0.3)=2) worth half a point → 50%', () => {
    const r = scorePronunciation('makan', 'makam') // n→m, lev 1
    expect(r.words[0].status).toBe('close')
    expect(r.close).toBe(1)
    expect(r.correct).toBe(0)
    expect(r.score).toBe(50) // round(0.5 / 1 * 100)
  })

  it('a missing spoken word is "wrong" and renders spoken as "—"', () => {
    const r = scorePronunciation('saya suka makan nasi', 'saya suka makan') // "nasi" missing
    expect(r.correct).toBe(3)
    expect(r.wrong).toBe(1)
    expect(r.total).toBe(4)
    expect(r.words[3]).toMatchObject({ word: 'nasi', status: 'wrong', spoken: '—' })
    expect(r.score).toBe(75) // round(3 / 4 * 100)
  })

  it('extra spoken words append "extra" rows and do not count as missed', () => {
    const r = scorePronunciation('saya makan', 'saya makan nasi goreng')
    expect(r.total).toBe(2)
    expect(r.correct).toBe(2)
    expect(r.score).toBe(100)
    const extras = r.words.filter(w => w.status === 'extra')
    expect(extras).toHaveLength(2)
    expect(extras.map(e => e.spoken)).toEqual(['nasi', 'goreng'])
    // extras are NOT wrong/close → "missed" is empty → the perfect tip fires
    expect(r.tips).toEqual(['Perfect pronunciation! Try a harder sentence.'])
  })

  it('rounds the percentage: 1 of 3 correct → 33%', () => {
    const r = scorePronunciation('satu dua tiga', 'satu xx yy')
    expect(r.correct).toBe(1)
    expect(r.wrong).toBe(2)
    expect(r.score).toBe(33) // round(1 / 3 * 100) = round(33.33)
  })

  // Adversarial-review PLAUSIBLE finding (pronunciation.js positional alignment):
  // a purely positional expWords[i] vs spkWords[i] compare shifts every downstream
  // word when the speaker inserts/drops ONE word, cascading a mostly-correct
  // utterance to all-wrong. The scorer must sequence-align, not index-align.
  it('does NOT cascade one INSERTED word into all-wrong (aligns, not positional)', () => {
    // Every target word said correctly, plus a filler "betul" after "saya".
    // Positional scoring gives 1/4 = 25%; alignment recognises all four.
    const r = scorePronunciation('saya suka makan nasi', 'saya betul suka makan nasi')
    expect(r.correct).toBe(4)
    expect(r.wrong).toBe(0)
    expect(r.score).toBe(100)
    // the inserted word is reported as an "extra", not as a wrong target
    expect(r.words.some(w => w.status === 'extra' && w.spoken === 'betul')).toBe(true)
  })

  it('does NOT cascade one DROPPED word into all-wrong', () => {
    // "suka" dropped from the middle; the rest said correctly.
    // Positional scoring cascades to 1/4 = 25%; alignment sees 3 correct + 1 miss.
    const r = scorePronunciation('saya suka makan nasi', 'saya makan nasi')
    expect(r.correct).toBe(3)
    expect(r.wrong).toBe(1)
    expect(r.score).toBe(75)
    expect(r.words.find(w => w.word === 'suka')).toMatchObject({ status: 'wrong', spoken: '—' })
  })
})

describe('scorePronunciation — tip selection', () => {
  it('a missed word matching a MALAY_TIPS pattern emits that specific tip ("ny")', () => {
    const r = scorePronunciation('nyamuk', 'zzz')
    expect(r.tips.some(t => t.startsWith('The "ny" sound'))).toBe(true)
  })

  it('falls back to the long-word tip when no MALAY_TIPS pattern matches (>8 chars)', () => {
    // "kebudayaan" (10 chars) contains none of ny/ng/r/kh/sy/gh
    const r = scorePronunciation('kebudayaan', 'z')
    expect(r.tips.some(t => t.startsWith('For longer words'))).toBe(true)
  })

  it('falls back to the imbuhan-prefix tip for a me-/ber-/di- word with no MALAY_TIPS pattern', () => {
    // "menulis" starts with "me", 7 chars, no ny/ng/r/kh/sy/gh
    const r = scorePronunciation('menulis', 'z')
    expect(r.tips.some(t => t.startsWith('Imbuhan prefixes'))).toBe(true)
  })

  it('dedupes repeated tips (three "r" words → one "r" tip)', () => {
    const r = scorePronunciation('rumah roti rata', 'z z z')
    expect(r.tips).toHaveLength(1)
    expect(r.tips[0].startsWith('Malay "r"')).toBe(true)
  })

  it('caps tips at 3 (four distinct patterns ny/ng/r/kh → only 3 returned)', () => {
    const r = scorePronunciation('nyamuk bunga rumah ikhlas', 'z z z z')
    expect(r.tips).toHaveLength(3) // slice(0, 3) drops the 4th (kh)
  })
})

describe('generatePracticeSentences', () => {
  const mk = (m, e, ex) => ({ m, e, ...(ex !== undefined ? { ex } : {}) })

  it('keeps only cards whose example is longer than 5 chars', () => {
    const cards = [
      mk('a', 'A', 'short'), // length 5 → excluded (> 5 is strict)
      mk('b', 'B', 'longer text here'), // included
      mk('c', 'C'), // no ex → excluded
    ]
    const out = generatePracticeSentences(cards)
    expect(out).toHaveLength(1)
    expect(out[0].word).toBe('b')
  })

  it('caps the result at `count`', () => {
    const cards = Array.from({ length: 5 }, (_, i) => mk(`w${i}`, `W${i}`, 'example sentence'))
    expect(generatePracticeSentences(cards, 2)).toHaveLength(2)
  })

  it('defaults to at most 5 sentences', () => {
    const cards = Array.from({ length: 7 }, (_, i) => mk(`w${i}`, `W${i}`, 'example sentence'))
    expect(generatePracticeSentences(cards)).toHaveLength(5)
  })

  it('maps to { malay, english, word } and strips the parenthetical gloss off the example', () => {
    const cards = [mk('rumah', 'house', 'Rumah saya besar (my house is big)')]
    const out = generatePracticeSentences(cards)
    expect(out[0]).toEqual({ malay: 'Rumah saya besar', english: 'house', word: 'rumah' })
  })

  it('falls back to the card word when the example starts with a parenthetical', () => {
    // split('(')[0] is "" → trim "" is falsy → malay = c.m
    const cards = [mk('kucing', 'cat', '(idiom) sesuatu')]
    expect(generatePracticeSentences(cards)[0].malay).toBe('kucing')
  })

  it('returns [] for an empty deck', () => {
    expect(generatePracticeSentences([])).toEqual([])
  })
})
