// @vitest-environment jsdom
//
// axe sweep 2026-09-29 (GOAL #49): Cikgu's icon-only Send button had no
// accessible name — a screen reader said only "button" (axe `button-name`,
// critical, both themes). Every button on the page, in both modes, needs a name.
import { it, expect, afterEach } from 'vitest'

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
Element.prototype.scrollIntoView = () => {}

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: CikguBot } = await import('../CikguBot.jsx')

let root, host
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

const nameOf = (b) => (b.getAttribute('aria-label') || b.textContent || b.getAttribute('title') || '').trim()
const unnamed = () => [...host.querySelectorAll('button')].filter(b => !nameOf(b)).map(b => b.outerHTML.slice(0, 120))

it('every button on /cikgu has an accessible name, in Expert and AI mode; Send is named "Send"', async () => {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))))
  expect(unnamed()).toEqual([])
  expect([...host.querySelectorAll('button')].some(b => nameOf(b) === 'Send')).toBe(true)
  const aiBtn = [...host.querySelectorAll('button')].find(b => /^AI/.test(b.textContent.trim()))
  await act(async () => aiBtn.click())
  expect(unnamed()).toEqual([])
})
