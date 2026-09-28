// @vitest-environment jsdom
//
// GOAL #13 — the "brain turned off" rule (Kheshav 2026-09-28: "I skim, I don't read").
// The reader's footer was a ≈60-word "Tips:" paragraph under the passage; what it taught
// now lives in the page tour (one idea per step). The footer keeps its buttons only.
import { it, expect, vi } from 'vitest'

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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')
const { PAGE_GUIDES } = await import('../../lib/guide/pageGuides.js')

const words = (text) => text.split(/\s+/).filter((t) => /[\p{L}0-9]/u.test(t)).length

it('the footer under the passage is buttons, not a paragraph of tips', async () => {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader)))
  })
  await act(async () => { host.querySelector('[data-guide="pdf-sample"]').click() })
  const clear = await vi.waitFor(() => {
    const b = [...host.querySelectorAll('button')].find((el) => el.textContent.includes('Clear PDF'))
    expect(b).toBeTruthy()
    return b
  })
  const footer = clear.parentElement.cloneNode(true)
  footer.querySelectorAll('button').forEach((b) => b.remove())
  expect(words(footer.textContent), footer.textContent).toBeLessThanOrEqual(14)

  // The Group toggle it used to explain is lit by its own tour step instead.
  await act(async () => { host.querySelector('[data-guide="pdf-mode"] button:last-child').click() })
  expect(host.querySelector('[data-guide="pdf-group"]')).toBeTruthy()
  expect(PAGE_GUIDES['/pdf-reader'].map((s) => s.selector)).toContain('[data-guide="pdf-group"]')

  await act(async () => { root.unmount() }); host.remove()
})
