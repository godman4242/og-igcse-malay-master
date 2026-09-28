// @vitest-environment jsdom
//
// GOAL #21 — a damaged / non-PDF file picked on the EMPTY reader showed pdf.js's raw
// "Invalid PDF structure." (library jargon, no next step), and nothing announced it.
// A password-locked PDF is a different cause and must not be called "damaged".
// The error shapes below are what pdfjs-dist 4.10 really throws (probed 2026-09-28).
import { it, expect, beforeEach, vi } from 'vitest'

let loadError
vi.mock('../../lib/pdf', () => ({
  loadPdf: async () => { throw loadError },
  extractTextFromDoc: async () => ({ pages: [] }),
  renderPdfPageToCanvas: async () => {},
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
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: PDFReader } = await import('../PDFReader.jsx')

const pdfError = (name, message) => Object.assign(new Error(message), { name })

beforeEach(() => { mem.clear() })

async function pickFileOnEmptyReader() {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] }, React.createElement(PDFReader)))
  })
  const input = host.querySelector('input[type="file"][accept*="application/pdf"]')
  const file = new File(['not a pdf'], 'notes.pdf', { type: 'application/pdf' })
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  const alert = await vi.waitFor(() => {
    const el = host.querySelector('[role="alert"]')
    expect(el).toBeTruthy()
    return el
  })
  const text = alert.textContent
  await act(async () => { root.unmount() }); host.remove()
  return text
}

it.each([
  ['a damaged / non-PDF file', pdfError('InvalidPDFException', 'Invalid PDF structure.')],
  ['a 0-byte file', pdfError('InvalidPDFException', 'The PDF file is empty, i.e. its size is zero bytes.')],
])('%s on the empty reader → plain English with a next step, announced', async (_label, err) => {
  loadError = err
  const text = await pickFileOnEmptyReader()
  expect(text).toMatch(/couldn.t open that file/i)
  expect(text).toMatch(/try another file/i)
  expect(text).not.toMatch(/Invalid PDF structure|zero bytes|i\.e\./)
})

it('a password-locked PDF says so instead of calling it damaged', async () => {
  loadError = pdfError('PasswordException', 'No password given')
  const text = await pickFileOnEmptyReader()
  expect(text).toMatch(/password/i)
  expect(text).not.toMatch(/damaged|No password given/)
})
