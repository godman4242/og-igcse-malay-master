// @vitest-environment jsdom
//
// GOAL #27 — the Import page's PDF picker showed pdf.js's raw text ("Invalid PDF
// structure.", "The PDF file is empty, i.e. its size is zero bytes.") with no next
// step, unannounced. Same plain English as the reader (GOAL #21, one shared source);
// a password-locked PDF is not "damaged". Error shapes = what pdfjs-dist 4.10 throws.
import { it, expect, vi, beforeEach } from 'vitest'

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

let loadError
let extract = async () => { throw loadError }
vi.mock('../../lib/pdf', () => ({ extractPdfText: (f) => extract(f) }))

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: Import } = await import('../Import.jsx')

const pdfError = (name, message) => Object.assign(new Error(message), { name })

beforeEach(() => { mem.clear(); extract = async () => { throw loadError } })

async function pickPdf() {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(Import))) })
  await act(async () => { [...host.querySelectorAll('button')].find(b => /Upload PDF/.test(b.textContent)).click() })
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
])('%s → plain English with a next step, announced', async (_label, err) => {
  loadError = err
  const text = await pickPdf()
  expect(text).toMatch(/couldn.t open that file/i)
  expect(text).toMatch(/try another file/i)
  expect(text).not.toMatch(/Invalid PDF structure|zero bytes|i\.e\./)
})

it('a password-locked PDF says so instead of calling it damaged', async () => {
  loadError = pdfError('PasswordException', 'No password given')
  const text = await pickPdf()
  expect(text).toMatch(/password/i)
  expect(text).not.toMatch(/damaged|No password given/)
})

// Chaos pass (real pdf.js, preview): five quick picks ending on a garbage file settled on
// the password message — a slower, EARLIER pick landed last and overwrote it. Only the
// latest pick may speak.
it('two quick picks: the earlier, slower file never overwrites the latest one\'s result', async () => {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(Import))) })
  await act(async () => { [...host.querySelectorAll('button')].find(b => /Upload PDF/.test(b.textContent)).click() })
  const input = host.querySelector('input[type="file"][accept*="application/pdf"]')
  let failLocked
  extract = (f) => (f.name === 'locked.pdf'
    ? new Promise((_, rej) => { failLocked = () => rej(pdfError('PasswordException', 'No password given')) })
    : Promise.reject(pdfError('InvalidPDFException', 'Invalid PDF structure.')))
  const pick = async (name) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['x'], name, { type: 'application/pdf' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  }
  await pick('locked.pdf')
  await pick('garbage.pdf')
  await act(async () => { failLocked() })
  const alerts = [...host.querySelectorAll('[role="alert"]')].map(a => a.textContent)
  expect(alerts).toEqual(['Couldn’t open that file — it may be damaged or not a PDF. Try another file.'])
  expect(host.textContent).not.toMatch(/Reading PDF/)
  await act(async () => { root.unmount() }); host.remove()
})

it('a bad file after a good one keeps the text and says so (the good file is not the broken one)', async () => {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(Import))) })
  await act(async () => { [...host.querySelectorAll('button')].find(b => /Upload PDF/.test(b.textContent)).click() })
  const input = host.querySelector('input[type="file"][accept*="application/pdf"]')
  extract = (f) => (f.name === 'good.pdf'
    ? Promise.resolve({ pages: [{ text: 'Saya suka buku.' }] })
    : Promise.reject(pdfError('InvalidPDFException', 'Invalid PDF structure.')))
  const pick = async (name) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['x'], name, { type: 'application/pdf' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  }
  await pick('good.pdf')
  expect(host.textContent).toMatch(/1 page extracted/)
  await pick('bad.pdf')
  expect(host.querySelector('[role="alert"]').textContent).toMatch(/Try another file\. Your text below is unchanged\.$/)
  const ta = host.querySelector('textarea')
  expect(ta.value).toBe('Saya suka buku.')
  // The note follows the box as it is NOW (reviewer: it read the pick-time text).
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  await act(async () => { setter.call(ta, ''); ta.dispatchEvent(new Event('input', { bubbles: true })) })
  expect(host.querySelector('[role="alert"]').textContent).not.toMatch(/unchanged/)
  await act(async () => { root.unmount() }); host.remove()
})

it('two slow picks: the earlier one finishing first leaves the spinner up for the latest', async () => {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(Import))) })
  await act(async () => { [...host.querySelectorAll('button')].find(b => /Upload PDF/.test(b.textContent)).click() })
  const input = host.querySelector('input[type="file"][accept*="application/pdf"]')
  const release = {}
  extract = (f) => new Promise((res) => { release[f.name] = () => res({ pages: [{ text: f.name }] }) })
  const pick = async (name) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['x'], name, { type: 'application/pdf' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  }
  await pick('a.pdf')
  await pick('b.pdf')
  await act(async () => { release['a.pdf']() })
  expect(host.textContent).toMatch(/Reading PDF/)
  await act(async () => { release['b.pdf']() })
  expect(host.textContent).not.toMatch(/Reading PDF/)
  expect(host.querySelector('textarea').value).toBe('b.pdf')
  await act(async () => { root.unmount() }); host.remove()
})
