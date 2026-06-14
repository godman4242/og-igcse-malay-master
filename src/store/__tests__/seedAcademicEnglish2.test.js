// @vitest-environment jsdom
//
// seedAcademicEnglish2 adds the AWL Sublist 2 academic deck as lang:'en' cards in
// a dedicated "Academic English 2" deck — the second free, no-key "level up"
// seed. Mirrors seedAcademicEnglish's contract (lazy data import, addCards
// dedupe, returns the count added) but a distinct deck so the count-check is
// unambiguous. The store persists to localStorage, so the in-memory shim is
// installed BEFORE the store module loads.
import { describe, it, expect, beforeEach } from 'vitest'

let useStore, ACADEMIC_EN_2

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
  ;({ default: ACADEMIC_EN_2 } = await import('../../data/academicEn2'))
  useStore.setState({ cards: [] })
})

describe('seedAcademicEnglish2', () => {
  it('seeds every AWL Sublist 2 word as a lang:"en" card in the "Academic English 2" deck', async () => {
    const added = await useStore.getState().seedAcademicEnglish2()
    expect(added).toBe(ACADEMIC_EN_2.length)

    const cards = useStore.getState().cards
    const deck = cards.filter(c => c.t === 'Academic English 2')
    expect(deck).toHaveLength(ACADEMIC_EN_2.length)
    expect(deck.every(c => c.lang === 'en')).toBe(true)

    // The target word is m, the L1 gloss is e (matches the study-loop contract).
    const achieve = deck.find(c => c.m === 'achieve')
    expect(achieve).toBeTruthy()
    expect(achieve.e).toBe('mencapai')
    expect(achieve.ex).toContain('achieve')
  })

  it('is idempotent — a second call adds nothing (addCards dedupes on m,t,lang)', async () => {
    const first = await useStore.getState().seedAcademicEnglish2()
    expect(first).toBe(ACADEMIC_EN_2.length)
    const second = await useStore.getState().seedAcademicEnglish2()
    expect(second).toBe(0)
    expect(useStore.getState().cards.filter(c => c.t === 'Academic English 2'))
      .toHaveLength(ACADEMIC_EN_2.length)
  })

  it('does not touch the Malay deck — academic cards never leak into a ms session', async () => {
    await useStore.getState().seedAcademicEnglish2()
    const { cardsForLang } = await import('../../lib/cardLang')
    const msCards = cardsForLang(useStore.getState().cards, 'ms')
    expect(msCards.some(c => c.t === 'Academic English 2')).toBe(false)
  })

  it('is a separate deck from Sublist 1 — both can coexist', async () => {
    await useStore.getState().seedAcademicEnglish()
    await useStore.getState().seedAcademicEnglish2()
    const cards = useStore.getState().cards
    expect(cards.filter(c => c.t === 'Academic English')).toHaveLength(60)
    expect(cards.filter(c => c.t === 'Academic English 2')).toHaveLength(60)
  })
})
