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
// The missed phrase is a parameter because, since V5 (2026-08-03), a phrase with
// no known gloss is journaled WITHOUT minting a card — so the card half of the
// language contract has to be probed with a phrase the dictionary can gloss.
// 'tiket'→'ticket' and 'ticket'→'tiket' are the two directions of one entry.
async function mount(scenario, phrase) {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoleplayScorecard, {
          scenario,
          messages: [],
          scoreData: { overallBand: 3, keyPhraseMissed: [phrase] },
        })
      )
    )
  )
}

const EN_SCENARIO = { id: 'lost-luggage', lang: 'en', title: 'Lost Luggage', titleEn: 'Lost Luggage' }
const MS_SCENARIO = { id: 'kapal-terbang', title: 'Kapal Terbang', titleEn: 'Airplane' }

describe('RoleplayScorecard — mistake language follows the roleplay language', () => {
  it('tags an English roleplay miss as English and promotes a lang:en card', async () => {
    await mount(EN_SCENARIO, 'ticket')

    const mistake = useStore.getState().mistakes.find(m => m.word === 'ticket')
    expect(mistake).toBeTruthy()
    expect(mistake.language).toBe('en')

    // Fork F auto-promotes the EN vocab miss → it must land in the English deck.
    const card = useStore.getState().cards.find(c => c.t === 'Mistakes' && c.m === 'ticket')
    expect(card).toBeTruthy()
    expect(card.lang).toBe('en')
    expect(cardsForLang(useStore.getState().cards, 'en').some(c => c.m === 'ticket')).toBe(true)
    expect(cardsForLang(useStore.getState().cards, 'ms').some(c => c.m === 'ticket')).toBe(false)
  })

  it('keeps a Malay roleplay miss Malay (byte-identical, scenario.lang undefined)', async () => {
    await mount(MS_SCENARIO, 'tiket')

    const mistake = useStore.getState().mistakes.find(m => m.word === 'tiket')
    expect(mistake).toBeTruthy()
    expect(mistake.language).toBe('ms')

    const card = useStore.getState().cards.find(c => c.t === 'Mistakes' && c.m === 'tiket')
    expect(card).toBeTruthy()
    expect(card.lang).toBe('ms')
  })

  // The language contract holds even when no card is minted: the journal entry
  // is what the Mistakes page and the fix-up queue read.
  it('still tags the language when the phrase has no gloss to promote', async () => {
    await mount(EN_SCENARIO, 'reference number')

    const mistake = useStore.getState().mistakes.find(m => m.word === 'reference number')
    expect(mistake).toBeTruthy()
    expect(mistake.language).toBe('en')
    expect(useStore.getState().cards.find(c => c.m === 'reference number')).toBeFalsy()
  })
})
