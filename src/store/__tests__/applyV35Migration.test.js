import { describe, it, expect } from 'vitest'
import { applyV35Migration } from '../useStore.js'

describe('applyV35Migration (v34 → v35)', () => {
  it('adds a balanced studyMix and preserves all existing data', () => {
    const before = { cards: [{ m: 'x' }], studyLang: 'en', mistakes: [] }
    const after = applyV35Migration(before)
    expect(after.studyMix).toEqual({ ms: 'balanced', en: 'balanced' })
    expect(after.cards).toBe(before.cards)   // same ref — no clone of payload
    expect(after.studyLang).toBe('en')
  })
  it('preserves an already-present studyMix (idempotent)', () => {
    const before = { studyMix: { ms: 'more-speaking', en: 'balanced' } }
    expect(applyV35Migration(before).studyMix).toEqual({ ms: 'more-speaking', en: 'balanced' })
  })
})
