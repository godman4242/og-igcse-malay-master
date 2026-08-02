// @vitest-environment jsdom
//
// END-RESULT regression guard for V8 (2026-08-03): SearchModal searches the
// MALAY dictionary (DICTIONARY is ms→en), but handleAdd omitted `lang`, and the
// store's addCard falls back to `state.studyLang`. So an English learner who
// searched "house" and tapped + got the Malay word 'halaman rumah' stamped
// lang:'en'. That card is then served by cardsForLang(cards,'en'), read aloud in
// en-GB, and matched by en-GB speech recognition against a Malay utterance.
//
// Second half of the fix: `isInDeck` was lang-agnostic, so once the card is
// correctly Malay it must still be found — and a same-spelled card in the OTHER
// deck must not count, or the row claims "In deck" for a card the learner can
// never reach from that partition. Same harness as searchModalExamples.test.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, SearchModal, useStore, cardsForLang, createNewCardState
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
  ;({ cardsForLang } = await import('../../lib/cardLang'))
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

describe('SearchModal — dictionary words are always Malay cards', () => {
  it('stamps lang:ms even while the learner is studying English', async () => {
    useStore.setState({ studyLang: 'en' })
    await search('rumah')

    const addBtn = host.querySelector('[aria-label="Add rumah to deck"]')
    expect(addBtn).toBeTruthy()
    await act(async () => addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    const cards = useStore.getState().cards
    const card = cards.find((c) => c.m === 'rumah')
    expect(card).toBeTruthy()
    expect(card.lang).toBe('ms')
    expect(cardsForLang(cards, 'ms').some((c) => c.m === 'rumah')).toBe(true)
    expect(cardsForLang(cards, 'en').some((c) => c.m === 'rumah')).toBe(false)
  })

  it('still shows "In deck" for the Malay card it just created', async () => {
    useStore.setState({ studyLang: 'en' })
    await search('rumah')
    await act(async () =>
      host.querySelector('[aria-label="Add rumah to deck"]').dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(host.textContent).toContain('In deck')
    expect(host.querySelector('[aria-label="Add rumah to deck"]')).toBeFalsy()
  })

  // 'main' is a real ms/en homograph (Malay "play"), the collision the store's
  // addCard dedupe comment calls out. An English card spelled the same must not
  // make the Malay row claim "In deck".
  // Correct-but-invisible is still a dead-end: the card lands in the Malay deck
  // while the learner's session is English, so the modal has to say where it went.
  it('tells an English learner these words join the Malay deck', async () => {
    useStore.setState({ studyLang: 'en' })
    await search('rumah')
    expect(host.textContent).toContain('they join your Malay deck')
  })

  it('does not show that note to a Malay learner', async () => {
    useStore.setState({ studyLang: 'ms' })
    await search('rumah')
    expect(host.textContent).not.toContain('they join your Malay deck')
  })

  it('does not count a same-spelled ENGLISH card as the Malay word being in deck', async () => {
    useStore.setState({
      studyLang: 'ms',
      cards: [{ m: 'main', e: 'utama', t: 'Reader', p: 'n', ex: '', mn: '', lang: 'en', ...createNewCardState() }],
    })
    await search('main')

    expect(host.querySelector('[aria-label="Add main to deck"]'), 'the Malay word is still addable').toBeTruthy()
  })
})
