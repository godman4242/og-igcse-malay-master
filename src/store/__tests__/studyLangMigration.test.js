import { describe, it, expect } from 'vitest'
import { STORE_VERSION, applyV34Migration } from '../useStore'

describe('STORE_VERSION 35 — True English study mode + studyMix', () => {
  it('is bumped to 35', () => {
    expect(STORE_VERSION).toBe(35)
  })

  it('backfills lang:ms on existing cards and adds studyLang:ms', () => {
    const next = applyV34Migration({
      cards: [{ m: 'rumah', e: 'house' }, { m: 'abang', e: 'older brother', lang: 'ms' }],
    })
    expect(next.cards.every((c) => c.lang === 'ms')).toBe(true)
    expect(next.studyLang).toBe('ms')
  })

  it('does not clobber an already-tagged English card', () => {
    const next = applyV34Migration({ cards: [{ m: 'brother', e: 'abang', lang: 'en' }] })
    expect(next.cards[0].lang).toBe('en')
  })

  it('preserves an existing studyLang choice and all other state', () => {
    const next = applyV34Migration({ studyLang: 'en', cards: [], streak: { count: 5 } })
    expect(next.studyLang).toBe('en')
    expect(next.streak).toEqual({ count: 5 })
  })
})
