import { describe, it, expect } from 'vitest'
import { buildCompetenceSnapshot } from '../competenceSnapshot.js'
import { MASTERED_STABILITY_DAYS, State } from '../fsrs.js'

const TODAY = '2026-06-24'
const NOW = new Date(`${TODAY}T12:00:00`).getTime()

describe('buildCompetenceSnapshot', () => {
  it('returns null on an empty deck', () => {
    expect(buildCompetenceSnapshot({ langCards: [], todayISO: TODAY }, NOW)).toBe(null)
    expect(buildCompetenceSnapshot({ todayISO: TODAY }, NOW)).toBe(null)
  })

  it('composes mastered, skill bars, weak spots and readiness', () => {
    const snap = buildCompetenceSnapshot({
      langCards: [{ m: 'a', e: 'a', state: State.Review, stability: MASTERED_STABILITY_DAYS + 50 }],
      readinessPct: 62,
      todayISO: TODAY,
      lang: 'ms',
      writingHistory: [{ ts: NOW, band: 5, lang: 'malay' }],
      mistakes: [{ category: 'vocab', timestamp: NOW, severity: 'high', language: 'ms' }],
    }, NOW)
    expect(snap.readinessPct).toBe(62)
    expect(snap.mastered).toBeGreaterThanOrEqual(1)
    expect(snap.bars.find(b => b.skill === 'writing').count).toBe(1)
    expect(snap.bars.find(b => b.skill === 'reading').neglected).toBe(true)
    expect(snap.weakSpots).toContain('vocab')
  })

  it('readiness is null when not provided', () => {
    const snap = buildCompetenceSnapshot({ langCards: [{ m: 'a' }], todayISO: TODAY }, NOW)
    expect(snap.readinessPct).toBe(null)
  })
})
