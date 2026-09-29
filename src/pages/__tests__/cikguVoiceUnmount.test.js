// @vitest-environment jsdom
//
// 2026-09-28 bug hunt R4 #5: in voice mode, a question asked just before leaving
// Cikgu Maya's page was still sent, then read aloud over whatever page the
// learner had moved to — and a "say stop" keyword-spotter mic opened with no
// Stop control on screen. After the page closes, the pipeline must go quiet.
import { it, expect, vi } from 'vitest'

const log = []
let resolveRec
vi.mock('../../lib/speech.js', async (orig) => {
  const real = await orig()
  return {
    ...real,
    hasSpeechRecognition: () => true,
    hasSpeechSynthesis: () => true,
    startRecognition: () => new Promise(r => { resolveRec = r }),
    speakWithBoundaries: (o) => { log.push('TTS'); setTimeout(() => o.onStart?.(), 0); return { cancel: () => {} } },
    startKeywordSpotter: () => { log.push('MIC'); return { stop: () => {} } },
  }
})

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
Element.prototype.scrollIntoView = function () {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: CikguBot } = await import('../CikguBot.jsx')

it('a voice question in flight when the page closes is never read aloud', async () => {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))) })
  await act(async () => { host.querySelector('[aria-label="Enable voice conversation"]').click() })
  await act(async () => { host.querySelector('[aria-label^="Talk to Cikgu Maya"]').click() }) // LISTENING
  await act(async () => { root.unmount() }) // the learner navigates away
  await act(async () => { resolveRec([{ transcript: 'apa itu imbuhan', confidence: 0.9 }]) })
  await new Promise(r => setTimeout(r, 50))
  host.remove()
  expect(log).toEqual([])
})

// GOAL #31 reviewer: a reply that is no longer saved (the chat was cleared while
// the AI thought) must not be read aloud with no bubble on screen.
it('clearing the chat mid-answer in voice mode reads nothing aloud', async () => {
  log.length = 0
  let release
  const gate = new Promise(r => { release = r })
  vi.stubGlobal('fetch', vi.fn(() => gate.then(() => { throw new Error('offline') })))
  vi.stubGlobal('confirm', () => true)
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))) })
  await act(async () => { [...host.querySelectorAll('button')].find(b => /^AI/.test(b.textContent.trim())).click() })
  await act(async () => { host.querySelector('[aria-label="Enable voice conversation"]').click() })
  await act(async () => { host.querySelector('[aria-label^="Talk to Cikgu Maya"]').click() })
  await act(async () => { resolveRec([{ transcript: 'apa itu imbuhan', confidence: 0.9 }]) }) // THINKING
  await act(async () => { host.querySelector('[aria-label="Clear conversation"]').click() })
  await act(async () => { release() })
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
  expect(log).toEqual([])
  expect(host.textContent).toMatch(/Tap mic to ask/) // voice back to idle, not stuck "thinking"
  await act(async () => { root.unmount() }); host.remove()
  vi.unstubAllGlobals()
})
