// @vitest-environment jsdom
//
// seedAcademicEnglish (v34 follow-on) adds the AWL Sublist 1 academic deck as
// lang:'en' cards in a dedicated "Academic English" deck — the free, no-key
// "level up" seed. Mirrors seedEnglishStarter's contract (lazy data import,
// addCards dedupe, returns the count added). The store persists to localStorage,
// so the in-memory shim is installed BEFORE the store module loads.
import { describe, it, expect, beforeEach } from 'vitest'

let useStore, ACADEMIC_EN

beforeEach(async () => {
  const mem = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)) },
      removeItem: (k) => { mem.delete(k) },
      clear: () => { mem.clear() },
      key: (i) => [...mem.keys()][i] ?? null,
      get length() { return mem.size },
    },
  })
  ;({ default: useStore } = await import('../useStore'))
  ;({ default: ACADEMIC_EN } = await import('../../data/academicEn'))
  useStore.setState({ cards: [] })
})

describe('seedAcademicEnglish', () => {
  it('seeds every AWL word as a lang:"en" card in the "Academic English" deck', async () => {
    const added = await useStore.getState().seedAcademicEnglish()
    expect(added).toBe(ACADEMIC_EN.length)

    const cards = useStore.getState().cards
    const deck = cards.filter(c => c.t === 'Academic English')
    expect(deck).toHaveLength(ACADEMIC_EN.length)
    expect(deck.every(c => c.lang === 'en')).toBe(true)

    // The target word is m, the L1 gloss is e (matches the study-loop contract).
    const factor = deck.find(c => c.m === 'factor')
    expect(factor).toBeTruthy()
    expect(factor.e).toBe('faktor')
    expect(factor.ex).toContain('factor')
  })

  it('is idempotent — a second call adds nothing (addCards dedupes on m,t,lang)', async () => {
    const first = await useStore.getState().seedAcademicEnglish()
    expect(first).toBe(ACADEMIC_EN.length)
    const second = await useStore.getState().seedAcademicEnglish()
    expect(second).toBe(0)
    expect(useStore.getState().cards.filter(c => c.t === 'Academic English'))
      .toHaveLength(ACADEMIC_EN.length)
  })

  it('does not touch the Malay deck — academic cards never leak into a ms session', async () => {
    await useStore.getState().seedAcademicEnglish()
    const { cardsForLang } = await import('../../lib/cardLang')
    const msCards = cardsForLang(useStore.getState().cards, 'ms')
    expect(msCards.some(c => c.t === 'Academic English')).toBe(false)
  })
})
