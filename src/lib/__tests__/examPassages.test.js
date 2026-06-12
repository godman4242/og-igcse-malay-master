import { describe, it, expect } from 'vitest'
import { eligiblePassages, pickRehearsalPassage, eligibleListening, pickRehearsalListening } from '../examPassages'

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

// Listening stage (2026-06-13). Mirrors the comprehension picker but over the
// listening catalogue. A listening passage just needs at least one question.
const LISTEN = [
  { id: 'en-1', lang: 'en', questions: [1, 2, 3, 4, 5] },
  { id: 'en-2', lang: 'en', questions: [1, 2, 3, 4, 5] },
  { id: 'ms-1', lang: 'ms', questions: [1, 2, 3, 4, 5] },
  { id: 'ms-bad', lang: 'ms', questions: [] }, // no questions → ineligible
]

describe('eligibleListening', () => {
  it('filters to the requested language and drops question-less passages', () => {
    expect(eligibleListening(LISTEN, 'en').map(p => p.id)).toEqual(['en-1', 'en-2'])
    expect(eligibleListening(LISTEN, 'ms').map(p => p.id)).toEqual(['ms-1'])
  })

  it('handles non-array / empty input', () => {
    expect(eligibleListening(null, 'en')).toEqual([])
    expect(eligibleListening([], 'en')).toEqual([])
  })
})

describe('pickRehearsalListening', () => {
  it('only ever returns a passage in the chosen language', () => {
    for (let i = 0; i < 50; i++) {
      const r = i / 50
      expect(pickRehearsalListening(LISTEN, 'en', () => r).lang).toBe('en')
      expect(pickRehearsalListening(LISTEN, 'ms', () => r).lang).toBe('ms')
    }
  })

  it('uses the injected rand deterministically', () => {
    expect(pickRehearsalListening(LISTEN, 'en', () => 0).id).toBe('en-1')
    expect(pickRehearsalListening(LISTEN, 'en', () => 0.99).id).toBe('en-2')
  })

  it('returns null when the chosen language has none', () => {
    const enOnly = LISTEN.filter(p => p.lang === 'en')
    expect(pickRehearsalListening(enOnly, 'ms')).toBeNull()
  })
})
