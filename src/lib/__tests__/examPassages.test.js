import { describe, it, expect } from 'vitest'
import { eligiblePassages, pickRehearsalPassage } from '../examPassages'

// Issue 4a — Exam Rehearsal Malay/English subject toggle. The old picker chose a
// passage 60/40 MS/EN at random each run, so a learner could never drill one
// subject. These helpers filter the pool to a single language.

const PASSAGES = [
  { id: 'ms-a', lang: 'ms', questions: [1, 2, 3, 4, 5] },
  { id: 'ms-b', lang: 'ms', questions: [1, 2, 3, 4] },
  { id: 'ms-thin', lang: 'ms', questions: [1, 2, 3] }, // < 4 → ineligible
  { id: 'en-a', lang: 'en', questions: [1, 2, 3, 4, 5] },
  { id: 'en-b', lang: 'en', questions: [1, 2, 3, 4] },
]

describe('eligiblePassages', () => {
  it('filters to the requested language', () => {
    expect(eligiblePassages(PASSAGES, 'ms').map(p => p.id)).toEqual(['ms-a', 'ms-b'])
    expect(eligiblePassages(PASSAGES, 'en').map(p => p.id)).toEqual(['en-a', 'en-b'])
  })

  it('drops passages with fewer than 4 questions', () => {
    expect(eligiblePassages(PASSAGES, 'ms').some(p => p.id === 'ms-thin')).toBe(false)
  })

  it('returns all eligible when lang is not ms/en', () => {
    expect(eligiblePassages(PASSAGES, undefined).map(p => p.id)).toEqual(['ms-a', 'ms-b', 'en-a', 'en-b'])
  })

  it('handles non-array / empty input', () => {
    expect(eligiblePassages(null, 'ms')).toEqual([])
    expect(eligiblePassages([], 'ms')).toEqual([])
  })
})

describe('pickRehearsalPassage', () => {
  it('only ever returns a passage in the chosen language', () => {
    for (let i = 0; i < 50; i++) {
      const r = i / 50
      expect(pickRehearsalPassage(PASSAGES, 'en', () => r).lang).toBe('en')
      expect(pickRehearsalPassage(PASSAGES, 'ms', () => r).lang).toBe('ms')
    }
  })

  it('uses the injected rand deterministically (0 → first, ~1 → last)', () => {
    expect(pickRehearsalPassage(PASSAGES, 'ms', () => 0).id).toBe('ms-a')
    expect(pickRehearsalPassage(PASSAGES, 'ms', () => 0.99).id).toBe('ms-b')
  })

  it('returns null when the chosen language has no eligible passages (no silent cross-language pick)', () => {
    const msOnly = PASSAGES.filter(p => p.lang === 'ms')
    expect(pickRehearsalPassage(msOnly, 'en')).toBeNull()
  })
})
