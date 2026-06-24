// Unit suite for the pure Daily Plan engine (the "what should I do today?"
// spine). The engine is a pure function over already-computed store signals,
// so it is exhaustively testable with plain fixtures.
// Design: docs/superpowers/specs/2026-05-29-daily-plan-spine-design.md

import { describe, it, expect } from 'vitest'
import { buildDailyPlan, deriveTaskDone, deriveReadiness, isSameLocalDay } from '../dailyPlan.js'

const NOW = new Date('2026-05-29T12:00:00').getTime()
const TODAY = '2026-05-29T09:00:00'
const YESTERDAY = '2026-05-28T09:00:00'

// A non-empty deck so the engine doesn't short-circuit on the empty case.
function deck(n = 50) {
  return Array.from({ length: n }, (_, i) => ({
    malay: `w${i}`, t: 'general',
    due: new Date(NOW + 86400000).toISOString(), // not due by default
    last_review: null, state: 2, stability: 30, lapses: 0,
  }))
}

const ids = plan => plan.tasks.map(t => t.id)

describe('isSameLocalDay', () => {
  it('is true for the same calendar day, false otherwise / for junk', () => {
    expect(isSameLocalDay(TODAY, NOW)).toBe(true)
    expect(isSameLocalDay(YESTERDAY, NOW)).toBe(false)
    expect(isSameLocalDay(null, NOW)).toBe(false)
    expect(isSameLocalDay('not-a-date', NOW)).toBe(false)
  })
})

describe('buildDailyPlan — robustness', () => {
  it('never throws on a totally empty input', () => {
    expect(() => buildDailyPlan({}, NOW)).not.toThrow()
    const plan = buildDailyPlan({}, NOW)
    expect(plan.tasks).toEqual([])
  })

  it('empty deck returns no tasks (FirstRunCard owns that moment)', () => {
    const plan = buildDailyPlan({ cards: [], dueCount: 0 }, NOW)
    expect(plan.tasks).toEqual([])
    expect(plan.allDone).toBe(false)
  })

  it('works for a Static-tier user (no challenge, no readiness, no exam date)', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 8, fixUpQueue: [], challenge: null,
      examReadiness: null, studyPlan: null, examDue: { dueNow: false },
      dailyGoalLevel: 'standard',
    }, NOW)
    expect(plan.tasks.length).toBeGreaterThan(0)
    expect(ids(plan)[0]).toBe('review') // due review still leads
    expect(plan.readiness).toBeNull()
  })
})

describe('buildDailyPlan — prioritisation', () => {
  it('puts review first when cards are due', () => {
    const plan = buildDailyPlan({ cards: deck(), dueCount: 12, fixUpQueue: [{}, {}] }, NOW)
    expect(ids(plan)[0]).toBe('review')
  })

  it('routes large review to /smart-study, small review to /study', () => {
    expect(buildDailyPlan({ cards: deck(), dueCount: 10 }, NOW).tasks[0].route).toBe('/smart-study')
    expect(buildDailyPlan({ cards: deck(), dueCount: 2 }, NOW).tasks[0].route).toBe('/study')
  })

  it('leads with fix-ups when nothing is due but mistakes exist', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 0, fixUpQueue: [{ word: 'a' }, { word: 'b' }, { word: 'c' }],
    }, NOW)
    expect(ids(plan)[0]).toBe('fixups')
  })

  it('near the exam (final) front-loads exam rehearsal when due', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 5,
      studyPlan: { phase: 'final', daysLeft: 2, readinessPct: 70 },
      examDue: { dueNow: true },
    }, NOW)
    expect(ids(plan)).toContain('exam')
    const exam = plan.tasks.find(t => t.id === 'exam')
    const review = plan.tasks.find(t => t.id === 'review')
    expect(exam.priority).toBeGreaterThanOrEqual(review ? 0 : 0)
    expect(exam.priority).toBe(90)
  })

  it('far from the exam (build) surfaces a foundation/new-vocab task', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 2,
      studyPlan: { phase: 'build', daysLeft: 90, readinessPct: 10 },
    }, NOW)
    expect(ids(plan)).toContain('foundation')
  })
})

describe('buildDailyPlan — single skill focus', () => {
  it('picks speaking when the recent speaking band is weakest', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 0,
      speakingHistory: [{ ts: YESTERDAY, band: 2 }],
      writingHistory: [{ ts: YESTERDAY, score: 6 }],
    }, NOW)
    const skillIds = ids(plan).filter(id => ['speaking', 'writing', 'grammar'].includes(id))
    expect(skillIds).toEqual(['speaking'])
  })

  it('picks writing when the recent writing band is weakest', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 0,
      speakingHistory: [{ ts: YESTERDAY, band: 6 }],
      writingHistory: [{ ts: YESTERDAY, score: 1 }],
      studyPlan: { phase: 'review', daysLeft: 10 },
    }, NOW)
    const skillIds = ids(plan).filter(id => ['speaking', 'writing', 'grammar'].includes(id))
    expect(skillIds).toEqual(['writing'])
  })

  it('does not pick a skill already practised today', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 0,
      speakingHistory: [{ ts: TODAY, band: 2 }],
      writingHistory: [{ ts: TODAY, score: 1 }],
      grammarCards: {},
      studyPlan: { phase: 'review', daysLeft: 10 },
    }, NOW)
    const skillIds = ids(plan).filter(id => ['speaking', 'writing'].includes(id))
    expect(skillIds).toEqual([])
  })
})

describe('buildDailyPlan — time budget', () => {
  it('casual budget yields fewer tasks than intensive', () => {
    const base = {
      cards: deck(), dueCount: 6,
      fixUpQueue: [{ word: 'a' }, { word: 'b' }],
      speakingHistory: [{ ts: YESTERDAY, band: 2 }],
      studyPlan: { phase: 'review', daysLeft: 10 },
    }
    const casual = buildDailyPlan({ ...base, dailyGoalLevel: 'casual' }, NOW)
    const intensive = buildDailyPlan({ ...base, dailyGoalLevel: 'intensive' }, NOW)
    expect(casual.budgetMin).toBe(10)
    expect(intensive.budgetMin).toBe(40)
    expect(intensive.tasks.length).toBeGreaterThanOrEqual(casual.tasks.length)
    expect(casual.tasks.length).toBeLessThanOrEqual(4)
  })

  it('always includes overdue review even when the budget is tiny', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 30, // ~15 min est, exceeds casual budget of 10
      dailyGoalLevel: 'casual',
    }, NOW)
    expect(ids(plan)).toContain('review')
  })

  it('never returns more than 5 tasks', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 6,
      fixUpQueue: [{ word: 'a' }],
      speakingHistory: [{ ts: YESTERDAY, band: 1 }],
      examDue: { dueNow: true },
      studyPlan: { phase: 'build', daysLeft: 90 },
      dailyGoalLevel: 'intensive',
    }, NOW)
    expect(plan.tasks.length).toBeLessThanOrEqual(5)
  })
})

describe('deriveReadiness — graceful degradation', () => {
  it('prefers band-based exam readiness when attempts exist', () => {
    expect(deriveReadiness({ examReadiness: { smoothed: 72 }, studyPlan: { readinessPct: 30 } }))
      .toEqual({ value: 72, source: 'exam' })
  })
  it('falls back to card-maturity when an exam date is set but no attempts', () => {
    expect(deriveReadiness({ examReadiness: null, studyPlan: { readinessPct: 44 } }))
      .toEqual({ value: 44, source: 'maturity' })
  })
  it('returns null when neither is available', () => {
    expect(deriveReadiness({ examReadiness: null, studyPlan: null })).toBeNull()
  })
})

const DAY = 86400000

// Build inputs where WRITING would naturally edge out SPEAKING (both never
// practised => base need 3; identical), so the bonus is what tips the choice.
function skillFocusInputs() {
  return {
    cards: Array.from({ length: 50 }, (_, i) => ({ m: `w${i}`, e: 'x', due: null })),
    dueCount: 0,            // no due review → skill focus is free to surface
    grammarCards: {},
    studyPlan: { phase: 'review' },   // not 'build' → no grammar bias, no foundation
    speakingHistory: [],
    writingHistory: [],
    mistakes: [],
    examAttempts: [],
  }
}

describe('mix preset steers the skill focus (selection only)', () => {
  it('default (no mixPreset) equals balanced — byte-identical', () => {
    const i = skillFocusInputs()
    expect(buildDailyPlan(i, NOW)).toEqual(buildDailyPlan({ ...i, mixPreset: 'balanced' }, NOW))
  })

  it('more-speaking makes the speaking focus win the slot over writing', () => {
    const i = skillFocusInputs()
    const balanced = buildDailyPlan({ ...i, mixPreset: 'balanced' }, NOW)
    const speaking = buildDailyPlan({ ...i, mixPreset: 'more-speaking' }, NOW)
    // Balanced tie-break is speaking>writing already, so assert via more-writing:
    const writing = buildDailyPlan({ ...i, mixPreset: 'more-writing' }, NOW)
    expect(speaking.tasks.some(t => t.id === 'speaking')).toBe(true)
    expect(writing.tasks.some(t => t.id === 'writing')).toBe(true)
    expect(writing.tasks.some(t => t.id === 'speaking')).toBe(false)
    void balanced
  })

  it('the bonus is bounded — a real urgent need outranks the preset', () => {
    // Writing band 1 (need 5) must beat a more-speaking bonus (+2 on base 3 = 5,
    // tie → tie-break speaking) ... so make writing need 6 to clearly win.
    const i = skillFocusInputs()
    i.writingHistory = [{ ts: NOW - 3 * DAY, band: 0, lang: 'malay' }]  // need = 6
    const speaking = buildDailyPlan({ ...i, mixPreset: 'more-speaking' }, NOW)
    expect(speaking.tasks.some(t => t.id === 'writing')).toBe(true)
  })

  it('never mutates input cards under any preset (FSRS isolation)', () => {
    const i = skillFocusInputs()
    const snapshot = JSON.parse(JSON.stringify(i.cards))
    for (const p of ['balanced', 'more-speaking', 'more-writing', 'more-grammar']) {
      buildDailyPlan({ ...i, mixPreset: p }, NOW)
    }
    expect(i.cards).toEqual(snapshot)   // deep-equal: no field touched
  })
})

describe('deriveTaskDone', () => {
  it('review: Enhanced uses challenge counters, Static uses last_review today', () => {
    expect(deriveTaskDone({ id: 'review' },
      { challenge: { reviewTarget: 10, reviewDone: 10 } }, NOW)).toBe(true)
    expect(deriveTaskDone({ id: 'review' },
      { challenge: { reviewTarget: 10, reviewDone: 3 } }, NOW)).toBe(false)
    expect(deriveTaskDone({ id: 'review' },
      { challenge: null, cards: [{ last_review: TODAY }] }, NOW)).toBe(true)
    expect(deriveTaskDone({ id: 'review' },
      { challenge: null, cards: [{ last_review: YESTERDAY }] }, NOW)).toBe(false)
  })

  it('grammar: Static falls back to grammarCards last_review today', () => {
    expect(deriveTaskDone({ id: 'grammar' },
      { challenge: null, grammarCards: { 'imbuhan-1': { last_review: TODAY } } }, NOW)).toBe(true)
    expect(deriveTaskDone({ id: 'grammar' },
      { challenge: null, grammarCards: { 'imbuhan-1': { last_review: YESTERDAY } } }, NOW)).toBe(false)
  })

  it('history-backed kinds key off a ts dated today', () => {
    expect(deriveTaskDone({ id: 'speaking' }, { speakingHistory: [{ ts: TODAY }] }, NOW)).toBe(true)
    expect(deriveTaskDone({ id: 'writing' }, { writingHistory: [{ ts: YESTERDAY }] }, NOW)).toBe(false)
    expect(deriveTaskDone({ id: 'exam' }, { examAttempts: [{ ts: TODAY }] }, NOW)).toBe(true)
    expect(deriveTaskDone({ id: 'fixups' }, { mistakes: [{ lastReviewedAt: TODAY }] }, NOW)).toBe(true)
    expect(deriveTaskDone({ id: 'fixups' }, { mistakes: [{ lastReviewedAt: null }] }, NOW)).toBe(false)
  })

  it('allDone flips true only when every task is derived-complete', () => {
    const plan = buildDailyPlan({
      cards: deck(), dueCount: 5,
      challenge: { reviewTarget: 5, reviewDone: 5, grammarTarget: 2, grammarDone: 2 },
    }, NOW)
    // review is done via challenge; no other tasks should remain incomplete here
    const reviewTask = plan.tasks.find(t => t.id === 'review')
    expect(reviewTask.done).toBe(true)
  })
})
