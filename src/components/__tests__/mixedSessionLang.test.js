// @vitest-environment jsdom
//
// MixedSession (the Dashboard "Mix" quick-action) must follow the global studyLang
// (v34): an English learner's mixed session shows ONLY their English deck and names
// the right language in its variant prompt — never the Malay deck or a Malay
// "Type the Malay word..." placeholder.
//
// Pre-fix MixedSession.jsx read the FULL deck (s.cards) and built the session with
// no cardsForLang scoping, and the vocab-variant input placeholder/feedback were
// hardcoded Malay — so an English learner got a mixed deck with a Malay prompt.
//
// MOUNTS the real component (the bug lives in the component's wiring, not the pure
// builder). The store persists to localStorage, so the in-memory shim is installed
// BEFORE the store module loads (mirrors forYouLang.test.js). speech is mocked so
// the 'audio' variant's Play button never touches a jsdom-absent speechSynthesis.
//
// Determinism: each card gets a distinct `due` (daysAgo) so sortByPriority puts a
// known card first. The placeholder is read off the input ATTRIBUTE (not
// textContent); cross-language leakage is checked via the OTHER card's gloss (a
// cloze variant blanks the word `m`, but never the gloss `e`).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../lib/speech', () => ({
  speak: () => {},
  hasSpeechSynthesis: () => true,
}))

let React, act, createRoot, MemoryRouter, MixedSession, useStore
let root, host

// A due Review card with high stability → a non-standard variant (reverse/cloze/
// audio), all of which render the shared variant input + its language-flipped
// placeholder. Long `ex` so a 'cloze' pick doesn't fall back to reverse.
const card = (m, e, lang, daysAgo = 1) => ({
  m, e, lang, t: 'Topic',
  ex: `${m} appears in this long enough example sentence here`,
  due: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  stability: 50, difficulty: 5, state: 2, reps: 3, lapses: 0,
})

const placeholderOf = () =>
  host.querySelector('input[type="text"]')?.getAttribute('placeholder') ?? ''

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
  ;({ default: MixedSession } = await import('../MixedSession'))
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
      React.createElement(MixedSession, { onClose: () => {} })),
  )
})

describe('MixedSession follows studyLang', () => {
  it('with studyLang="en" shows only the English deck and the English variant placeholder', async () => {
    useStore.setState({
      studyLang: 'en',
      grammarCards: {},
      // Malay card is the MOST overdue → without scoping it would be session[0].
      cards: [card('rumah', 'house', 'ms', 2), card('airplane', 'kapal terbang', 'en', 1)],
    })
    await mount()
    expect(placeholderOf()).toBe('Type the English word...')
    // The Malay card (gloss "house") must not leak into an English session.
    expect(host.textContent).not.toContain('house')
  })

  it('with studyLang="ms" shows only the Malay deck and the Malay variant placeholder', async () => {
    useStore.setState({
      studyLang: 'ms',
      grammarCards: {},
      // English card is the MOST overdue → without scoping it would be session[0].
      cards: [card('airplane', 'kapal terbang', 'en', 2), card('rumah', 'house', 'ms', 1)],
    })
    await mount()
    expect(placeholderOf()).toBe('Type the Malay word...')
    // The English card (gloss "kapal terbang") must not leak into a Malay session.
    expect(host.textContent).not.toContain('kapal terbang')
  })
})
