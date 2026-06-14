import { describe, it, expect } from 'vitest'
import {
  getExpertResponse,
  isConfidentMatch,
  MIN_CONFIDENCE,
  searchKnowledge,
} from '../cikguKnowledge.js'

// The free Cikgu expert system must NOT bluff. searchKnowledge() almost never
// returns zero results (its keyword scorer scrapes a point off almost anything),
// so a weak/off-topic top match used to be presented as authoritative. The
// confidence gate (MIN_CONFIDENCE) makes it admit uncertainty instead — a
// confident WRONG grammar answer is the worst failure mode for a learning tool.
//
// Calibrated keyless from scripts/ai-tier-eval/goldCikgu.mjs: every genuinely
// strong match scores ≥49, the whole ambiguous floor ≤31 (empty gap 32–48).

describe('Cikgu free expert confidence gate', () => {
  it('MIN_CONFIDENCE sits inside the empty 32–48 gap from the gold calibration', () => {
    expect(MIN_CONFIDENCE).toBeGreaterThanOrEqual(32)
    expect(MIN_CONFIDENCE).toBeLessThanOrEqual(48)
  })

  it('answers a strong in-coverage query with the full canned answer', () => {
    const r = getExpertResponse('Explain the meN- prefix')
    expect(r.confident).toBe(true)
    // The real canned answer, not the uncertainty hedge.
    expect(r.text).not.toMatch(/not sure|not confident|don't have a specific/i)
    expect(r.text.length).toBeGreaterThan(100)
  })

  it('admits uncertainty and offers the free AI tutor on an off-topic query', () => {
    // The KB has a generic "peribahasa" entry but not THIS proverb's meaning, so
    // searchKnowledge scrapes a low-score topic match (≈24) — below MIN_CONFIDENCE.
    const q = 'What does the peribahasa "bagai aur dengan tebing" mean?'
    const r = getExpertResponse(q)
    expect(r.confident).toBe(false)
    expect(r.text).toMatch(/not sure|not confident/i)
    expect(r.text).toMatch(/\bAI\b/) // points the student to the free AI tutor
  })

  it('names the closest topic it DID find so the hedge is still helpful', () => {
    const q = 'What does the peribahasa "bagai aur dengan tebing" mean?'
    const closest = searchKnowledge(q, 1)[0].entry.title
    const r = getExpertResponse(q)
    expect(r.text).toContain(closest)
  })

  it('routes pure nonsense (a low scrape, never zero results) to uncertainty', () => {
    const r = getExpertResponse('asdfqwer zxcv nonsense')
    expect(r.confident).toBe(false)
    expect(r.text).toMatch(/not sure|not confident|don't have a specific/i)
  })

  it('isConfidentMatch is false for empty results and below-threshold scores', () => {
    expect(isConfidentMatch([])).toBe(false)
    expect(isConfidentMatch([{ score: MIN_CONFIDENCE - 1, entry: {} }])).toBe(false)
    expect(isConfidentMatch([{ score: MIN_CONFIDENCE, entry: {} }])).toBe(true)
  })
})
