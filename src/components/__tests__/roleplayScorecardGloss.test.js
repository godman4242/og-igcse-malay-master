// @vitest-environment jsdom
//
// END-RESULT regression guard for V5 (2026-08-03): the roleplay scorecard logged
// its missed key phrases with `correct: phrase` — the SAME string as `word`.
// promoteMistakeToCard maps m = word, e = correct, so simply MOUNTING the
// scorecard silently minted FSRS cards whose front and back were identical
// ({m:'pencuci mulut', e:'pencuci mulut'}) with no user action: useless in
// Flashcard mode and unanswerable in Produce mode, where the gloss IS the answer.
//
// The contract now: `correct` carries the real L1 gloss, and a phrase with no
// known gloss is journaled WITHOUT minting a card. Mounts the real component
// (same harness as roleplayScorecardMistakeLang.test.js) because the bug is in
// the component, not the store gate.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, MemoryRouter, RoleplayScorecard, useStore
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

  useStore.setState(s => ({ cards: [], mistakes: [], sync: { ...s.sync, queue: [] } }))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function mount(scenario, keyPhraseMissed, messages = []) {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoleplayScorecard, {
          scenario,
          messages,
          scoreData: { overallBand: 3, keyPhraseMissed },
        })
      )
    )
  )
}

const MS = { id: 'kapal-terbang', title: 'Kapal Terbang', titleEn: 'Airplane' }
const EN = { id: 'lost-luggage', lang: 'en', title: 'Lost Luggage', titleEn: 'Lost Luggage' }

describe('RoleplayScorecard — a promoted card never glosses a word with itself', () => {
  it('mints a Malay card with the real English gloss, not the phrase again', async () => {
    await mount(MS, ['tiket'])                       // dictionary: tiket → ticket
    const card = useStore.getState().cards.find(c => c.m === 'tiket')
    expect(card).toBeTruthy()
    expect(card.e).toBe('ticket')
    expect(card.e).not.toBe(card.m)
  })

  it('mints an English card glossed back into Malay', async () => {
    await mount(EN, ['ticket'])                      // reverse: ticket → tiket
    const card = useStore.getState().cards.find(c => c.m === 'ticket')
    expect(card).toBeTruthy()
    expect(card.e).toBe('tiket')
    expect(card.lang).toBe('en')
    expect(card.e).not.toBe(card.m)
  })

  it('journals a phrase with no known gloss WITHOUT minting a card', async () => {
    await mount(MS, ['pencuci mulut'])               // not in the dictionary
    const mistake = useStore.getState().mistakes.find(m => m.word === 'pencuci mulut')
    expect(mistake, 'the miss is still journaled').toBeTruthy()
    expect(useStore.getState().cards.find(c => c.m === 'pencuci mulut')).toBeFalsy()
  })

  it('never mints a self-gloss card from a mixed batch', async () => {
    await mount(MS, ['tiket', 'pencuci mulut', 'harga'])
    const cards = useStore.getState().cards
    expect(cards.filter(c => c.e === c.m)).toHaveLength(0)
    expect(cards.map(c => c.m).sort()).toEqual(['harga', 'tiket'])
  })

  // A plain-object lookup inherits Object.prototype, so a phrase spelled
  // "constructor" / "toString" / "valueOf" resolves to a FUNCTION — truthy, so it
  // sails through as the gloss and the store's `(mistake.correct || '').trim()`
  // throws, taking the whole scorecard down. keyPhraseMissed is free-form AI
  // output, so these strings are reachable. Same CWE the edge function's
  // SYSTEM_PROMPTS Map already guards against.
  it('does not resolve inherited Object properties as glosses', async () => {
    await mount(MS, ['constructor', 'toString', 'valueOf'])
    const cards = useStore.getState().cards
    expect(cards).toHaveLength(0)
    for (const m of useStore.getState().mistakes) {
      expect(typeof m.correct, `${m.word} gloss stays a string`).toBe('string')
    }
  })

  // Same defect on the per-turn `missingPhrase` path (second addMistake site).
  it('applies the same rule to a per-turn missingPhrase', async () => {
    await mount(MS, [], [
      { role: 'examiner', text: 'Berapa harganya?', feedback: { missingPhrase: 'harga' } },
      { role: 'student', text: 'Lima ringgit.' },
    ])
    const card = useStore.getState().cards.find(c => c.m === 'harga')
    expect(card).toBeTruthy()
    expect(card.e).toBe('price')
    expect(card.e).not.toBe(card.m)
  })
})
