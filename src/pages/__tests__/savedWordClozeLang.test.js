// @vitest-environment jsdom
//
// 2026-09-28 bug hunt R2 F6: "Practise saved words" took EVERY 'Saved' card
// (both languages) and hard-coded Malay copy. An English-mode learner who saved
// "reluctant" (gloss "enggan") was told "Produce the Malay word · English:
// enggan", typed "enggan" as instructed, and was marked wrong ("Answer:
// reluctant") — and Malay saves were mixed into the English session, breaking
// the "decks never mix" invariant.
import { describe, it, expect, afterEach } from 'vitest'

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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: SavedWordCloze } = await import('../SavedWordCloze')
const { default: useStore } = await import('../../store/useStore')
const { MemoryRouter } = await import('react-router-dom')

const saved = (m, e, lang) => ({ m, e, lang, t: 'Saved', ex: '', due: new Date(0).toISOString(), state: 0 })

describe('SavedWordCloze follows the study language', () => {
  let root, container
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  const mount = async (studyLang) => {
    useStore.setState({ studyLang, cards: [saved('reluctant', 'enggan', 'en'), saved('kucing', 'cat', 'ms')] })
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(
      React.createElement(MemoryRouter, null, React.createElement(SavedWordCloze)),
    ))
  }

  it('English mode: only English saves, English-target copy with the Malay clue', async () => {
    await mount('en')
    const text = container.textContent
    expect(text).toContain('1 / 1')
    expect(text).toContain('Produce the English word')
    expect(text).toContain('Malay: enggan')
    expect(text).not.toContain('cat')
    expect(container.querySelector('input').placeholder).toBe('Type the English word…')
  })

  it('Malay mode is unchanged: only Malay saves, Malay-target copy with the English clue', async () => {
    await mount('ms')
    const text = container.textContent
    expect(text).toContain('1 / 1')
    expect(text).toContain('Produce the Malay word')
    expect(text).toContain('English: cat')
    expect(container.querySelector('input').placeholder).toBe('Type the Malay word…')
  })
})
