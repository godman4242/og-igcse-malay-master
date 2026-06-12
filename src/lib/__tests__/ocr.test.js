import { describe, it, expect } from 'vitest'
import {
  paragraphsFromOcrText, pagesFromOcrResults, meanConfidence,
  isImageOnlyPdf, lowConfidenceWords, runOcr, OCR_PDF_TEXT_FLOOR, LOW_CONFIDENCE,
  rasterisePdfPages,
} from '../ocr'

describe('paragraphsFromOcrText', () => {
  it('splits on blank lines, collapses single newlines, trims', () => {
    const text = 'Saya suka makan.\nNasi lemak sedap.\n\nHari ini panas.\n'
    expect(paragraphsFromOcrText(text)).toEqual([
      'Saya suka makan. Nasi lemak sedap.',
      'Hari ini panas.',
    ])
  })
  it('handles CRLF and drops empty blocks', () => {
    expect(paragraphsFromOcrText('A\r\n\r\n\r\n  \r\nB')).toEqual(['A', 'B'])
  })
  it('non-string → []', () => {
    expect(paragraphsFromOcrText(null)).toEqual([])
    expect(paragraphsFromOcrText(undefined)).toEqual([])
  })
})

describe('pagesFromOcrResults', () => {
  it('produces the extractTextFromDoc shape, one page per result', () => {
    const { pages } = pagesFromOcrResults([{ text: 'Satu.\n\nDua.' }, { text: 'Tiga.' }])
    expect(pages).toEqual([
      { pageNum: 1, text: 'Satu.\n\nDua.', paragraphs: ['Satu.', 'Dua.'] },
      { pageNum: 2, text: 'Tiga.', paragraphs: ['Tiga.'] },
    ])
  })
  it('empty input → no pages', () => {
    expect(pagesFromOcrResults([]).pages).toEqual([])
  })
})

describe('meanConfidence', () => {
  it('averages numeric confidences, NaN-safe', () => {
    expect(meanConfidence([{ confidence: 90 }, { confidence: 70 }])).toBe(80)
    expect(meanConfidence([{ confidence: 90 }, { foo: 1 }])).toBe(90)
    expect(meanConfidence([])).toBe(0)
  })
})

describe('isImageOnlyPdf', () => {
  it('true for an empty-text-layer PDF with pages', () => {
    expect(isImageOnlyPdf([{ text: '   ' }, { text: '' }])).toBe(true)
  })
  it('false once text crosses the floor', () => {
    expect(isImageOnlyPdf([{ text: 'a'.repeat(OCR_PDF_TEXT_FLOOR + 1) }])).toBe(false)
  })
  it('false for no pages', () => {
    expect(isImageOnlyPdf([])).toBe(false)
  })
})

describe('lowConfidenceWords', () => {
  it('collects normalized words below the threshold', () => {
    const set = lowConfidenceWords([
      { text: 'Nasi', confidence: 95 },
      { text: 'Lemak', confidence: LOW_CONFIDENCE - 1 },
    ])
    expect(set.has('lemak')).toBe(true)
    expect(set.has('nasi')).toBe(false)
  })
})

describe('runOcr', () => {
  const fake = (map) => async (img) => ({ text: map[img] ?? '', words: [{ text: 'x', confidence: 80 }] })

  it('runs images sequentially and returns the pages shape', async () => {
    const { pages } = await runOcr(['a', 'b'], { recognize: fake({ a: 'Satu.', b: 'Dua.' }) })
    expect(pages.map(p => p.text)).toEqual(['Satu.', 'Dua.'])
  })

  it('emits page-level progress', async () => {
    const seen = []
    await runOcr(['a', 'b'], { recognize: fake({ a: 'A', b: 'B' }), onProgress: p => seen.push(p) })
    expect(seen.at(-1)).toEqual({ done: 2, total: 2 })
  })

  it('a thrown image becomes an empty page, never kills the run', async () => {
    const recognize = async (img) => { if (img === 'bad') throw new Error('boom'); return { text: 'ok', words: [] } }
    const { pages } = await runOcr(['bad', 'good'], { recognize })
    expect(pages[0].paragraphs).toEqual([])
    expect(pages[1].text).toBe('ok')
  })

  it('abort stops further images (partial result)', async () => {
    const ctrl = new AbortController()
    let calls = 0
    const recognize = async () => { calls += 1; if (calls === 1) ctrl.abort(); return { text: 'p', words: [] } }
    const { pages } = await runOcr(['a', 'b', 'c'], { recognize, signal: ctrl.signal })
    expect(calls).toBe(1)
    expect(pages.length).toBe(1)
  })

  it('aggregates meanConfidence + lowConfidenceWords across images', async () => {
    const recognize = async () => ({ text: 'Lemak', words: [{ text: 'Lemak', confidence: 50 }] })
    const { meanConfidence: mc, lowConfidenceWords: low } = await runOcr(['a'], { recognize })
    expect(mc).toBe(50)
    expect(low.has('lemak')).toBe(true)
  })
})

describe('rasterisePdfPages', () => {
  const fakeDoc = (numPages) => ({ numPages })

  it('renders up to maxPages pages through the injected renderPage', async () => {
    const calls = []
    const out = await rasterisePdfPages(fakeDoc(3), {
      maxPages: 10,
      renderPage: async (doc, i) => { calls.push(i); return `canvas-${i}` },
    })
    expect(calls).toEqual([1, 2, 3])
    expect(out).toEqual(['canvas-1', 'canvas-2', 'canvas-3'])
  })

  it('caps at maxPages', async () => {
    const calls = []
    await rasterisePdfPages(fakeDoc(20), {
      maxPages: 10,
      renderPage: async (doc, i) => { calls.push(i); return i },
    })
    expect(calls).toHaveLength(10)
  })

  it('stops mid-loop and throws AbortError when the signal aborts (P2-C9)', async () => {
    const ctrl = new AbortController()
    const calls = []
    const p = rasterisePdfPages(fakeDoc(5), {
      maxPages: 10,
      signal: ctrl.signal,
      renderPage: async (doc, i) => {
        calls.push(i)
        if (i === 2) ctrl.abort() // user hits Cancel while page 2 rasterises
        return i
      },
    })
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toEqual([1, 2]) // pages 3-5 never rendered
  })
})
