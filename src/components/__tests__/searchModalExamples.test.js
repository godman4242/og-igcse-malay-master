// @vitest-environment jsdom
//
// Wiring proof: when a word added from SearchModal has a curated example in
// dictionaryExamples.js, the created card carries THAT example (not the
// synthetic "malay (english)." placeholder). Red-proofs the getExample() wiring
// in handleAdd. Same jsdom/localStorage harness as searchModalA11y.test.js
// (in-memory Storage shim installed before the persisted store module loads).

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getExample } from '../../data/dictionaryExamples.js'

let React, act, createRoot, SearchModal, useStore
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

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = (el) => act(async () => root.render(el))

const typeInto = (input, text) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
})

describe('SearchModal → curated example on add', () => {
  it('adds the curated example (not the placeholder) for a covered dictionary word', async () => {
    // 'makanan' is in dictionary.js AND has a curated example. Guard the premise.
    const curated = getExample('makanan')
    expect(typeof curated).toBe('string')

    await render(React.createElement(SearchModal, { open: true, onClose: () => {} }))
    const input = host.querySelector('input[type="text"]')
    await typeInto(input, 'makanan')

    const addBtn = host.querySelector('[aria-label="Add makanan to deck"]')
    expect(addBtn).toBeTruthy()
    await act(async () => addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    const card = useStore.getState().cards.find((c) => c.m === 'makanan' && c.t === 'Search')
    expect(card).toBeTruthy()
    expect(card.ex).toBe(curated)
    expect(card.ex).not.toMatch(/^makanan \(/) // not the placeholder
  })
})
