import { describe, it, expect } from 'vitest'
import { seededRandom, generateQuizOptions } from '../study/quizOptions.js'

const sampleCard = { m: 'kucing', e: 'cat', t: 'animals' }
const dict = {
  kucing: 'cat',
  anjing: 'dog',
  burung: 'bird',
  ikan: 'fish',
  ayam: 'chicken',
  itik: 'duck',
  kuda: 'horse',
  kambing: 'goat',
}

describe('seededRandom', () => {
  it('is deterministic per seed', () => {
    const a = seededRandom('foo')
    const b = seededRandom('foo')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('produces values in [0, 1)', () => {
    const r = seededRandom('x')
    for (let i = 0; i < 50; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('different seeds → different sequences', () => {
    const a = seededRandom('foo')
    const b = seededRandom('bar')
    expect(a()).not.toBe(b())
  })
})

describe('generateQuizOptions', () => {
  it('returns 4 options', () => {
    const opts = generateQuizOptions(sampleCard, 0, dict)
    expect(opts).toHaveLength(4)
  })

  it('always includes the correct answer', () => {
    for (let i = 0; i < 10; i++) {
      const opts = generateQuizOptions(sampleCard, i, dict)
      expect(opts).toContain('cat')
    }
  })

  it('all 4 options are unique', () => {
    const opts = generateQuizOptions(sampleCard, 5, dict)
    expect(new Set(opts).size).toBe(4)
  })

  it('same (card, cardIdx) produces same shuffle (deterministic)', () => {
    const a = generateQuizOptions(sampleCard, 3, dict)
    const b = generateQuizOptions(sampleCard, 3, dict)
    expect(a).toEqual(b)
  })

  it('different cardIdx produces a different shuffle (usually)', () => {
    // Across multiple indices at least one shuffle should differ.
    const baseline = generateQuizOptions(sampleCard, 0, dict)
    const others = [1, 2, 3, 4, 5].map(i => generateQuizOptions(sampleCard, i, dict))
    const anyDifferent = others.some(o => o.join('|') !== baseline.join('|'))
    expect(anyDifferent).toBe(true)
  })

  it('returns [] when card is null/undefined', () => {
    expect(generateQuizOptions(null, 0, dict)).toEqual([])
    expect(generateQuizOptions(undefined, 0, dict)).toEqual([])
  })

  it('does not infinite-loop when dictionary is too small to fill 4', () => {
    // Only 2 entries — function should give up gracefully.
    const tiny = { kucing: 'cat', anjing: 'dog' }
    const opts = generateQuizOptions(sampleCard, 0, tiny)
    expect(opts.length).toBeLessThanOrEqual(4)
    expect(opts).toContain('cat')
  })

  // v34 True English study mode: an English card (lang:'en') has card.e = the
  // MALAY gloss (correct answer) and card.m = the English prompt. Distractors
  // must therefore be MALAY words (dictionary keys), not English glosses —
  // otherwise the only Malay-looking option is always correct and the quiz
  // teaches nothing (defeats the test effect; breaks Quiz for English learners).
  describe('English card distractors (lang:"en")', () => {
    const enCard = { m: 'cat', e: 'kucing', t: 'animals', lang: 'en' }

    it('includes the correct Malay answer', () => {
      for (let i = 0; i < 10; i++) {
        const opts = generateQuizOptions(enCard, i, dict)
        expect(opts).toContain('kucing')
      }
    })

    it('every distractor is a Malay word (dictionary KEY), not an English gloss', () => {
      const malayWords = Object.keys(dict)
      const englishGlosses = Object.values(dict)
      for (let i = 0; i < 10; i++) {
        const opts = generateQuizOptions(enCard, i, dict)
        const distractors = opts.filter(o => o !== 'kucing')
        for (const d of distractors) {
          expect(malayWords).toContain(d)        // RED before fix (distractors were English)
          expect(englishGlosses).not.toContain(d)
        }
      }
    })

    it('still returns 4 unique options for an English card', () => {
      const opts = generateQuizOptions(enCard, 2, dict)
      expect(opts).toHaveLength(4)
      expect(new Set(opts).size).toBe(4)
    })
  })

  it('Malay card (lang "ms"/undefined) distractor pool is unchanged (English glosses)', () => {
    // Regression guard: the Malay path must stay byte-identical — distractors
    // are still drawn from dictionary VALUES (English glosses).
    const englishGlosses = Object.values(dict)
    const opts = generateQuizOptions(sampleCard, 7, dict)
    const distractors = opts.filter(o => o !== 'cat')
    for (const d of distractors) {
      expect(englishGlosses).toContain(d)
    }
  })
})
