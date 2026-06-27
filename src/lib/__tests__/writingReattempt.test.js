import { describe, it, expect } from 'vitest'
import {
  missedRequirements, buildAttemptEntry, compareAttempts, lastTwoAttemptsForTask,
} from '../writingReattempt'

const TASK = {
  id: 't1',
  requirements: ['R0', 'R1', 'R2'],
  hints: ['H0', 'H1', 'H2'],
}

describe('missedRequirements', () => {
  it('returns only the ✗ requirements, each paired with its hint', () => {
    const missed = missedRequirements(TASK, { req_0: true, req_1: false, req_2: false })
    expect(missed).toEqual([
      { index: 1, text: 'R1', hint: 'H1' },
      { index: 2, text: 'R2', hint: 'H2' },
    ])
  })
  it('treats a missing coverage flag as ✗', () => {
    expect(missedRequirements(TASK, { req_0: true }).map(m => m.index)).toEqual([1, 2])
  })
  it('is empty when all requirements are met', () => {
    expect(missedRequirements(TASK, { req_0: true, req_1: true, req_2: true })).toEqual([])
  })
  it('falls back to empty hint when none authored', () => {
    const t = { id: 'x', requirements: ['A'] }
    expect(missedRequirements(t, {})).toEqual([{ index: 0, text: 'A', hint: '' }])
  })
})

describe('buildAttemptEntry', () => {
  it('adds task fields only when a task was graded', () => {
    const e = buildAttemptEntry({
      lang: 'eng', format: 'eng-article', band: 4, words: 200,
      task: TASK, aiResponse: { content_band: 3, task_coverage: { req_0: true } },
    })
    expect(e).toEqual({
      lang: 'eng', format: 'eng-article', band: 4, words: 200,
      taskId: 't1', contentBand: 3, coverage: { req_0: true },
    })
  })
  it('no-task entry is exactly {lang,format,band,words} (today\'s shape)', () => {
    const e = buildAttemptEntry({ lang: 'eng', format: 'auto', band: 5, words: 150, task: undefined, aiResponse: null })
    expect(e).toEqual({ lang: 'eng', format: 'auto', band: 5, words: 150 })
  })
  it('contentBand is null when the AI returned no Content band', () => {
    const e = buildAttemptEntry({ lang: 'eng', format: 'eng-article', band: 4, words: 200, task: TASK, aiResponse: { band: 4 } })
    expect(e.taskId).toBe('t1')
    expect(e.contentBand).toBeNull()
    expect(e.coverage).toBeNull()
  })
})

describe('compareAttempts', () => {
  const prev = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: false, req_2: false } }
  it('improved=true on a content-band rise', () => {
    const curr = { taskId: 't1', contentBand: 4, coverage: { req_0: true, req_1: false, req_2: false } }
    const c = compareAttempts(prev, curr, TASK)
    expect(c.delta).toBe(2); expect(c.improved).toBe(true)
  })
  it('improved=true on a ✗→✓ flip even with an unchanged band', () => {
    const curr = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: true, req_2: false } }
    const c = compareAttempts(prev, curr, TASK)
    expect(c.flipsToMet).toEqual([1]); expect(c.improved).toBe(true)
  })
  it('improved=false when nothing real changed (the anti-over-praise case)', () => {
    const curr = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: false, req_2: false } }
    expect(compareAttempts(prev, curr, TASK).improved).toBe(false)
  })
  it('improved=false on a band drop; records a ✓→✗ regression', () => {
    const curr = { taskId: 't1', contentBand: 1, coverage: { req_0: false, req_1: false, req_2: false } }
    const c = compareAttempts(prev, curr, TASK)
    expect(c.improved).toBe(false); expect(c.flipsToMissed).toEqual([0])
  })
  it('returns null when an entry is missing', () => {
    expect(compareAttempts(null, prev, TASK)).toBeNull()
  })
  it('returns null when either attempt lacks a Content grade (AI down / no grader) — honest degrade', () => {
    const graded = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: false, req_2: false } }
    const ungraded = { taskId: 't1', contentBand: null, coverage: null }
    expect(compareAttempts(graded, ungraded, TASK)).toBeNull()   // AI failed on the resubmit
    expect(compareAttempts(ungraded, graded, TASK)).toBeNull()   // prior attempt had no grade
    expect(compareAttempts(ungraded, ungraded, TASK)).toBeNull() // free/no-Gemini deck — never graded
  })
})

describe('lastTwoAttemptsForTask', () => {
  it('returns the two most recent entries for the task, oldest-first', () => {
    const history = [
      { taskId: 't1', contentBand: 1 }, { taskId: 'other', contentBand: 9 },
      { taskId: 't1', contentBand: 2 }, { taskId: 't1', contentBand: 4 },
    ]
    expect(lastTwoAttemptsForTask(history, 't1')).toEqual([
      { taskId: 't1', contentBand: 2 }, { taskId: 't1', contentBand: 4 },
    ])
  })
  it('returns null with fewer than two attempts for the task', () => {
    expect(lastTwoAttemptsForTask([{ taskId: 't1' }], 't1')).toBeNull()
  })
})
