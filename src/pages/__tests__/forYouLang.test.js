// @vitest-environment jsdom
//
// "Picked for you" (ForYou) must follow the global studyLang (v34): an English
// learner sees ONLY their English deck, spoken en-GB — never the Malay deck or a
// Malay voice. Pre-fix ForYou.jsx passed the full mixed deck + a hardcoded
// lang:'ms' to buildForYouShelves and spoke 'ms-MY', so an English learner got a
// Malay/mixed page.
//
// MOUNTS the real page (the bug lives in the page's wiring, not the pure builder).
// The store persists to localStorage, so the in-memory shim is installed BEFORE
// the store module loads (mirrors roleplayScorecardMistakeLang.test.js). speech is
// mocked to capture the TTS locale.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { speakMock } = vi.hoisted(() => ({ speakMock: vi.fn() }))
vi.mock('../../lib/speech', () => ({
  speak: (...args) => speakMock(...args),
  hasSpeechSynthesis: () => true,
}))

let React, act, createRoot, MemoryRouter, ForYou, useStore
let root, host

const card = (m, e, lang) => ({
  m, e, lang, t: 'Saved', ex: `${m} — ${e}`,
  due: new Date(Date.now() + 1e9).toISOString(),
  stability: 1, difficulty: 5, state: 2, reps: 1, lapses: 0,
})

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  speakMock.mockClear()
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
  ;({ default: ForYou } = await import('../ForYou'))
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
  root.render(React.createElement(MemoryRouter, null, React.createElement(ForYou)))
})

describe('ForYou follows studyLang', () => {
  it('with studyLang="en" shows only English cards, not Malay ones', async () => {
    useStore.setState({
      studyLang: 'en',
      cards: [card('airplane', 'kapal terbang', 'en'), card('rumah', 'house', 'ms')],
    })
    await mount()
    expect(host.textContent).toContain('airplane')
    expect(host.textContent).not.toContain('rumah')
  })

  it('speaks an English card in the English (en-GB) voice', async () => {
    useStore.setState({
      studyLang: 'en',
      cards: [card('airplane', 'kapal terbang', 'en')],
    })
    await mount()
    const speaker = [...host.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Hear airplane',
    )
    expect(speaker, 'speaker button for the English card').toBeTruthy()
    await act(async () => { speaker.click() })
    expect(speakMock).toHaveBeenCalled()
    expect(speakMock.mock.calls[0][0]).toBe('airplane')
    expect(speakMock.mock.calls[0][1]).toBe('en-GB')
  })

  it('with studyLang="ms" shows only Malay cards spoken ms-MY (byte-identical)', async () => {
    useStore.setState({
      studyLang: 'ms',
      cards: [card('airplane', 'kapal terbang', 'en'), card('rumah', 'house', 'ms')],
    })
    await mount()
    expect(host.textContent).toContain('rumah')
    expect(host.textContent).not.toContain('airplane')
    const speaker = [...host.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Hear rumah',
    )
    await act(async () => { speaker.click() })
    expect(speakMock.mock.calls[0][1]).toBe('ms-MY')
  })
})
