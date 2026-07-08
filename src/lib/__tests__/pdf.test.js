// PLAUSIBLE-6 (2026-07-03 adversarial review): extractPdfText() creates a live
// PDFDocumentProxy via loadPdf() but the original code neither returned nor
// destroyed it — so every Import PDF parse leaked a pdf.js worker doc. These
// tests pin that the doc is destroyed once text extraction finishes (or fails).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDocument = vi.fn()
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  getDocument: (...args) => getDocument(...args),
  GlobalWorkerOptions: { workerSrc: '' },
}))
vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({ default: 'worker.js' }))

const { extractPdfText } = await import('../pdf')

const fakeFile = () => ({ arrayBuffer: async () => new ArrayBuffer(8) })

const textItem = (str, y) => ({ str, transform: [1, 0, 0, 1, 0, y], height: 12, width: 30 })

beforeEach(() => { getDocument.mockReset() })

describe('extractPdfText — destroys the worker doc (no leaked PDFDocumentProxy)', () => {
  it('destroys the doc after extracting text', async () => {
    const destroy = vi.fn()
    const doc = {
      numPages: 1,
      destroy,
      getMetadata: async () => ({ info: { Title: 'T', Author: 'A' } }),
      getPage: async () => ({ getTextContent: async () => ({ items: [textItem('Hello world', 700)] }) }),
    }
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) })

    const res = await extractPdfText(fakeFile())
    expect(res.pages).toHaveLength(1)
    expect(res.pages[0].text).toContain('Hello world')
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('destroys the doc even when text extraction throws (no leak on error)', async () => {
    const destroy = vi.fn()
    const doc = {
      numPages: 1,
      destroy,
      getMetadata: async () => ({ info: {} }),
      getPage: async () => { throw new Error('bad page') },
    }
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) })

    await expect(extractPdfText(fakeFile())).rejects.toThrow(/bad page/)
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
