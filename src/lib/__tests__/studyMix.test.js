import { describe, it, expect } from 'vitest'
import {
  mixNeedBonus, isValidPreset, presetEmphasis, STUDY_MIX_PRESETS, MIX_NEED_BONUS,
} from '../studyMix.js'

describe('studyMix', () => {
  it('balanced is identity — zero bonus for every skill', () => {
    for (const skill of ['speaking', 'writing', 'grammar']) {
      expect(mixNeedBonus('balanced', skill)).toBe(0)
    }
  })
  it('gives the bonus only to the emphasised skill', () => {
    expect(mixNeedBonus('more-speaking', 'speaking')).toBe(MIX_NEED_BONUS)
    expect(mixNeedBonus('more-speaking', 'writing')).toBe(0)
    expect(mixNeedBonus('more-grammar', 'grammar')).toBe(MIX_NEED_BONUS)
  })
  it('unknown preset is identity (safe default)', () => {
    expect(mixNeedBonus('nonsense', 'speaking')).toBe(0)
    expect(mixNeedBonus(undefined, 'writing')).toBe(0)
  })
  it('validates ids and exposes emphasis', () => {
    expect(isValidPreset('more-writing')).toBe(true)
    expect(isValidPreset('xyz')).toBe(false)
    expect(presetEmphasis('more-grammar')).toBe('grammar')
    expect(presetEmphasis('balanced')).toBe(null)
  })
  it('ships exactly the v1 set in order', () => {
    expect(STUDY_MIX_PRESETS.map(p => p.id))
      .toEqual(['balanced', 'more-speaking', 'more-writing', 'more-grammar'])
  })
  it('keeps the bonus bounded so a real urgent need can still win (<= 3)', () => {
    expect(MIX_NEED_BONUS).toBeLessThanOrEqual(3)
  })
})
