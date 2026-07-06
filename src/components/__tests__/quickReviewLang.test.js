// @vitest-environment jsdom
//
// QuickReview (the Dashboard "Quick Review" widget) must follow the global
// studyLang (v34): an English learner sees ONLY their English deck's due cards,
// a Malay learner ONLY the Malay deck — never the other language.
//
// Pre-fix QuickReview.jsx read the FULL deck (s.cards) and called
// getDueCards(cards) with NO cardsForLang scoping — so the widget surfaced due
// cards of BOTH languages regardless of studyLang (axis-1 "confident-wrong
// content shown": an English-mode user got Malay words on the Dashboard).
//
// MOUNTS the real component (the bug lives in the component's wiring). The store
// persists to localStorage, so the in-memory shim is installed BEFORE the store
// module loads (mirrors mixedSessionLang.test.js). speech is mocked so the
// speak-button import never touches a jsdom-absent speechSynthesis.
//
// Determinism: getDueCards is order-preserving (cards.filter(isDue)) and
// QuickReview shows due[0].m unflipped. Each test puts the OTHER language's card
// FIRST, so without scoping due[0] would be the wrong-language card — the leak.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../lib/speech', () => ({
  speak: () => {},
  hasSpeechSynthesis: () => true,
}))

let React, act, createRoot, MemoryRouter, QuickReview, useStore
let root, host

// A due Review card. Past `due` + Review state → getDueCards keeps it.
const card = (m, e, lang, daysAgo = 1) => ({
  m, e, lang, t: 'Topic',
  ex: `${m} appears in this example sentence`,
  due: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  stability: 50, difficulty: 5, state: 2, reps: 3, lapses: 0,
})

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
  ;({ default: QuickReview } = await import('../QuickReview'))
  ;({ default: useStore } = await import('../../store/useStore'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = () => act(async () => {
  root.render(
    React.createElement(MemoryRouter, null,
      React.createElement(QuickReview, null)),
  )
})

describe('QuickReview follows studyLang', () => {
  it('with studyLang="en" surfaces only the English deck (never the Malay card)', async () => {
    useStore.setState({
      studyLang: 'en',
      // Malay card FIRST → without scoping it would be due[0] (the leak).
      cards: [card('rumah', 'house', 'ms', 2), card('airplane', 'kapal terbang', 'en', 1)],
    })
    await mount()
    expect(host.textContent).toContain('airplane')
    expect(host.textContent).not.toContain('rumah')
  })

  it('with studyLang="ms" surfaces only the Malay deck (never the English card)', async () => {
    useStore.setState({
      studyLang: 'ms',
      // English card FIRST → without scoping it would be due[0] (the leak).
      cards: [card('airplane', 'kapal terbang', 'en', 2), card('rumah', 'house', 'ms', 1)],
    })
    await mount()
    expect(host.textContent).toContain('rumah')
    expect(host.textContent).not.toContain('airplane')
  })

  it('with studyLang="ms" and only English cards due, renders nothing', async () => {
    useStore.setState({
      studyLang: 'ms',
      cards: [card('airplane', 'kapal terbang', 'en', 1)],
    })
    await mount()
    // No Malay card is due → the widget must be absent, not show the English one.
    expect(host.textContent).not.toContain('Quick Review')
    expect(host.textContent).not.toContain('airplane')
  })
})
