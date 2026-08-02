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

// V10 (2026-08-03) — register truth in a MODEL sentence. Per Tatabahasa Dewan
// Edisi Ketiga (the rule this file's own Batch-1 header already states), the
// kata pemeri `adalah` may only precede a frasa ADJEKTIF or a frasa SENDI NAMA;
// a frasa NAMA predicate takes `ialah` or `merupakan`. PRPM lists `saat` as a
// kata nama, so 'berkongsi' — "…adalah saat yang tidak ternilai" — modelled one
// of the most-corrected register slips in IGCSE Malay writing, in a sentence the
// learner is shown as correct.
//
// The allowlist is the review gate: an example may contain `adalah` only if it
// has been checked to precede an adjective or a preposition. Adding a word here
// is a deliberate act, not an accident.
const ADALAH_ALLOWED = new Map([
  // "adalah baik" — `baik` is a kata adjektif, so this one is correct.
  ['adalah', /\badalah\s+baik\b/],
])

describe('dictionaryExamples — kata pemeri `adalah` (DBP register rule)', () => {
  it('no example uses `adalah` outside the reviewed allowlist', () => {
    for (const [word, sentence] of Object.entries(EXAMPLES)) {
      if (!/\badalah\b/.test(sentence)) continue
      expect(ADALAH_ALLOWED.has(word), `unreviewed \`adalah\` in "${word}": ${sentence}`).toBe(true)
      expect(sentence, `${word} no longer matches its reviewed pattern`).toMatch(ADALAH_ALLOWED.get(word))
    }
  })

  it('the berkongsi example takes a frasa nama predicate correctly', () => {
    const s = getExample('berkongsi')
    expect(s).toBeTruthy()
    expect(s, '`saat` is a kata nama — `adalah` cannot precede it').not.toMatch(/\badalah\b/)
    expect(s).toMatch(/\b(merupakan|ialah)\b/)
    // Still usable as a cloze/Produce prompt for its own headword.
    expect(s.toLowerCase()).toContain('berkongsi')
  })
})
