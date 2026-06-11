import { describe, it, expect } from 'vitest'
import { flattenWords } from '../ocrEngine'

describe('flattenWords', () => {
  it('flattens blocks→paragraphs→lines→words to [{text,confidence}]', () => {
    const data = { blocks: [{ paragraphs: [{ lines: [{ words: [
      { text: 'Nasi', confidence: 95 }, { text: 'lemak', confidence: 60 },
    ] }] }] }] }
    expect(flattenWords(data)).toEqual([
      { text: 'Nasi', confidence: 95 },
      { text: 'lemak', confidence: 60 },
    ])
  })
  it('missing structure → []', () => {
    expect(flattenWords(null)).toEqual([])
    expect(flattenWords({})).toEqual([])
  })
})
