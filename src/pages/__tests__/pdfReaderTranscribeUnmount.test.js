// @vitest-environment jsdom
//
// GOAL #23: Stop → leave the reader while the transcriber's lazy chunks are still
// downloading (seconds on a slow phone's first use). `runAudioTranscribe` resumed
// after its imports on the DEAD page — creating an object URL and a Whisper engine
// that the (already-run) unmount cleanup could never free.
import { it, expect, beforeEach, vi } from 'vitest'

// The engine chunk is held until the test releases it (a slow first download).
let releaseEngine
const engineGate = new Promise((r) => { releaseEngine = r })
const created = []
const terminated = []
let holdEngine = null // when set, createTranscriber waits on it (a slow model load)
vi.mock('../../lib/transcribeEngine', async () => {
  await engineGate
  return {
    createTranscriber: async () => {
      created.push(1)
      if (holdEngine) await holdEngine
      return { transcribe: async () => ({ text: '', segments: [] }), terminate() { terminated.push(1) } }
    },
  }
})

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

const urls = new Set() // object URLs still alive
URL.createObjectURL = () => { const u = `blob:${urls.size + Math.random()}`; urls.add(u); return u }
URL.revokeObjectURL = (u) => { urls.delete(u) }

const track = () => ({ stop() {} })
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  configurable: true,
  value: { getUserMedia: async () => { const t = track(); return { getTracks: () => [t] } } },
})
class FakeRecorder {
  constructor() { this.mimeType = 'audio/webm'; this.state = 'inactive' }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['take']) }); this.onstop?.() }
}
globalThis.MediaRecorder = FakeRecorder
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')

let root, host
async function mount() {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader)))
  })
}
const recBtn = () => host.querySelector('[data-testid="asr-record"]')
const settle = () => act(async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)) })
async function recordThenStop() {
  await act(async () => { recBtn().click() })
  await settle()
  expect(recBtn().textContent).toMatch(/Stop recording/)
  await act(async () => { recBtn().click() }) // Stop → onstop → runAudioTranscribe
}

beforeEach(() => { created.length = 0; terminated.length = 0; urls.clear(); holdEngine = null })

it('leaving the reader while the engine chunk downloads never starts Whisper or leaks a URL', async () => {
  await mount()
  await recordThenStop()
  await settle() // runAudioTranscribe is now parked on the engine import
  await act(async () => { root.unmount() }); host.remove()
  releaseEngine()
  await settle()
  expect(created).toHaveLength(0)
  expect(urls.size).toBe(0)
})

it('leaving while the model loads frees the engine once it lands', async () => {
  releaseEngine()
  let land
  holdEngine = new Promise((r) => { land = r })
  await mount()
  await recordThenStop()
  await vi.waitFor(() => expect(created).toHaveLength(1), { timeout: 5000 })
  await act(async () => { root.unmount() }); host.remove()
  land()
  await settle()
  expect(terminated).toHaveLength(1)
  expect(urls.size).toBe(0)
})
