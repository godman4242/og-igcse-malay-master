// @vitest-environment jsdom
//
// 2026-09-28 bug hunt R4 #8: "Translate page" → Cancel → "Translate page" again.
// translateBatch isn't signal-aware, so run #1's in-flight batch lands late — and its
// tail used to reset the shared state unconditionally: run #2's progress bar vanished
// and its abort ref was nulled, so run #2's Cancel did nothing.
import { it, expect, beforeEach, vi } from 'vitest'

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

// Each translateBatch call is held until the test releases it (a slow network).
let batches
vi.mock('../../lib/translate', async (orig) => ({
  ...(await orig()),
  getFromCache: () => null,
  translateBatch: vi.fn((words) => new Promise((res) => {
    batches.push({ words, go: () => res(words.map((w) => ({ text: `EN-${w}`, source: 'test' }))) })
  })),
}))
// Item 17: forces the dense-page "help me" offer onto the sample document.
let dense = false
vi.mock('../../lib/unknownDensity', async (orig) => ({ ...(await orig()), isDense: () => dense }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')

let root, host
const $ = (sel) => host.querySelector(sel)
const click = (el) => act(async () => { el.click() })
const translateBtn = () => $('[data-guide="pdf-translate"]')
const cancelBtn = () => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cancel')
const progressText = () => [...host.querySelectorAll('span.tabular-nums')].map((s) => s.textContent).find((t) => /^\d+\/\d+$/.test(t))

beforeEach(async () => {
  batches = []
  dense = false
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader)))
  })
  await click($('[data-guide="pdf-sample"]'))
  await vi.waitFor(() => expect(translateBtn()).toBeTruthy())
})

it("a cancelled run's late finish leaves the re-run's progress and Cancel working", async () => {
  await click(translateBtn())
  expect(batches).toHaveLength(1)
  await click(cancelBtn())
  expect(translateBtn().textContent).toMatch(/Translate page/)

  await click(translateBtn()) // run #2
  expect(batches).toHaveLength(2)
  const run2Progress = progressText()
  expect(run2Progress).toMatch(/^0\//)

  await act(async () => { batches[0].go() }) // run #1 lands late
  expect(translateBtn().textContent).toMatch(/Translating…/)
  expect(progressText()).toBe(run2Progress) // not run #1's stale count
  expect(cancelBtn()).toBeTruthy()

  // run #2's Cancel still works: its batch landing afterwards reports nothing.
  await click(cancelBtn())
  expect(translateBtn().textContent).toMatch(/Translate page/)
  await act(async () => { batches[1].go() })
  expect(cancelBtn()).toBeFalsy()
  expect(progressText()).toBeUndefined()

  await act(async () => { root.unmount() }); host.remove()
})

it("a run that lands after the learner opened another document adds nothing to it", async () => {
  const showAll = () => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Show all')
  await click(translateBtn())
  await click([...host.querySelectorAll('button')].find((b) => b.textContent.includes('Clear PDF')))
  await click($('[data-guide="pdf-sample"]')) // doc B — same words, never translated
  await vi.waitFor(() => expect(translateBtn()).toBeTruthy())
  await act(async () => { batches[0].go() }) // doc A's run lands late
  expect(showAll()).toBeFalsy()
  await act(async () => { root.unmount() }); host.remove()
})

it("accepting the dense-page offer mid-run starts no second run", async () => {
  await act(async () => { root.unmount() }); host.remove()
  dense = true
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader)))
  })
  await click($('[data-guide="pdf-sample"]'))
  await vi.waitFor(() => expect($('[data-testid="dense-nudge-accept"]')).toBeTruthy())

  await click(translateBtn())
  expect(batches).toHaveLength(1)
  await click($('[data-testid="dense-nudge-accept"]'))
  expect(batches).toHaveLength(1) // run #1 carries on; no un-cancellable twin
  expect($('[data-testid="dense-page-nudge"]')).toBeFalsy()

  await click(cancelBtn()) // the one Cancel stops the one run
  await act(async () => { batches[0].go() })
  await act(async () => {})
  expect(batches).toHaveLength(1)
  await act(async () => { root.unmount() }); host.remove()
})
