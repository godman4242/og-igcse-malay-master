import { describe, it, expect } from 'vitest'
import { GOAL_PRESETS, goalToFocus } from '../goals.js'

describe('GOAL_PRESETS', () => {
  it('exposes presets with unique ids and a Custom escape hatch', () => {
    const ids = GOAL_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length) // unique
    expect(ids).toContain('custom')
    for (const p of GOAL_PRESETS) {
      expect(typeof p.label).toBe('string')
      expect(Array.isArray(p.emphasise)).toBe(true)
    }
  })
})

describe('goalToFocus', () => {
  it('returns the preset emphasis for a known non-custom preset', () => {
    expect(goalToFocus('speak', '').emphasise).toEqual(['speaking', 'roleplay'])
    expect(goalToFocus('pass', '').emphasise[0]).toBe('exam')
  })

  it('a chosen preset wins over the free-text sentence', () => {
    // Preset says speaking; sentence talks about essays — preset is the explicit signal.
    expect(goalToFocus('speak', 'I want to write better essays').emphasise).toEqual(['speaking', 'roleplay'])
  })

  it('derives emphasis from the sentence when the preset is custom', () => {
    expect(goalToFocus('custom', 'I want to speak confidently in my oral exam').emphasise)
      .toContain('speaking')
  })

  it('derives multiple, de-duplicated emphases from a rich sentence', () => {
    const out = goalToFocus('custom', 'improve my writing and my grammar for the exam').emphasise
    expect(out).toEqual(expect.arrayContaining(['writing', 'grammar', 'exam']))
    expect(new Set(out).size).toBe(out.length)
  })

  it('is case-insensitive and understands a few Malay keywords', () => {
    expect(goalToFocus('custom', 'baiki KARANGAN saya').emphasise).toContain('writing')
    expect(goalToFocus(null, 'lulus peperiksaan').emphasise).toContain('exam')
  })

  it('falls back to a sentence scan for an unknown preset id', () => {
    expect(goalToFocus('nonsense', 'practise speaking').emphasise).toContain('speaking')
  })

  it('returns an empty emphasis for a null preset + empty/vague sentence', () => {
    expect(goalToFocus(null, '').emphasise).toEqual([])
    expect(goalToFocus(undefined, undefined).emphasise).toEqual([])
    expect(goalToFocus('custom', 'i just want to be better').emphasise).toEqual([])
  })
})
