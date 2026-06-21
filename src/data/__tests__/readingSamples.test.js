import { describe, it, expect } from 'vitest'
import { getReadingSample, READING_SAMPLES } from '../readingSamples'

// readingSamples feeds the PDF reader's "Try a sample" CTA. The reader consumes
// `pdfData.pages` where each page is `{ pageNum, paragraphs: [string] }` and
// tokenizes the paragraph strings itself (PDFReader.jsx splitParagraph loop).
// These tests pin that contract so a sample can never render blank.

const READER_PAGE_OK = (page) => {
  expect(typeof page.pageNum).toBe('number')
  expect(page.pageNum).toBeGreaterThanOrEqual(1)
  expect(Array.isArray(page.paragraphs)).toBe(true)
  expect(page.paragraphs.length).toBeGreaterThan(0)
  for (const para of page.paragraphs) {
    expect(typeof para).toBe('string')
    expect(para.trim().length).toBeGreaterThan(0)
    // Paragraphs must arrive pre-trimmed (the \n\n split is cleaned) so the
    // reader doesn't tokenize stray blank lines into empty tokens.
    expect(para).toBe(para.trim())
  }
}

describe('getReadingSample', () => {
  it('returns a reader-ready {pages} sample for Malay', () => {
    const s = getReadingSample('ms')
    expect(s.lang).toBe('ms')
    expect(Array.isArray(s.pages)).toBe(true)
    expect(s.pages.length).toBeGreaterThan(0)
    s.pages.forEach(READER_PAGE_OK)
    // The Malay sample must actually be Malay (reveal-gating is en→ms) — a couple
    // of distinctive function words that don't appear in the English sample.
    const text = s.pages.flatMap(p => p.paragraphs).join(' ')
    expect(text).toMatch(/\b(yang|dan|untuk|kampung)\b/)
  })

  it('returns a reader-ready {pages} sample for English', () => {
    const s = getReadingSample('en')
    expect(s.lang).toBe('en')
    expect(s.pages.length).toBeGreaterThan(0)
    s.pages.forEach(READER_PAGE_OK)
  })

  it('has multi-paragraph passages (the \\n\\n split produced real paragraphs)', () => {
    expect(getReadingSample('ms').pages[0].paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(getReadingSample('en').pages[0].paragraphs.length).toBeGreaterThanOrEqual(2)
  })

  it('the two languages are genuinely different passages', () => {
    const ms = getReadingSample('ms').pages[0].paragraphs[0]
    const en = getReadingSample('en').pages[0].paragraphs[0]
    expect(ms).not.toBe(en)
  })

  it('falls back to Malay for an unknown/missing language (default ms)', () => {
    expect(getReadingSample('xx')).toEqual(getReadingSample('ms'))
    expect(getReadingSample()).toEqual(getReadingSample('ms'))
  })

  it('READING_SAMPLES has both language keys with a title', () => {
    expect(Object.keys(READING_SAMPLES).sort()).toEqual(['en', 'ms'])
    expect(READING_SAMPLES.ms.title.trim()).toBeTruthy()
    expect(READING_SAMPLES.en.title.trim()).toBeTruthy()
  })
})
