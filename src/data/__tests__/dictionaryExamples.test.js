import { describe, it, expect } from 'vitest'
import EXAMPLES, { getExample } from '../dictionaryExamples.js'

// getExample is the accessor the card-creation paths (SearchModal / PDFReader /
// Import) consult before falling back to a synthetic placeholder ex.
describe('getExample', () => {
  it('returns the curated example (a string) for a covered word', () => {
    expect(getExample('makanan')).toBe(EXAMPLES['makanan'])
    expect(typeof getExample('makanan')).toBe('string')
  })
  it('returns null for an uncovered word, so callers use their placeholder', () => {
    expect(getExample('zxqwv')).toBeNull()
  })
})
