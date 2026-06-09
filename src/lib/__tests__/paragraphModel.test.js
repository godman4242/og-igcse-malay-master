import { describe, it, expect } from 'vitest'
import { buildParagraphs } from '../paragraphModel.js'

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
