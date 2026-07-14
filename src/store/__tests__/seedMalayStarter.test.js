// @vitest-environment jsdom
//
// seedMalayStarter (Malay Beginner On-Ramp) seeds the ~45-word survival deck as
// lang:'ms' cards in a dedicated "Starter" deck — the Malay counterpart to
// seedEnglishStarter / seedAcademicEnglish. Mirrors their contract (lazy data
// import, addCards dedupe, returns the count added). The store persists to
// localStorage, so the in-memory shim is installed BEFORE the store loads.
import { describe, it, expect, beforeEach } from 'vitest'

let useStore, MALAY_STARTER

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
  ;({ default: MALAY_STARTER } = await import('../../data/malayStarter'))
  useStore.setState({ cards: [] })
})

describe('malayStarter data integrity', () => {
  it('is a curated ~40–50 word beginner set with complete, cloze-safe entries', () => {
    expect(MALAY_STARTER.length).toBeGreaterThanOrEqual(40)
    expect(MALAY_STARTER.length).toBeLessThanOrEqual(50)

    // No duplicate target words.
    const words = MALAY_STARTER.map(e => e.m)
    expect(new Set(words).size).toBe(words.length)

    for (const { m, e, ex, p } of MALAY_STARTER) {
      expect(m && e && ex && p, `entry "${m}" missing a field`).toBeTruthy()
      // The example must contain the target word (whole-word, case-insensitive)
      // or cloze/Produce blanking silently can't blank it. Same boundary notion
      // as blankInExample (letter/number lookarounds; hyphen is a boundary).
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu')
      expect(re.test(ex), `example for "${m}" does not contain it as a whole word: "${ex}"`).toBe(true)
    }
  })
})

describe('seedMalayStarter', () => {
  it('seeds every starter word as a lang:"ms" card in the "Starter" deck', async () => {
    const added = await useStore.getState().seedMalayStarter()
    expect(added).toBe(MALAY_STARTER.length)

    const cards = useStore.getState().cards
    const deck = cards.filter(c => c.t === 'Starter')
    expect(deck).toHaveLength(MALAY_STARTER.length)
    expect(deck.every(c => c.lang === 'ms')).toBe(true)

    // The target word is m, the L1 gloss is e (matches the study-loop contract).
    const terimaKasih = deck.find(c => c.m === 'terima kasih')
    expect(terimaKasih).toBeTruthy()
    expect(terimaKasih.e).toBe('thank you')
    expect(terimaKasih.ex).toContain('Terima kasih')
  })

  it('is idempotent — a second call adds nothing (addCards dedupes on m,t,lang)', async () => {
    const first = await useStore.getState().seedMalayStarter()
    expect(first).toBe(MALAY_STARTER.length)
    const second = await useStore.getState().seedMalayStarter()
    expect(second).toBe(0)
    expect(useStore.getState().cards.filter(c => c.t === 'Starter'))
      .toHaveLength(MALAY_STARTER.length)
  })

  it('does not leak into the English deck — starter cards stay in the ms partition', async () => {
    // Pre-existing English card must be untouched, and no starter card lands in 'en'.
    useStore.setState({ cards: [{ m: 'hotel', e: 'hotel', lang: 'en', t: 'English' }] })
    await useStore.getState().seedMalayStarter()
    const { cardsForLang } = await import('../../lib/cardLang')
    const enCards = cardsForLang(useStore.getState().cards, 'en')
    expect(enCards).toHaveLength(1)
    expect(enCards.some(c => c.t === 'Starter')).toBe(false)
    const msCards = cardsForLang(useStore.getState().cards, 'ms')
    expect(msCards).toHaveLength(MALAY_STARTER.length)
    expect(msCards.every(c => c.lang === 'ms')).toBe(true)
  })
})
