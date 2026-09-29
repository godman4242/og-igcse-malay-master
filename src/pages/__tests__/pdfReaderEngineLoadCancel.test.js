// @vitest-environment jsdom
//
// GOAL #28: on a phone's FIRST photo / recording, the OCR (Tesseract) or speech
// (Whisper) engine downloads for seconds. Cancel did nothing until it landed —
// `runImageOcr` / `runAudioTranscribe` awaited the engine with no ear on the abort
// signal (measured: 18 s on the OCR screen after tapping Cancel). Cancel must leave
// the progress screen at once, and an engine that lands afterwards is freed.
import { it, expect, beforeEach, vi } from 'vitest'

let landOcr, landAsr
const asrLands = [] // every createTranscriber call's release, in order
let transcribed = 0
const progress = {} // each engine's onProgress — the download keeps reporting after Cancel
const terminated = { ocr: 0, asr: 0 }
vi.mock('../../lib/ocrEngine', () => ({
  createOcrRecognizer: ({ onProgress }) => new Promise((r) => {
    progress.ocr = () => onProgress({ status: 'loading', progress: 0.5 })
    landOcr = () => r({ recognize: async () => ({ text: 'ZZLATEREAD', words: [] }), terminate() { terminated.ocr++ } })
  }),
}))
vi.mock('../../lib/transcribeEngine', () => ({
  createTranscriber: ({ onProgress }) => new Promise((r) => {
    progress.asr = () => onProgress({ phase: 'download', ratio: 0.5 })
    landAsr = () => r({ transcribe: async () => { transcribed++; return { text: 'ZZLATEREAD', segments: [] } }, terminate() { terminated.asr++ } })
    asrLands.push(landAsr)
  }),
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
URL.createObjectURL = () => 'blob:x'
URL.revokeObjectURL = () => {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')

let root, host
beforeEach(async () => {
  mem.clear(); terminated.ocr = 0; terminated.asr = 0; landOcr = landAsr = null; asrLands.length = 0; transcribed = 0
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
  ['OCR (a photo)', new File(['img'], 'page.png', { type: 'image/png' }), /Reading your page/, () => landOcr, 'ocr'],
  ['transcription (a recording)', new File(['aud'], 'clip.mp3', { type: 'audio/mpeg' }), /speech model/, () => landAsr, 'asr'],
])('%s: Cancel mid engine-download leaves the screen at once; a late engine is freed', async (_, file, screen, getLand, kind) => {
  await pick(file)
  await vi.waitFor(() => expect(getLand()).toBeTruthy()) // parked on the engine load
  expect(host.textContent).toMatch(screen)

  await act(async () => { cancelBtn().click() })
  await settle()
  expect(host.textContent).not.toMatch(screen) // back to the empty reader, engine still loading
  expect(cancelBtn()).toBeUndefined()
  await act(async () => { progress[kind]() }) // the still-downloading engine reports progress
  expect(host.textContent).not.toMatch(screen) // …which must not bring the screen back

  await act(async () => { getLand()() })
  await settle()
  expect(terminated[kind]).toBe(1) // the late engine is freed, not kept or used
  expect(host.textContent).not.toMatch(/ZZLATEREAD/) // and nothing it could read lands in the reader
  expect(host.querySelector('[role="alert"]')).toBeNull() // a cancel is not an error
  await act(async () => { root.unmount() })
})

// Reviewer find: recording A then B picked back to back. B's start aborts A, and A's
// cleanup then wiped B's Cancel handle — so leaving the page couldn't stop B, and
// Whisper ran on the dead page once B's model landed.
it('a second recording picked mid-load keeps its own Cancel; leaving then stops it', async () => {
  // B is picked while the empty reader is still on screen (A's first chunk download).
  // Staggered so A is already loading its engine — concurrent first imports of a
  // mocked module can hand the second caller the REAL one.
  const input = host.querySelector('input[type="file"][accept*="application/pdf"]')
  const fire = (name) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([name], name, { type: 'audio/mpeg' })] })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  await act(async () => {
    fire('a.mp3')
    await vi.waitFor(() => expect(asrLands).toHaveLength(1))
    fire('b.mp3')
  })
  await vi.waitFor(() => expect(asrLands).toHaveLength(2))
  await settle()
  expect(host.textContent).toMatch(/speech model/) // B's screen is up…
  await act(async () => { root.unmount() }) // …and the learner leaves
  await act(async () => { asrLands.forEach((land) => land()) })
  await settle()
  expect(transcribed).toBe(0) // nothing transcribes on the dead page
  expect(terminated.asr).toBe(2) // both late models are freed
})
