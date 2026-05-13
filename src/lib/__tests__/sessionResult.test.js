import { describe, it, expect } from 'vitest'
import { createTaskResult, buildSessionSummary } from '../study/sessionResult.js'

const makeTask = (type, weight, word = 'kerja') => ({
  type,
  weight,
  card: { m: word, e: `meaning of ${word}` },
})

describe('createTaskResult', () => {
  it('captures the task type, focal word, and correctness', () => {
    const task = makeTask('fc', 1, 'belajar')
    const result = createTaskResult(task, { correct: true, rating: 3 })
    expect(result.type).toBe('fc')
    expect(result.focalWord).toBe('belajar')
    expect(result.correct).toBe(true)
  })

  it('marks skipped tasks', () => {
    const task = makeTask('quiz', 1)
    const result = createTaskResult(task, { skipped: true })
    expect(result.skipped).toBe(true)
  })
})

describe('buildSessionSummary', () => {
  const startTime = Date.now() - 15 * 60 * 1000

  it('calculates accuracy correctly', () => {
    const results = [
      createTaskResult(makeTask('fc', 1), { correct: true }),
      createTaskResult(makeTask('quiz', 1), { correct: false }),
    ]
    const summary = buildSessionSummary(results, startTime)
    expect(summary.accuracy).toBe(50)
  })

  it('identifies weak words', () => {
    const results = [
      createTaskResult(makeTask('fc', 1, 'kerja'), { correct: false }),
      createTaskResult(makeTask('quiz', 1, 'kerja'), { correct: false }),
    ]
    const summary = buildSessionSummary(results, startTime)
    expect(summary.weakWords).toContain('kerja')
  })
})
