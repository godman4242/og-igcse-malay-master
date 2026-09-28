// @vitest-environment jsdom
//
// 2026-09-28 bug hunt R4 #6: the reader's Record button only checked `recording`,
// which stays false until the mic permission resolves — so a double-tap opened TWO
// mic streams and only the second was ever stopped (mic indicator stuck on
// app-wide). A `new MediaRecorder` throw leaked its stream the same way.
import { it, expect, beforeEach, vi } from 'vitest'

// A recording that reaches the transcriber shows up here (the real engine needs a worker).
const transcribed = []
vi.mock('../../lib/transcribeEngine', () => ({
  createTranscriber: async () => { transcribed.push(1); return { transcribe: async () => '', terminate() {} } },
}))

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

// Fake mic: each getUserMedia call opens a stream whose track records whether it
// was stopped; resolution is held until the test releases it (slow permission).
let streams, pending, recorderThrows
function makeStream() {
  const track = { stopped: false, stop() { this.stopped = true } }
  const s = { track, getTracks: () => [track] }
  streams.push(s)
  return s
}
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () => new Promise((res, rej) => {
      pending.push((deny) => (deny ? rej(Object.assign(new Error('denied'), { name: 'NotAllowedError' })) : res(makeStream())))
    }),
  },
})
class FakeRecorder {
  constructor() { if (recorderThrows) throw new Error('NotSupportedError'); this.mimeType = 'audio/webm'; this.state = 'inactive' }
  start() { this.state = 'recording' }
  stop() {
    if (this.state === 'inactive') throw new Error('InvalidStateError') // as the real one does
    this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['take']) }); this.onstop?.()
  }
}
globalThis.MediaRecorder = FakeRecorder
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')

let root, host
async function mount({ strict = false } = {}) {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  const app = React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader))
  await act(async () => { root.render(strict ? React.createElement(React.StrictMode, null, app) : app) })
}
const recBtn = () => host.querySelector('[data-testid="asr-record"]')
const grantAll = async () => { await act(async () => { pending.splice(0).forEach((go) => go()) }) }
const denyAll = async () => { await act(async () => { pending.splice(0).forEach((go) => go(true)) }) }
const live = () => streams.filter((s) => !s.track.stopped)

beforeEach(() => { streams = []; pending = []; recorderThrows = false; transcribed.length = 0 })
const sampleBtn = () => [...host.querySelectorAll('button')].find((b) => /Try a sample/.test(b.textContent))
const flush = () => act(async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)) })

it('a double-tap on Record opens ONE mic stream, and Stop releases it', async () => {
  await mount()
  await act(async () => { recBtn().click(); recBtn().click() })
  await grantAll()
  expect(streams).toHaveLength(1)
  expect(recBtn().textContent).toMatch(/Stop recording/)
  await act(async () => { recBtn().click() })
  expect(live()).toHaveLength(0)
  // Stop transcribes — wait for it to reach the engine here. Its lazy imports are slow
  // under full-suite load, and a late call used to land in a later test's `transcribed`.
  await vi.waitFor(() => expect(transcribed).toHaveLength(1), { timeout: 5000 })
  await act(async () => { root.unmount() }); host.remove()
})

it('leaving the reader while the mic permission is pending still releases the stream', async () => {
  await mount()
  await act(async () => { recBtn().click() })
  await act(async () => { root.unmount() }); host.remove()
  await grantAll()
  expect(streams).toHaveLength(1)
  expect(live()).toHaveLength(0)
})

it('a MediaRecorder that throws does not leak the stream it was given', async () => {
  recorderThrows = true
  await mount()
  await act(async () => { recBtn().click() })
  await grantAll()
  expect(streams).toHaveLength(1)
  expect(live()).toHaveLength(0)
  expect(recBtn().textContent).toMatch(/Record/)
  // The mic WAS allowed — the browser just can't record; don't blame a permission.
  expect(host.textContent).not.toMatch(/blocked/)
  expect(host.textContent).toMatch(/Recording isn’t supported/)
  await act(async () => { root.unmount() }); host.remove()
})

// R4 #6 related trigger: Stop lives only on the empty state, so loading a document
// mid-take used to hide it with the mic still live. Loading ends the take (and drops
// it — transcribing it would replace the document the learner just chose).
it('loading a sample while recording stops the mic and keeps the sample', async () => {
  await mount()
  await act(async () => { recBtn().click() })
  await grantAll()
  expect(live()).toHaveLength(1)
  await act(async () => { sampleBtn().click() })
  // The sample is a lazy import — wait for it, not a tick count (slow under full-suite load).
  await vi.waitFor(() => expect(recBtn()).toBeNull(), { timeout: 5000 }) // the empty state (and its Stop) is gone…
  expect(live()).toHaveLength(0) // …so the mic must be too
  expect(transcribed).toHaveLength(0)
  await act(async () => { root.unmount() }); host.remove()
})

it('loading a sample while the mic permission is pending never opens the mic', async () => {
  await mount()
  await act(async () => { recBtn().click() })
  await act(async () => { sampleBtn().click() }); await flush()
  await grantAll()
  expect(streams).toHaveLength(1)
  expect(live()).toHaveLength(0)
  await act(async () => { root.unmount() }); host.remove()
})

// main.jsx wraps the app in StrictMode: dev mounts → unmounts → remounts, so the
// "left the reader" flag must reset on remount or dev recordings die at once.
it('under StrictMode a recording still starts and Stop releases it', async () => {
  await mount({ strict: true })
  await act(async () => { recBtn().click() })
  await grantAll()
  expect(live()).toHaveLength(1)
  expect(recBtn().textContent).toMatch(/Stop recording/)
  await act(async () => { recBtn().click() })
  expect(live()).toHaveLength(0)
  await vi.waitFor(() => expect(transcribed).toHaveLength(1), { timeout: 5000 }) // see the first test
  await act(async () => { root.unmount() }); host.remove()
})

it('blocking the mic after walking away to a sample shows no stale "blocked" error', async () => {
  await mount()
  await act(async () => { recBtn().click() })
  await act(async () => { sampleBtn().click() }); await flush()
  await denyAll()
  expect(host.textContent).not.toMatch(/blocked/)
  await act(async () => { root.unmount() }); host.remove()
})
