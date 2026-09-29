// @vitest-environment jsdom
//
// 2026-09-28 bug hunt, GOAL #34 (the item-30 fix swept): one word read
// "1 words found", "Add 1 cards to …" and "Undo — remove 1 cards".
import { it, expect, vi, beforeEach, afterEach } from 'vitest'

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
globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../lib/translate.js', async (orig) => ({
  ...(await orig()),
  translateWord: (text) => Promise.resolve({ text: `gloss of ${text}`, source: 'gtx', provider: 'gtx' }),
}))
vi.mock('../../lib/pdf.js', () => ({ extractPdfText: async () => ({ pages: [] }) }))

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: Import } = await import('../Import.jsx')

let root, host
beforeEach(() => { useStore.setState({ cards: [], studyLang: 'ms' }) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

const text = () => host.textContent
const button = (re) => [...host.querySelectorAll('button')].find(b => re.test(b.textContent.trim()))

async function importWords(words) {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(Import))) })
  const ta = host.querySelector('textarea[data-guide="import-text"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  await act(async () => { setter.call(ta, words.join(' ')); ta.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { host.querySelector('[data-guide="import-process"]').click() })
  for (const w of words) await act(async () => { button(new RegExp(`^${w}$`)).click() })
  await act(async () => {})
}

it.each([
  [['qzxsatu'], '1 word found', 'Add 1 card to', 'Undo — remove 1 card'],
  [['qzxsatu', 'qzxdua'], '2 words found', 'Add 2 cards to', 'Undo — remove 2 cards'],
])('%j → "%s" · "%s" · "%s"', async (words, found, add, undo) => {
  await importWords(words)
  expect(text()).toContain(found)
  const addBtn = button(/^Add \d+ cards? to/)
  expect(addBtn.textContent.trim()).toMatch(new RegExp(`^${add} "`))
  await act(async () => { addBtn.click() })
  expect(useStore.getState().cards).toHaveLength(words.length)
  expect(button(/^Undo/).textContent.trim()).toBe(undo)
})
