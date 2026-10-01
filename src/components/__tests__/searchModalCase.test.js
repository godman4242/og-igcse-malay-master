// @vitest-environment jsdom
//
// GOAL #65 (2026-10-01): the 🔍 search lowercased the query but compared it to
// the headword AS WRITTEN (`m.includes(q)`), so a headword with a capital
// ("kemeja-T", "baju Melayu") could never be found by its own spelling — only
// by a lowercase fragment or its English gloss. Same harness as
// searchModalCardLang.test.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, SearchModal, useStore, DICTIONARY, createNewCardState
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
  ;({ default: SearchModal } = await import('../SearchModal'))
  ;({ default: useStore } = await import('../../store/useStore'))
  ;({ default: DICTIONARY } = await import('../../data/dictionary'))
  ;({ createNewCardState } = await import('../../lib/fsrs'))

  useStore.setState({ cards: [], studyLang: 'ms' })

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = () => act(async () => root.render(React.createElement(SearchModal, { open: true, onClose: () => {} })))

const typeInto = (input, text) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
})

async function search(term) {
  await render()
  await typeInto(host.querySelector('input[type="text"]'), term)
}

const hearButtons = (word) => [...host.querySelectorAll('button')].filter(b => b.getAttribute('aria-label') === `Hear ${word}`)

describe('SearchModal — a headword is findable by its own spelling, any case', () => {
  for (const term of ['kemeja-T', 'KEMEJA-T', 'kemeja-t']) {
    it(`"${term}" lists kemeja-T`, async () => {
      await search(term)
      expect(host.querySelector('[aria-label="Add kemeja-T to deck"]')).toBeTruthy()
    })
  }

  it('every capitalised dictionary headword is found by its own spelling', async () => {
    const capitalised = Object.keys(DICTIONARY).filter(k => k !== k.toLowerCase())
    expect(capitalised.length, 'the loop must actually cover something').toBeGreaterThan(0)
    for (const word of capitalised) {
      for (const term of [word, word.toLowerCase(), word.toUpperCase()]) {
        await search(term)
        expect(host.querySelector(`[aria-label="Add ${word} to deck"]`), `"${term}" → ${word}`).toBeTruthy()
      }
    }
  })

  it('a deck card that IS the dictionary word shows once, as the "In deck" dictionary row', async () => {
    useStore.setState({
      cards: [{ m: 'kemeja-T', e: 'T-shirt', t: 'Search', p: 'n', ex: '', mn: '', lang: 'ms', ...createNewCardState() }],
    })
    await search('kemeja-t')
    expect(hearButtons('kemeja-T')).toHaveLength(1)
    expect(host.textContent).toContain('In deck')
  })

  // A word picked at the start of a sentence in the reader is saved as "Kemeja-T";
  // SelectionToCard treats that as the same card as kemeja-T, so must search.
  it('a deck card differing only in case is the same word: one row, "In deck", no duplicate Add', async () => {
    useStore.setState({
      cards: [{ m: 'Kemeja-T', e: 'T-shirt', t: 'Reader', p: 'n', ex: '', mn: '', lang: 'ms', ...createNewCardState() }],
    })
    await search('kemeja-t')
    expect(hearButtons('kemeja-T').length + hearButtons('Kemeja-T').length).toBe(1)
    expect(host.querySelector('[aria-label="Add kemeja-T to deck"]')).toBeFalsy()
    expect(host.textContent).toContain('In deck')
  })

  // Guard: this branch already lowercased both sides before #65.
  it("the learner's own cards are matched case-insensitively too", async () => {
    useStore.setState({
      cards: [{ m: 'Selamat Hari Raya', e: 'Happy Eid', t: 'Reader', p: 'n', ex: '', mn: '', lang: 'ms', ...createNewCardState() }],
    })
    for (const term of ['Selamat Hari Raya', 'selamat hari raya', 'SELAMAT HARI RAYA', 'HAPPY eid']) {
      await search(term)
      expect(hearButtons('Selamat Hari Raya'), term).toHaveLength(1)
    }
  })
})
