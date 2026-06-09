import { describe, it, expect } from 'vitest'
import { buildParagraphs, splitForTranslation, planParagraphTranslation, assembleParagraphGloss } from '../paragraphModel.js'

// RED handoff — Step 2 of docs/superpowers/plans/2026-06-09-full-translation-page.md.
// buildParagraphs(pages) flattens the in-memory pdfData.pages
// ([{ pageNum, paragraphs: string[] }]) into stable paragraph units for the
// Full-translation page. The module `../paragraphModel.js` does NOT exist yet.

const PAGES = [
  { pageNum: 1, paragraphs: ['Saya suka nasi.', '  ', 'Dia minum air.'] },
  { pageNum: 2, paragraphs: ['Kami pergi ke pasar.'] },
]

describe('buildParagraphs', () => {
  it('flattens pages into {paraId, pageNum, text}, skipping empty/whitespace paragraphs', () => {
    expect(buildParagraphs(PAGES)).toEqual([
      { paraId: '1:0', pageNum: 1, text: 'Saya suka nasi.' },
      { paraId: '1:2', pageNum: 1, text: 'Dia minum air.' },
      { paraId: '2:0', pageNum: 2, text: 'Kami pergi ke pasar.' },
    ])
  })
  it('trims surrounding whitespace but keeps the paragraph index stable', () => {
    expect(buildParagraphs([{ pageNum: 3, paragraphs: ['  Hello world.  '] }]))
      .toEqual([{ paraId: '3:0', pageNum: 3, text: 'Hello world.' }])
  })
  it('returns [] for empty/missing input', () => {
    expect(buildParagraphs([])).toEqual([])
    expect(buildParagraphs(undefined)).toEqual([])
  })
})

describe('splitForTranslation', () => {
  it('returns the whole text as one chunk when within the cap', () => {
    expect(splitForTranslation('Saya suka nasi goreng.', 4000)).toEqual(['Saya suka nasi goreng.'])
  })
  it('returns [] for empty/whitespace', () => {
    expect(splitForTranslation('   ')).toEqual([])
    expect(splitForTranslation(undefined)).toEqual([])
  })
  it('splits an over-long paragraph at sentence boundaries into <= maxChars chunks', () => {
    // Three 20-char sentences; cap 25 → each sentence is its own chunk.
    const text = 'Aaaaaaaaaaaaaaaaaa a. Bbbbbbbbbbbbbbbbbb b. Cccccccccccccccccc c.'
    const chunks = splitForTranslation(text, 25)
    expect(chunks.length).toBe(3)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(25)
    // Rejoining reconstructs the readable paragraph (whitespace-normalised).
    expect(chunks.join(' ')).toBe(text)
  })
  it('packs multiple short sentences into one chunk up to the cap', () => {
    const text = 'Satu. Dua. Tiga. Empat.'
    expect(splitForTranslation(text, 4000)).toEqual(['Satu. Dua. Tiga. Empat.'])
  })
  it('never splits mid-word: a single over-long sentence becomes its own chunk', () => {
    const long = 'x'.repeat(50) + '.'
    const chunks = splitForTranslation(long, 10)
    expect(chunks).toEqual([long]) // one over-long piece, not chopped mid-word
  })
})

describe('planParagraphTranslation', () => {
  const paras = [
    { paraId: '1:0', pageNum: 1, text: 'Saya suka nasi.' },
    { paraId: '1:1', pageNum: 1, text: 'Dia minum air.' },
    { paraId: '1:2', pageNum: 1, text: 'Saya suka nasi.' }, // identical text to 1:0
  ]
  it('returns deduped chunks + a per-paragraph ordered chunk map', () => {
    const { chunks, perPara } = planParagraphTranslation(paras)
    expect(chunks).toEqual(['Saya suka nasi.', 'Dia minum air.']) // identical text deduped
    expect(perPara).toEqual({
      '1:0': ['Saya suka nasi.'],
      '1:1': ['Dia minum air.'],
      '1:2': ['Saya suka nasi.'],
    })
  })
  it('skips paragraphs already translated (in `have`)', () => {
    const { chunks, perPara } = planParagraphTranslation(paras, { have: { '1:0': { text: 'x' }, '1:2': { text: 'y' } } })
    expect(chunks).toEqual(['Dia minum air.'])
    expect(perPara).toEqual({ '1:1': ['Dia minum air.'] })
  })
  it('is empty when everything is already translated', () => {
    const have = { '1:0': {}, '1:1': {}, '1:2': {} }
    expect(planParagraphTranslation(paras, { have })).toEqual({ chunks: [], perPara: {} })
  })
})

describe('assembleParagraphGloss', () => {
  const results = {
    'Satu.': { text: 'One.', source: 'gtx' },
    'Dua.': { text: 'Two.', source: 'gtx' },
    'Bad.': { text: 'Bad.', source: 'error' },
  }
  it('rejoins sub-chunk translations into one readable paragraph', () => {
    expect(assembleParagraphGloss(['Satu.', 'Dua.'], results)).toEqual({ text: 'One. Two.', source: 'gtx' })
  })
  it('a single chunk passes through unchanged', () => {
    expect(assembleParagraphGloss(['Satu.'], results)).toEqual({ text: 'One.', source: 'gtx' })
  })
  it('source is "error" only when EVERY chunk errored', () => {
    expect(assembleParagraphGloss(['Bad.'], results).source).toBe('error')
    // a partial failure still surfaces the good source
    expect(assembleParagraphGloss(['Satu.', 'Bad.'], results).source).toBe('gtx')
  })
})
