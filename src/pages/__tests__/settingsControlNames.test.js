// @vitest-environment jsdom
//
// axe sweep 2026-09-29 (GOAL #48): four Settings checkboxes and the exam-date
// picker had no accessible name — a screen reader said only "checkbox, checked"
// (axe `label`, critical, both themes). Each control must be named by its visible text.
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
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: Settings } = await import('../Settings.jsx')

let root, host
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

// The name sources an <input> can have (ARIA name computation, the cases this page uses).
const nameOf = (el) => {
  const by = el.getAttribute('aria-labelledby')
  if (by) return by.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim()
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim()
  const lab = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`))
  return lab ? lab.textContent.trim() : ''
}

it('every checkbox and the exam date on Settings is named by its visible text', async () => {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Settings))))
  const names = [...host.querySelectorAll('input[type="checkbox"], input[type="date"]')].map(nameOf)
  expect(names).toEqual([
    'Show comparison link',
    expect.stringMatching(/^Starting out\? Auto-show \w+ on hard pages$/),
    'Cache translations to cloud',
    'Auto-detect writing format',
    'IGCSE Exam Date',
  ])
})
