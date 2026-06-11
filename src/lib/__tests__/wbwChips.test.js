import { describe, it, expect } from 'vitest'
import { buildWbwChips, WBW_SOURCES } from '../wbwChips'

// Issue 1 — Import "Word-by-Word" chip grid. The raw word-by-word result mixes
// real vocab tokens with 'skip' tokens (punctuation/whitespace). The chip grid
// is a scannable vocab reference (not a reading view), so skip tokens are
// dropped and the rest become chips with a normalized source + per-source tally.

describe('buildWbwChips', () => {
  it('drops skip (punctuation/whitespace) tokens', () => {
    const tokens = [
      { word: 'Saya', meaning: 'I', source: 'dict' },
      { word: '.', meaning: null, source: 'skip' },
      { word: 'makan', meaning: 'eat', source: 'dict' },
    ]
    const { chips } = buildWbwChips(tokens)
    expect(chips.map(c => c.word)).toEqual(['Saya', 'makan'])
  })

  it('preserves the original order of kept tokens', () => {
    const tokens = [
      { word: 'a', meaning: '1', source: 'dict' },
      { word: 'b', meaning: '2', source: 'stem' },
      { word: 'c', meaning: '3', source: 'google' },
    ]
    expect(buildWbwChips(tokens).chips.map(c => c.word)).toEqual(['a', 'b', 'c'])
  })

  it('tallies per-source counts (skips excluded)', () => {
    const tokens = [
      { word: 'a', meaning: '1', source: 'dict' },
      { word: 'b', meaning: '2', source: 'dict' },
      { word: 'c', meaning: '3', source: 'stem' },
      { word: 'd', meaning: '4', source: 'google' },
      { word: '!', meaning: null, source: 'skip' },
    ]
    expect(buildWbwChips(tokens).counts).toEqual({ dict: 2, stem: 1, google: 1, unknown: 0 })
  })

  it('normalizes an unrecognised source to "unknown"', () => {
    const tokens = [{ word: 'x', meaning: '?', source: 'weird' }]
    const { chips, counts } = buildWbwChips(tokens)
    expect(chips[0].source).toBe('unknown')
    expect(counts.unknown).toBe(1)
  })

  it('falls back to "?" for a missing meaning (e.g. a stem with no gloss)', () => {
    const tokens = [{ word: 'berlari', meaning: undefined, source: 'stem' }]
    expect(buildWbwChips(tokens).chips[0].meaning).toBe('?')
  })

  it('keeps the explicit "unknown" source as-is', () => {
    const tokens = [{ word: 'xyz', meaning: '?', source: 'unknown' }]
    expect(buildWbwChips(tokens).chips[0].source).toBe('unknown')
  })

  it('returns empty chips + zeroed counts for non-array / empty input', () => {
    expect(buildWbwChips(null)).toEqual({ chips: [], counts: { dict: 0, stem: 0, google: 0, unknown: 0 } })
    expect(buildWbwChips([]).chips).toEqual([])
  })

  it('exposes the canonical source list', () => {
    expect(WBW_SOURCES).toEqual(['dict', 'stem', 'google', 'unknown'])
  })
})
