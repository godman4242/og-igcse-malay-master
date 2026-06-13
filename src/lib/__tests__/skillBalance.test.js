// Per-paper balance meter — pure aggregator (review feature #7).
// Spec: docs/superpowers/specs/2026-06-13-per-paper-balance-meter-design.md
//
// skillBalance(sources, todayISO) rolls the last 7 LOCAL days of per-skill
// activity into counts. Reading/Listening/Grammar come from the new
// skillActivity log; Writing/Speaking/Exam derive from the existing history
// arrays; Vocab = active study days (studyHistory days with reviews > 0).

import { describe, it, expect } from 'vitest'
import { skillBalance, SKILL_KEYS } from '../skillBalance'

const TODAY = '2026-06-13' // window = 2026-06-07 .. 2026-06-13 inclusive

const empty = () => ({
  skillActivity: {},
  writingHistory: [],
  speakingHistory: [],
  roleplayHistory: [],
  studyHistory: {},
  examAttempts: [],
})

describe('skillBalance', () => {
  it('exports the 7 skill keys in display order', () => {
    expect(SKILL_KEYS).toEqual(['reading', 'listening', 'writing', 'speaking', 'vocab', 'grammar', 'exam'])
  })

  it('returns all-zero counts and every skill neglected on empty sources', () => {
    const r = skillBalance(empty(), TODAY)
    expect(r.total).toBe(0)
    for (const k of SKILL_KEYS) expect(r.counts[k]).toBe(0)
    expect(r.neglected).toEqual(SKILL_KEYS)
  })

  it('sums skillActivity entries inside the 7-day window and excludes older days', () => {
    const r = skillBalance({
      ...empty(),
      skillActivity: {
        '2026-06-13': { reading: 2, listening: 1 },
        '2026-06-07': { reading: 1, grammar: 3 }, // oldest in-window day
        '2026-06-06': { reading: 9, listening: 9 }, // outside — excluded
      },
    }, TODAY)
    expect(r.counts.reading).toBe(3)
    expect(r.counts.listening).toBe(1)
    expect(r.counts.grammar).toBe(3)
    expect(r.total).toBe(7)
  })

  it('derives writing from writingHistory ts within the window', () => {
    const r = skillBalance({
      ...empty(),
      writingHistory: [
        { ts: '2026-06-12T12:00:00Z', format: 'email' },
        { ts: '2026-06-01T12:00:00Z', format: 'email' }, // outside
      ],
    }, TODAY)
    expect(r.counts.writing).toBe(1)
  })

  it('derives speaking from speakingHistory PLUS roleplayHistory (which stamps `date`)', () => {
    const r = skillBalance({
      ...empty(),
      speakingHistory: [{ ts: '2026-06-11T12:00:00Z', band: 4 }],
      roleplayHistory: [
        { date: '2026-06-10T12:00:00Z', score: 70 },
        { date: '2026-05-20T12:00:00Z', score: 50 }, // outside
      ],
    }, TODAY)
    expect(r.counts.speaking).toBe(2)
  })

  it('derives vocab as the number of in-window study days with reviews > 0', () => {
    const r = skillBalance({
      ...empty(),
      studyHistory: {
        '2026-06-13': { reviews: 12, minutes: 6 },
        '2026-06-10': { reviews: 0, minutes: 3 }, // minutes only — not a review day
        '2026-06-08': { reviews: 5, minutes: 2 },
        '2026-06-01': { reviews: 30, minutes: 10 }, // outside
      },
    }, TODAY)
    expect(r.counts.vocab).toBe(2)
  })

  it('derives exam from examAttempts within the window', () => {
    const r = skillBalance({
      ...empty(),
      examAttempts: [
        { ts: '2026-06-09T12:00:00Z', readinessScore: 61 },
        { ts: '2026-04-01T12:00:00Z', readinessScore: 40 }, // outside
      ],
    }, TODAY)
    expect(r.counts.exam).toBe(1)
  })

  it('lists only zero-count skills as neglected, in display order', () => {
    const r = skillBalance({
      ...empty(),
      skillActivity: { '2026-06-13': { reading: 1 } },
      writingHistory: [{ ts: '2026-06-13T01:00:00Z' }],
    }, TODAY)
    expect(r.neglected).toEqual(['listening', 'speaking', 'vocab', 'grammar', 'exam'])
  })

  it('tolerates missing/null source fields without throwing', () => {
    const r = skillBalance({}, TODAY)
    expect(r.total).toBe(0)
    expect(r.neglected).toEqual(SKILL_KEYS)
  })

  it('ignores malformed records (no ts/date, unknown skill keys)', () => {
    const r = skillBalance({
      ...empty(),
      skillActivity: { '2026-06-13': { notASkill: 4, reading: 1 } },
      writingHistory: [{ format: 'email' }], // no ts
      roleplayHistory: [{ score: 9 }], // no date
    }, TODAY)
    expect(r.counts.reading).toBe(1)
    expect(r.counts.writing).toBe(0)
    expect(r.counts.speaking).toBe(0)
    expect(r.total).toBe(1)
  })
})
