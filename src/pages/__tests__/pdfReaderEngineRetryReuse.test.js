// @vitest-environment jsdom
//
// GOAL #32: since #28, Cancel works while an engine's FIRST download runs — so a
// learner can Cancel and pick again mid-download. Both engine caches held only
// FINISHED engines, so the retry started a second, parallel download (Whisper is
// ≈76 MB on a phone), and the cancelled run's late engine was then freed — the
// same shared engine the retry was waiting on. The real ocrEngine / transcribeEngine
// run here; only Tesseract and transformers.js are faked.
import { it, expect, beforeEach, vi } from 'vitest'

const ocr = { created: 0, terminated: 0, land: null }
vi.mock('tesseract.js', () => ({
  createWorker: () => new Promise((r) => {
    ocr.created++
    ocr.land = () => r({
      recognize: async () => ({ data: { text: 'Ibu memasak nasi', blocks: [{ paragraphs: [{ lines: [{ words: [
        { text: 'Ibu', confidence: 95 }, { text: 'memasak', confidence: 95 }, { text: 'nasi', confidence: 95 },
      ] }] }] }] } }),
      terminate: async () => { ocr.terminated++ },
    })
  }),
}))

const asr = { created: 0, disposed: 0, land: null }
vi.mock('@huggingface/transformers', () => ({
  env: { backends: { onnx: { wasm: {} } } },
  pipeline: () => new Promise((r) => {
    asr.created++
    const pipe = async () => ({ text: 'Ibu memasak nasi', chunks: [{ text: 'Ibu memasak nasi', timestamp: [0, 1] }] })
    pipe.dispose = async () => { asr.disposed++ }
    asr.land = () => r(pipe)
  }),
}))

// Web Audio for decodeAudioTo16k: one second of a non-silent signal.
window.AudioContext = class { decodeAudioData = async () => ({ duration: 1 }); close = async () => {} }
globalThis.OfflineAudioContext = class {
  createBufferSource() { return { connect() {}, start() {} } }
  startRendering = async () => ({ getChannelData: () => new Float32Array(16000).fill(0.3) })
}

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
URL.createObjectURL = () => 'blob:x'
URL.revokeObjectURL = () => {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')

let root, host
beforeEach(async () => {
  mem.clear()
  host?.remove()
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader)))
  })
})

async function pick(file) {
  const input = host.querySelector('input[type="file"][accept*="application/pdf"]')
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
}
const cancelBtn = () => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cancel')
const settle = () => act(async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)) })

it.each([
  ['OCR (a photo)', () => new File(['img'], 'page.png', { type: 'image/png' }), /Reading your page/, ocr, 'terminated'],
  ['transcription (a recording)', () => new File(['aud'], 'clip.mp3', { type: 'audio/mpeg' }), /speech model/, asr, 'disposed'],
])('%s: pick → Cancel → pick during the first download reuses that download, and the retry completes', async (_, file, screen, eng, freed) => {
  await pick(file())
  await vi.waitFor(() => expect(eng.land).toBeTruthy()) // parked on the first download
  await act(async () => { cancelBtn().click() })
  await settle()
  expect(host.textContent).not.toMatch(screen)

  await pick(file()) // the learner changes their mind while it is still downloading
  await settle()
  expect(host.textContent).toMatch(screen)
  expect(eng.created).toBe(1) // ONE download, not a second in parallel

  await act(async () => { eng.land() })
  await settle()
  expect(eng[freed]).toBe(0) // the cancelled run's late engine did not free the shared one
  expect(host.textContent).toMatch(/memasak/) // the retry read the page
  expect(host.textContent).not.toMatch(screen)
  await act(async () => { root.unmount() })
  expect(eng[freed]).toBe(1) // leaving frees it, once
})

// A second recording reuses the loaded model; each run's handle must be let go, or
// counting handles would keep the ≈76 MB model alive after the learner leaves.
it('two recordings in a row, then leaving → the speech model is freed once', async () => {
  asr.created = asr.disposed = 0; asr.land = null
  await pick(new File(['a'], 'a.mp3', { type: 'audio/mpeg' }))
  await vi.waitFor(() => expect(asr.land).toBeTruthy())
  await act(async () => { asr.land() })
  await settle()
  expect(host.textContent).toMatch(/memasak/)
  await pick(new File(['b'], 'b.mp3', { type: 'audio/mpeg' }))
  await settle()
  expect(asr.created).toBe(1) // the loaded model is reused
  expect(host.textContent).toMatch(/memasak/)
  await act(async () => { root.unmount() })
  expect(asr.disposed).toBe(1)
})
