import { describe, it, expect } from 'vitest'
import { splitIntoSentences, buildDictationSet, pickDictationItems, scoreDictation } from '../dictation'
import LISTENING_PASSAGES from '../../data/listeningPassages'

// Dictation = hear a sentence → type it → word-level diff. Corpus is the
// Paper-4 listeningPassages split into sentences; scoring is LCS-based so a
// dropped word doesn't shift-penalise every later word (recall = matched ref
// words / total ref words).

describe('splitIntoSentences', () => {
  it('splits on .!? and keeps sentences with enough words', () => {
    const out = splitIntoSentences('The coach leaves at seven. Please arrive early! Are you ready?')
    expect(out).toEqual([
      'The coach leaves at seven.',
      'Please arrive early!',
      'Are you ready?',
    ])
  })

  it('drops fragments shorter than the minimum word count', () => {
    // "Yes." (1 word) is dropped; the longer sentence is kept.
    expect(splitIntoSentences('Yes. We will go to the museum today.')).toEqual(['We will go to the museum today.'])
  })

  it('returns [] for non-string / empty input', () => {
    expect(splitIntoSentences(null)).toEqual([])
    expect(splitIntoSentences('')).toEqual([])
  })
})

const PASSAGES = [
  { id: 'en-1', lang: 'en', title: 'A', text: 'The coach leaves at seven. Please arrive early today.' },
  { id: 'ms-1', lang: 'ms', title: 'B', text: 'Saya makan nasi goreng. Adik saya minum teh tarik.' },
  { id: 'ms-bad', lang: 'ms', title: 'C' }, // no text → skipped
]

describe('buildDictationSet', () => {
  it('flattens the chosen language into tagged sentence items', () => {
    const en = buildDictationSet(PASSAGES, 'en')
    expect(en).toEqual([
      { sentence: 'The coach leaves at seven.', lang: 'en', passageId: 'en-1', title: 'A' },
      { sentence: 'Please arrive early today.', lang: 'en', passageId: 'en-1', title: 'A' },
    ])
  })

  it('only includes the requested language and skips text-less passages', () => {
    const ms = buildDictationSet(PASSAGES, 'ms')
    expect(ms.every(i => i.lang === 'ms')).toBe(true)
    expect(ms.length).toBe(2)
  })

  it('handles non-array input', () => {
    expect(buildDictationSet(null, 'en')).toEqual([])
  })
})

describe('pickDictationItems', () => {
  it('returns up to count items, all in the chosen language, deterministically', () => {
    const items = pickDictationItems(PASSAGES, 'ms', 1, () => 0)
    expect(items.length).toBe(1)
    expect(items[0].lang).toBe('ms')
  })

  it('caps at the available pool size', () => {
    expect(pickDictationItems(PASSAGES, 'en', 99, () => 0).length).toBe(2)
  })
})

describe('scoreDictation', () => {
  it('scores an exact match 100% (case + punctuation insensitive)', () => {
    const r = scoreDictation('Saya makan nasi!', 'saya makan nasi')
    expect(r.pct).toBe(100)
    expect(r.correct).toBe(3)
    expect(r.total).toBe(3)
    expect(r.words.every(w => w.ok)).toBe(true)
  })

  it('gives fair partial credit for a dropped word (no position shift penalty)', () => {
    // ref 4 words; "nasi" dropped → LCS = saya/makan/goreng = 3 → 75%
    const r = scoreDictation('Saya makan nasi goreng', 'saya makan goreng')
    expect(r.total).toBe(4)
    expect(r.correct).toBe(3)
    expect(r.pct).toBe(75)
    expect(r.words.find(w => w.word === 'nasi').ok).toBe(false)
  })

  it('credits all reference words even when an extra word is inserted', () => {
    const r = scoreDictation('Saya makan nasi', 'saya tidak makan nasi')
    expect(r.pct).toBe(100)
    expect(r.correct).toBe(3)
  })

  // R2 F8/F9 (2026-09-28 bug hunt): nobody can hear or type an em-dash, and iOS
  // Smart Punctuation turns ' into ’ — a perfect answer must still score 100%.
  it('a spoken dash is not a word: "dinner — I\'ve" typed without it scores 100%', () => {
    const r = scoreDictation("Don't worry about dinner — I've already eaten.", "don't worry about dinner i've already eaten")
    expect(r.pct).toBe(100)
    expect(r.words.map(w => w.word)).not.toContain('—')
    expect(scoreDictation('naik teksi atau Grab – lebih senang', 'naik teksi atau grab lebih senang').pct).toBe(100)
  })

  it('curly apostrophes and quotes (iOS default) match straight ones, both ways', () => {
    expect(scoreDictation("Don't worry, I've got it.", 'Don\u2019t worry, I\u2019ve got it\u2026').pct).toBe(100)
    expect(scoreDictation('Don\u2019t say \u201chi\u201d', "don't say \"hi\"").pct).toBe(100)
  })

  it('keeps hyphenated words whole and ignores a typed stand-alone hyphen', () => {
    const r = scoreDictation('Pakai - kasut sekolah-sekolah', 'pakai - kasut sekolah-sekolah')
    expect(r.total).toBe(3)
    expect(r.pct).toBe(100)
  })

  it('every real corpus sentence, typed perfectly on a phone, scores 100%', () => {
    for (const lang of ['en', 'ms']) {
      for (const { sentence } of buildDictationSet(LISTENING_PASSAGES, lang)) {
        const typed = sentence.replace(/\s*[\u2013\u2014]\s*/g, ' ').replace(/'/g, '\u2019')
        expect(scoreDictation(sentence, typed).pct, sentence).toBe(100)
      }
    }
  })

  it('scores empty / fully-wrong input 0%', () => {
    expect(scoreDictation('a b c d', '').pct).toBe(0)
    expect(scoreDictation('satu dua tiga', 'empat lima enam').pct).toBe(0)
  })
})
