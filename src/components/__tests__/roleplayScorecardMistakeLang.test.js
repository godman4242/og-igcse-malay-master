// @vitest-environment jsdom
//
// END-RESULT regression guard for F5 Increment 6 (2026-06-14): the roleplay
// scorecard must tag its logged mistakes with the ROLEPLAY's language, not a
// hardcoded 'ms'. Pre-fix, RoleplayScorecard.jsx hardcoded `language: 'ms'` at
// all 4 addMistake sites — so an English (🇬🇧) roleplay's missed key phrases
// were journaled as Malay and, now that Fork F auto-promotes English vocab
// misses, seeded a WRONG-language card (Malay deck) instead of the English Due
// queue.
//
// This MOUNTS the real component (not a store-level call) because the bug lives
// in the component's hardcode, not the store — the store gate
// (canAutoPromoteMistake / promoteMistakeToCard) is already correct and pinned
// by englishMistakePromotion.test.js. The mount exercises the real useEffect →
// real addMistake → real auto-promotion, so it asserts what the learner gets.
//
// RoleplayScorecard pulls the zustand store (persist → localStorage), so the
// in-memory Storage shim must be installed BEFORE the store module loads
// (Node 25's bare global localStorage stub throws on setItem) — hence the
// dynamic imports inside beforeEach, mirroring searchModalA11y.test.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, MemoryRouter, RoleplayScorecard, useStore, cardsForLang
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
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
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ default: RoleplayScorecard } = await import('../RoleplayScorecard'))
  ;({ default: useStore } = await import('../../store/useStore'))
  ;({ cardsForLang } = await import('../../lib/cardLang'))

  // Clean slate so we read only the mistake/card this mount produces.
  useStore.setState(s => ({ cards: [], mistakes: [], sync: { ...s.sync, queue: [] } }))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

// Mount the scorecard. band 3 keeps it below the score>=5 confetti path.
async function mount(scenario) {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoleplayScorecard, {
          scenario,
          messages: [],
          scoreData: { overallBand: 3, keyPhraseMissed: ['reference number'] },
        })
      )
    )
  )
}

describe('RoleplayScorecard — mistake language follows the roleplay language', () => {
  it('tags an English roleplay miss as English and promotes a lang:en card', async () => {
    await mount({ id: 'lost-luggage', lang: 'en', title: 'Lost Luggage', titleEn: 'Lost Luggage' })

    const mistake = useStore.getState().mistakes.find(m => m.word === 'reference number')
    expect(mistake).toBeTruthy()
    expect(mistake.language).toBe('en')

    // Fork F auto-promotes the EN vocab miss → it must land in the English deck.
    const card = useStore.getState().cards.find(c => c.t === 'Mistakes' && c.m === 'reference number')
    expect(card).toBeTruthy()
    expect(card.lang).toBe('en')
    expect(cardsForLang(useStore.getState().cards, 'en').some(c => c.m === 'reference number')).toBe(true)
    expect(cardsForLang(useStore.getState().cards, 'ms').some(c => c.m === 'reference number')).toBe(false)
  })

  it('keeps a Malay roleplay miss Malay (byte-identical, scenario.lang undefined)', async () => {
    await mount({ id: 'kapal-terbang', title: 'Kapal Terbang', titleEn: 'Airplane' })

    const mistake = useStore.getState().mistakes.find(m => m.word === 'reference number')
    expect(mistake).toBeTruthy()
    expect(mistake.language).toBe('ms')

    const card = useStore.getState().cards.find(c => c.t === 'Mistakes' && c.m === 'reference number')
    expect(card).toBeTruthy()
    expect(card.lang).toBe('ms')
  })
})
