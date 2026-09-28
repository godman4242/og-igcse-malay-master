// @vitest-environment jsdom
//
// 2026-09-28 bug hunt, GOAL #18: Settings painted EVERY toast on the green
// "success" fill — "No cards to share", "Not a valid backup file", a refused
// shared-deck file — so a refused action read as done. Refusals take the error
// fill (--color-red + --color-on-bright, ≥7:1 in both themes); successes stay green.
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

const mount = async (cards) => {
  useStore.setState({ cards })
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Settings))))
}
const click = async (label) => {
  const b = [...host.querySelectorAll('button')].find(x => x.textContent.includes(label))
  await act(async () => { b.click() })
}
const toast = () => host.querySelector('.fixed.top-4')
const card = { id: 'c1', m: 'rumah', e: 'house', lang: 'ms', due: new Date().toISOString(), state: 0 }

// Restore reads a file via a detached <input type=file>; hand it `text` on click.
const pickFile = (text) => vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function () {
  Object.defineProperty(this, 'files', { value: [new File([text], 'x.json', { type: 'application/json' })] })
  this.onchange({ target: this })
})
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 20)) })

it('"No cards to share" is shown on the error fill, not the success green', async () => {
  await mount([])
  await click('Share My Deck')
  expect(toast().textContent).toBe('No cards to share')
  expect(toast().style.background).toBe('var(--color-red)')
  expect(toast().style.color).toBe('var(--color-on-bright)')
})

it('Restore refusals (a shared-deck file, garbage) are on the error fill', async () => {
  await mount([card])
  pickFile(JSON.stringify({ format: 'igcse-malay-deck', v: 1, cards: [{ m: 'a', e: 'b' }] }))
  await click('Restore from Backup'); await settle()
  expect(toast().textContent).toMatch(/shared deck/)
  expect(toast().style.background).toBe('var(--color-red)')
  await act(async () => root.unmount()); host.remove()

  await mount([card])
  vi.restoreAllMocks(); pickFile('{not json')
  await click('Restore from Backup'); await settle()
  expect(toast().textContent).toBe('Invalid file!')
  expect(toast().style.background).toBe('var(--color-red)')
})

it('a success toast stays green', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } })
  await mount([card])
  await click('Share My Deck'); await settle()
  expect(toast().textContent).toMatch(/copied|link/i)
  expect(toast().style.background).toBe('var(--color-green)')
})
