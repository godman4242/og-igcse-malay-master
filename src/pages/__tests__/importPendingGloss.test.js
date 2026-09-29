// @vitest-environment jsdom
//
// 2026-09-28 bug hunt R4 #3 (the PDF reader's B4 fix, never swept into Import):
// tapping an unknown word starts a lookup; "Add N cards" read the in-flight
// placeholder or a failed lookup's echo as the gloss, minting confident-wrong
// cards — "belajar = loading..." on slow data, "belajar = belajar" offline —
// straight into FSRS. A word joins the deck only with a real meaning.
import { it, expect, vi, beforeEach } from 'vitest'

const mem = new Map()
const ls = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)) },
  removeItem: (k) => { mem.delete(k) },
  clear: () => { mem.clear() },
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size },
}
Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let mode = 'pending'
let release = []
vi.mock('../../lib/translate.js', async (orig) => ({
  ...(await orig()),
  translateWord: (text) => (mode === 'offline'
    ? Promise.resolve({ text, source: 'error', provider: null })
    : new Promise(r => release.push(() => r({ text: 'to study', source: 'gtx', provider: 'gtx' })))),
}))
vi.mock('../../lib/pdf.js', () => ({ extractPdfText: async () => ({ pages: [] }) }))

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: Import } = await import('../Import.jsx')

beforeEach(() => { useStore.setState({ cards: [], studyLang: 'ms' }); release = [] })

async function selectUnknown(word) {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(Import))) })
  const ta = host.querySelector('textarea[data-guide="import-text"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  await act(async () => { setter.call(ta, word); ta.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { host.querySelector('[data-guide="import-process"]').click() })
  await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === word).click() })
  const addBtn = () => [...host.querySelectorAll('button')].find(b => /^Add \d+ cards? to/.test(b.textContent.trim()))
  return { host, root, addBtn }
}

it('a word whose lookup is still in flight is not added — and is added once its meaning lands', async () => {
  mode = 'pending'
  const { root, addBtn } = await selectUnknown('qzxbelajar')
  await act(async () => { addBtn().click() })
  expect(useStore.getState().cards).toEqual([])

  await act(async () => { release.forEach(f => f()) })
  await act(async () => { addBtn().click() })
  const card = useStore.getState().cards.find(c => c.m === 'qzxbelajar')
  expect(card?.e).toBe('to study')
  await act(async () => root.unmount())
})

it('a failed (offline) lookup never becomes the gloss', async () => {
  mode = 'offline'
  const { root, addBtn } = await selectUnknown('qzxmembaca')
  await act(async () => { addBtn().click() })
  expect(useStore.getState().cards.find(c => c.m === 'qzxmembaca')).toBeUndefined()
  await act(async () => root.unmount())
})
