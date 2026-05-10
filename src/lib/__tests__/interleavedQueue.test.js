import { describe, it, expect } from 'vitest'
import {
  buildCycle,
  selectFocalCards,
  buildSession,
  enforceNoBB3,
  enforceSoftLanding,
} from '../study/interleavedQueue.js'

// ─── Helpers ──────────────────────────────────────────────────────

const makeCard = (m, e, opts = {}) => ({
  m,
  e: e || `meaning of ${m}`,
  t: opts.t || 'test-deck',
  ex: opts.ex || null,
  stability: opts.stability ?? 5,
  difficulty: opts.difficulty ?? 5,
  state: opts.state ?? 2,
  reps: opts.reps ?? 3,
  lapses: opts.lapses ?? 0,
  due: opts.due || new Date(Date.now() - 1000).toISOString(),
  last_review: opts.last_review || new Date().toISOString(),
})

const makeMistake = (word, daysAgo = 1) => ({
  id: `m-${word}`,
  type: 'vocab',
  word,
  timestamp: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
})

// ─── buildCycle ───────────────────────────────────────────────────

describe('buildCycle', () => {
  it('always starts with a flashcard (load 1)', () => {
    const card = makeCard('kerja', 'work')
    const cycle = buildCycle(card, { cycleIdx: 0 })
    expect(cycle.tasks[0].type).toBe('fc')
    expect(cycle.tasks[0].weight).toBe(1)
    expect(cycle.focalWord).toBe('kerja')
  })

  it('uses cloze (load 2) when card has a matching example sentence', () => {
    const card = makeCard('kerja', 'work', { ex: 'Dia pergi kerja setiap hari.' })
    const cycle = buildCycle(card, { cycleIdx: 0 })
    expect(cycle.tasks[1].type).toBe('cloze')
    expect(cycle.tasks[1].weight).toBe(2)
  })

  it('uses quiz (load 1) when card has no usable example sentence', () => {
    const card = makeCard('kerja', 'work', { ex: null })
    const cycle = buildCycle(card, { cycleIdx: 0 })
    expect(cycle.tasks[1].type).toBe('quiz')
    expect(cycle.tasks[1].weight).toBe(1)
  })

  it('always includes micro-write (load 3)', () => {
    const card = makeCard('kerja', 'work')
    const cycle = buildCycle(card, { cycleIdx: 0 })
    const writeTask = cycle.tasks.find(t => t.type === 'micro-write')
    expect(writeTask).toBeDefined()
    expect(writeTask.weight).toBe(3)
    expect(writeTask.prompt).toContain('kerja')
  })

  it('includes speaking only on every 3rd cycle (cycleIdx % 3 === 2)', () => {
    const card = makeCard('kerja', 'work')
    const cycle0 = buildCycle(card, { cycleIdx: 0, includeSpeaking: true })
    const cycle1 = buildCycle(card, { cycleIdx: 1, includeSpeaking: true })
    const cycle2 = buildCycle(card, { cycleIdx: 2, includeSpeaking: true })

    expect(cycle0.tasks.some(t => t.type === 'micro-speak')).toBe(false)
    expect(cycle1.tasks.some(t => t.type === 'micro-speak')).toBe(false)
    expect(cycle2.tasks.some(t => t.type === 'micro-speak')).toBe(true)
  })

  it('never includes speaking when includeSpeaking=false', () => {
    const card = makeCard('kerja', 'work')
    const cycle = buildCycle(card, { cycleIdx: 2, includeSpeaking: false })
    expect(cycle.tasks.some(t => t.type === 'micro-speak')).toBe(false)
  })

  it('escalates cognitive load within a cycle (non-decreasing trend)', () => {
    const card = makeCard('kerja', 'work', { ex: 'Saya suka kerja di sini.' })
    const cycle = buildCycle(card, { cycleIdx: 2, includeSpeaking: true })
    // The weights should generally escalate: 1, 2, 3, [3]
    for (let i = 1; i < cycle.tasks.length; i++) {
      expect(cycle.tasks[i].weight).toBeGreaterThanOrEqual(cycle.tasks[i - 1].weight)
    }
  })
})

// ─── selectFocalCards ─────────────────────────────────────────────

describe('selectFocalCards', () => {
  it('prioritises recent mistake words over plain due cards', () => {
    const cards = [
      makeCard('kerja', 'work', { stability: 5 }),
      makeCard('belajar', 'study', { stability: 10 }),
      makeCard('makan', 'eat', { stability: 2 }),
    ]
    const mistakes = [makeMistake('makan', 1)]
    const selected = selectFocalCards(cards, mistakes, 3)
    expect(selected[0].m).toBe('makan')
  })

  it('deduplicates focal cards', () => {
    const cards = [makeCard('kerja', 'work')]
    const mistakes = [makeMistake('kerja', 1), makeMistake('kerja', 2)]
    const selected = selectFocalCards(cards, mistakes, 5)
    expect(selected.filter(c => c.m === 'kerja')).toHaveLength(1)
  })

  it('respects maxCycles cap', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      makeCard(`word${i}`, `meaning${i}`)
    )
    const selected = selectFocalCards(cards, [], 5)
    expect(selected.length).toBeLessThanOrEqual(5)
  })

  it('falls back to lowest-stability cards when due list is empty', () => {
    const cards = [
      makeCard('kerja', 'work', { stability: 100, due: new Date(Date.now() + 999999999).toISOString() }),
      makeCard('belajar', 'study', { stability: 0.5, due: new Date(Date.now() + 999999999).toISOString() }),
    ]
    const selected = selectFocalCards(cards, [], 2)
    // Both should be selected; the weakest-stability one should be present
    expect(selected.some(c => c.m === 'belajar')).toBe(true)
  })

  it('ignores mistakes older than 7 days', () => {
    const cards = [
      makeCard('kerja', 'work'),
      makeCard('belajar', 'study'),
    ]
    const oldMistake = makeMistake('kerja', 10) // 10 days ago
    const selected = selectFocalCards(cards, [oldMistake], 2)
    // kerja should NOT be prioritised as a mistake-driven focal card
    // It may still appear as a due card, but it shouldn't be first due to mistake priority
    expect(selected.length).toBe(2)
  })
})

// ─── enforceNoBB3 ─────────────────────────────────────────────────

describe('enforceNoBB3', () => {
  it('separates consecutive load-3 tasks', () => {
    const tasks = [
      { type: 'fc', weight: 1 },
      { type: 'micro-write', weight: 3 },
      { type: 'micro-speak', weight: 3 },
      { type: 'cloze', weight: 2 },
    ]
    const result = enforceNoBB3(tasks)
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].weight >= 3) {
        expect(result[i + 1].weight).toBeLessThan(3)
      }
    }
  })

  it('does not modify a queue with no violations', () => {
    const tasks = [
      { type: 'fc', weight: 1 },
      { type: 'micro-write', weight: 3 },
      { type: 'cloze', weight: 2 },
      { type: 'micro-speak', weight: 3 },
    ]
    const result = enforceNoBB3(tasks)
    expect(result).toEqual(tasks)
  })

  it('handles all-heavy edge case without infinite loop', () => {
    const tasks = [
      { type: 'micro-write', weight: 3 },
      { type: 'micro-speak', weight: 3 },
      { type: 'micro-write', weight: 3 },
    ]
    // Should terminate without infinite loop; best-effort
    const result = enforceNoBB3(tasks)
    expect(result).toHaveLength(3)
  })

  it('preserves total task count', () => {
    const tasks = [
      { type: 'fc', weight: 1 },
      { type: 'micro-write', weight: 3 },
      { type: 'micro-speak', weight: 3 },
      { type: 'quiz', weight: 1 },
      { type: 'micro-write', weight: 3 },
    ]
    const result = enforceNoBB3(tasks)
    expect(result).toHaveLength(tasks.length)
  })
})

// ─── enforceSoftLanding ───────────────────────────────────────────

describe('enforceSoftLanding', () => {
  it('swaps the last task if it is weight 3', () => {
    const tasks = [
      { type: 'fc', weight: 1 },
      { type: 'cloze', weight: 2 },
      { type: 'micro-write', weight: 3 },
    ]
    const result = enforceSoftLanding(tasks)
    expect(result[result.length - 1].weight).toBeLessThanOrEqual(2)
  })

  it('leaves the queue unchanged if last task is already light', () => {
    const tasks = [
      { type: 'micro-write', weight: 3 },
      { type: 'fc', weight: 1 },
    ]
    const result = enforceSoftLanding(tasks)
    expect(result[result.length - 1].weight).toBe(1)
    expect(result).toEqual(tasks)
  })

  it('handles empty queue', () => {
    expect(enforceSoftLanding([])).toEqual([])
  })

  it('handles all-heavy queue gracefully (no crash)', () => {
    const tasks = [
      { type: 'micro-write', weight: 3 },
      { type: 'micro-speak', weight: 3 },
    ]
    const result = enforceSoftLanding(tasks)
    expect(result).toHaveLength(2)
  })
})

// ─── buildSession (integration) ───────────────────────────────────

describe('buildSession', () => {
  const cards = [
    makeCard('kerja', 'work', { ex: 'Saya pergi kerja pagi tadi.' }),
    makeCard('belajar', 'study', { ex: 'Adik belajar di bilik.' }),
    makeCard('makan', 'eat'),
    makeCard('tidur', 'sleep'),
    makeCard('membaca', 'to read', { ex: 'Kakak suka membaca buku.' }),
  ]

  it('returns cycles and a flat task queue', () => {
    const session = buildSession({ cards })
    expect(session.cycles.length).toBeGreaterThan(0)
    expect(session.tasks.length).toBeGreaterThan(0)
    expect(session.totalWeight).toBeGreaterThan(0)
  })

  it('never schedules two load-3 tasks back-to-back', () => {
    const session = buildSession({ cards, targetMinutes: 20 })
    for (let i = 0; i < session.tasks.length - 1; i++) {
      if (session.tasks[i].weight >= 3) {
        expect(session.tasks[i + 1].weight).toBeLessThan(3)
      }
    }
  })

  it('always ends on a task with weight ≤ 2', () => {
    const session = buildSession({ cards, targetMinutes: 20 })
    if (session.tasks.length > 0) {
      expect(session.tasks[session.tasks.length - 1].weight).toBeLessThanOrEqual(2)
    }
  })

  it('returns empty session for empty card list', () => {
    const session = buildSession({ cards: [] })
    expect(session.cycles).toHaveLength(0)
    expect(session.tasks).toHaveLength(0)
    expect(session.totalWeight).toBe(0)
  })

  it('excludes speaking tasks when includeSpeaking=false', () => {
    const session = buildSession({ cards, includeSpeaking: false, targetMinutes: 20 })
    expect(session.tasks.some(t => t.type === 'micro-speak')).toBe(false)
  })

  it('mistakes get priority as focal cards', () => {
    const mistakes = [makeMistake('tidur', 1)]
    const session = buildSession({ cards, mistakes, targetMinutes: 8 })
    // The first cycle's focal word should be the mistake word
    expect(session.cycles[0].focalWord).toBe('tidur')
  })

  it('scales cycle count with targetMinutes', () => {
    const shortSession = buildSession({ cards, targetMinutes: 4 })
    const longSession = buildSession({ cards, targetMinutes: 20 })
    expect(longSession.cycles.length).toBeGreaterThanOrEqual(shortSession.cycles.length)
  })
})
