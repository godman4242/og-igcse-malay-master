// @vitest-environment jsdom
//
// 2026-09-28 bug hunt, GOAL #30: one card read "Export CSV (1 cards)" /
// "Export JSON (1 cards)", and the Anki toast "Exported 1 cards for Anki!".
import { it, expect, afterEach, vi } from 'vitest'

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
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: Settings } = await import('../Settings.jsx')

let root, host
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks() })

const mount = async (n) => {
  useStore.setState({ cards: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, m: `kata${i}`, e: `word${i}`, lang: 'ms', due: new Date().toISOString(), state: 0 })) })
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Settings))))
}
const labels = () => [...host.querySelectorAll('button')].map(b => b.textContent).filter(t => /^Export (CSV|JSON)/.test(t))

it.each([[0, 'cards'], [1, 'card'], [2, 'cards']])('%i card(s) → "%s" on both export buttons', async (n, noun) => {
  await mount(n)
  expect(labels()).toEqual([`Export CSV (${n} ${noun})`, `Export JSON (${n} ${noun})`])
})

it('one card exported to Anki says "1 card"', async () => {
  URL.createObjectURL ??= () => 'blob:x'; URL.revokeObjectURL ??= () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await mount(1)
  const b = [...host.querySelectorAll('button')].find(x => x.textContent.includes('Export to Anki'))
  await act(async () => { b.click() })
  expect(host.querySelector('.fixed.top-4').textContent).toBe('Exported 1 card for Anki!')
})
