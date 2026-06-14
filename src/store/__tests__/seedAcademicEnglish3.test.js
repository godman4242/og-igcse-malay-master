// @vitest-environment jsdom
//
// seedAcademicEnglish3 adds the AWL Sublist 3 academic deck as lang:'en' cards in
// a dedicated "Academic English 3" deck — the third free, no-key "level up" seed.
// Mirrors seedAcademicEnglish2's contract (lazy data import, addCards dedupe,
// returns the count added) with a distinct deck. The store persists to
// localStorage, so the in-memory shim is installed BEFORE the store module loads.
import { describe, it, expect, beforeEach } from 'vitest'

let useStore, ACADEMIC_EN_3

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
  ;({ default: ACADEMIC_EN_3 } = await import('../../data/academicEn3'))
  useStore.setState({ cards: [] })
})

describe('seedAcademicEnglish3', () => {
  it('seeds every AWL Sublist 3 word as a lang:"en" card in the "Academic English 3" deck', async () => {
    const added = await useStore.getState().seedAcademicEnglish3()
    expect(added).toBe(ACADEMIC_EN_3.length)

    const cards = useStore.getState().cards
    const deck = cards.filter(c => c.t === 'Academic English 3')
    expect(deck).toHaveLength(ACADEMIC_EN_3.length)
    expect(deck.every(c => c.lang === 'en')).toBe(true)

    // The target word is m, the L1 gloss is e (matches the study-loop contract).
    const ensure = deck.find(c => c.m === 'ensure')
    expect(ensure).toBeTruthy()
    expect(ensure.e).toBe('memastikan')
    expect(ensure.ex).toContain('ensure')
  })

  it('is idempotent — a second call adds nothing (addCards dedupes on m,t,lang)', async () => {
    const first = await useStore.getState().seedAcademicEnglish3()
    expect(first).toBe(ACADEMIC_EN_3.length)
    const second = await useStore.getState().seedAcademicEnglish3()
    expect(second).toBe(0)
    expect(useStore.getState().cards.filter(c => c.t === 'Academic English 3'))
      .toHaveLength(ACADEMIC_EN_3.length)
  })

  it('does not touch the Malay deck — academic cards never leak into a ms session', async () => {
    await useStore.getState().seedAcademicEnglish3()
    const { cardsForLang } = await import('../../lib/cardLang')
    const msCards = cardsForLang(useStore.getState().cards, 'ms')
    expect(msCards.some(c => c.t === 'Academic English 3')).toBe(false)
  })

  it('coexists with Sublists 1 and 2 as a separate deck', async () => {
    await useStore.getState().seedAcademicEnglish()
    await useStore.getState().seedAcademicEnglish2()
    await useStore.getState().seedAcademicEnglish3()
    const cards = useStore.getState().cards
    expect(cards.filter(c => c.t === 'Academic English')).toHaveLength(60)
    expect(cards.filter(c => c.t === 'Academic English 2')).toHaveLength(60)
    expect(cards.filter(c => c.t === 'Academic English 3')).toHaveLength(60)
  })
})
