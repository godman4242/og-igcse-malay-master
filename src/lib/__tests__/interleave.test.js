// Behaviour-preserving coverage for src/lib/interleave.js — the Smart-Study
// session mixer. Two exported functions:
//   - getMixedSessionSummary(results): PURE + deterministic (no randomness, no
//     DOM) → fully pinnable.
//   - buildMixedSession({cards, grammarCards, settings}): contains a shuffle
//     (Math.random), so we assert the RATIO/TARGET math — per-type COUNTS and
//     the total — NEVER the shuffled order, per the queue item's scope.
// Expected target numbers are hand-calculated LITERALS (not re-derived from the
// SUT's formula) so a rounding/clamp regression actually fails. interleave.js is
// byte-identical: this adds tests only.
import { describe, it, expect } from 'vitest'
import { buildMixedSession, getMixedSessionSummary } from '../interleave'
import { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS } from '../../data/grammar'

const ALL_DRILL_IDS = [...IMBUHAN_DRILLS, ...TENSE_DRILLS, ...ERROR_DRILLS, ...TRANSFORM_DRILLS].map(d => d.id)

// A due vocab card with a long (>15 char) example so it is comprehension-eligible.
// `due` in the past → isDue() true. Override exLen/due to flip eligibility/dueness.
const mkVocab = (n, { exLen = 30, due = '2000-01-01T00:00:00Z', prefix = 'kata' } = {}) =>
  Array.from({ length: n }, (_, i) => ({
    m: `${prefix}${i}`,
    e: `word${i}`,
    ex: exLen ? 'x'.repeat(exLen) : '',
    due,
    state: 2,
  }))

const countType = (arr, t) => arr.filter(x => x.type === t).length

describe('buildMixedSession — target/count math (order-independent)', () => {
  it('default settings (size 15, vocab 0.5, grammar 0.3) fill 8 vocab / 5 grammar / 2 comp', () => {
    // vTarget = round(15*0.5)=8, gTarget = round(15*0.3)=5, cTarget = max(1,15-8-5)=2
    const session = buildMixedSession({ cards: mkVocab(20), grammarCards: {} })
    expect(countType(session, 'vocab')).toBe(8)
    expect(countType(session, 'grammar')).toBe(5)
    expect(countType(session, 'comprehension')).toBe(2)
    expect(session).toHaveLength(15)
  })

  it('honours custom ratios (size 10, vocab 0.6, grammar 0.2 → 6 / 2 / 2)', () => {
    // vTarget = round(10*0.6)=6, gTarget = round(10*0.2)=2, cTarget = max(1,10-6-2)=2
    const session = buildMixedSession({
      cards: mkVocab(20),
      grammarCards: {},
      settings: { sessionSize: 10, vocabRatio: 0.6, grammarRatio: 0.2 },
    })
    expect(countType(session, 'vocab')).toBe(6)
    expect(countType(session, 'grammar')).toBe(2)
    expect(countType(session, 'comprehension')).toBe(2)
    expect(session).toHaveLength(10)
  })

  it('clamps comprehension to a floor of 1 even when the ratio math yields 0', () => {
    // size 10, vocab 0.7 → vTarget 7, grammar 0.3 → gTarget 3, raw comp = 10-7-3 = 0,
    // but cTarget = max(1, 0) = 1. The floor pushes the total to 11 (> sessionSize).
    const session = buildMixedSession({
      cards: mkVocab(20),
      grammarCards: {},
      settings: { sessionSize: 10, vocabRatio: 0.7, grammarRatio: 0.3 },
    })
    expect(countType(session, 'vocab')).toBe(7)
    expect(countType(session, 'grammar')).toBe(3)
    expect(countType(session, 'comprehension')).toBe(1)
    expect(session).toHaveLength(11)
  })

  it('is limited by the available due-vocab pool when fewer cards than vTarget', () => {
    // Only 3 due vocab, vTarget 8 → vocab = 3; nothing left over → comp = 0.
    const session = buildMixedSession({ cards: mkVocab(3), grammarCards: {} })
    expect(countType(session, 'vocab')).toBe(3)
    expect(countType(session, 'comprehension')).toBe(0)
    expect(countType(session, 'grammar')).toBe(5)
    expect(session).toHaveLength(8)
  })

  it('only counts comprehension cards whose example is longer than 15 chars', () => {
    // 12 due vocab with a 5-char example: 8 fill vocab, the 4 left over fail the
    // ex.length > 15 filter → comp = 0 despite cTarget = 2.
    const session = buildMixedSession({ cards: mkVocab(12, { exLen: 5 }), grammarCards: {} })
    expect(countType(session, 'vocab')).toBe(8)
    expect(countType(session, 'comprehension')).toBe(0)
  })

  it('excludes not-due vocab cards entirely', () => {
    const due = mkVocab(10, { due: '2000-01-01T00:00:00Z', prefix: 'due' })
    const notDue = mkVocab(5, { due: '2999-01-01T00:00:00Z', prefix: 'future' })
    const session = buildMixedSession({ cards: [...due, ...notDue], grammarCards: {} })
    expect(countType(session, 'vocab')).toBe(8) // capped at vTarget from the 10 due
    expect(session.some(x => String(x.item.m).startsWith('future'))).toBe(false)
  })

  it('drops grammar drills already scheduled for the future', () => {
    // Mark EVERY drill not-due → grammar pool empty → grammar = 0.
    const grammarCards = Object.fromEntries(
      ALL_DRILL_IDS.map(id => [id, { due: '2999-01-01T00:00:00Z' }])
    )
    const session = buildMixedSession({ cards: mkVocab(20), grammarCards })
    expect(countType(session, 'grammar')).toBe(0)
    expect(countType(session, 'vocab')).toBe(8)
    expect(countType(session, 'comprehension')).toBe(2)
  })

  it('caps grammar at gTarget when the drill pool is larger', () => {
    // 119 drills all due (empty grammarCards), gTarget 5 → grammar = 5, not 119.
    expect(ALL_DRILL_IDS.length).toBeGreaterThan(5) // guards the cap assertion below
    const session = buildMixedSession({ cards: mkVocab(20), grammarCards: {} })
    expect(countType(session, 'grammar')).toBe(5)
  })

  it('tags every item with one of the three known types', () => {
    const session = buildMixedSession({ cards: mkVocab(20), grammarCards: {} })
    for (const entry of session) {
      expect(['vocab', 'grammar', 'comprehension']).toContain(entry.type)
      expect(entry.item).toBeTruthy()
    }
  })
})

describe('getMixedSessionSummary', () => {
  it('returns zeros and no weakest for an empty session', () => {
    expect(getMixedSessionSummary([])).toEqual({
      total: 0,
      correct: 0,
      accuracy: 0,
      byType: {},
      weakest: null,
    })
  })

  it('reports 100% accuracy and no weakest when everything is correct', () => {
    const summary = getMixedSessionSummary([
      { type: 'vocab', correct: true },
      { type: 'vocab', correct: true },
    ])
    expect(summary.total).toBe(2)
    expect(summary.correct).toBe(2)
    expect(summary.accuracy).toBe(100)
    expect(summary.byType).toEqual({ vocab: { total: 2, correct: 1 + 1 } })
    expect(summary.weakest).toBeNull()
  })

  it('rounds accuracy (1 of 3 correct → 33)', () => {
    const summary = getMixedSessionSummary([
      { type: 'vocab', correct: true },
      { type: 'vocab', correct: false },
      { type: 'vocab', correct: false },
    ])
    expect(summary.accuracy).toBe(33) // round(33.33)
    expect(summary.byType).toEqual({ vocab: { total: 3, correct: 1 } })
    expect(summary.weakest).toBe('vocab')
  })

  it('accumulates per-type totals and picks the lowest-accuracy type as weakest', () => {
    const summary = getMixedSessionSummary([
      { type: 'vocab', correct: true },
      { type: 'vocab', correct: false }, // vocab 1/2 = 50%
      { type: 'grammar', correct: true },
      { type: 'grammar', correct: true }, // grammar 2/2 = 100%
    ])
    expect(summary.accuracy).toBe(75) // 3 of 4
    expect(summary.byType).toEqual({
      vocab: { total: 2, correct: 1 },
      grammar: { total: 2, correct: 2 },
    })
    expect(summary.weakest).toBe('vocab')
  })

  it('breaks an accuracy tie in favour of the first-seen type', () => {
    const summary = getMixedSessionSummary([
      { type: 'vocab', correct: true },
      { type: 'vocab', correct: false }, // vocab 50%
      { type: 'grammar', correct: true },
      { type: 'grammar', correct: false }, // grammar 50% (tie)
    ])
    // strict `<` comparison keeps the first type encountered when tied
    expect(summary.weakest).toBe('vocab')
  })

  it('treats a zero-correct type as the weakest', () => {
    const summary = getMixedSessionSummary([
      { type: 'vocab', correct: false },
      { type: 'vocab', correct: false }, // vocab 0%
      { type: 'grammar', correct: true }, // grammar 100%
    ])
    expect(summary.byType.vocab).toEqual({ total: 2, correct: 0 })
    expect(summary.weakest).toBe('vocab')
  })
})
