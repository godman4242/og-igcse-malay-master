import { describe, it, expect } from 'vitest'
import { sentenceUnknowns } from '../sentenceModel.js'

// sentenceUnknowns(sentences, wordByIndex, isKnown) → Map<sentenceId, string[]>
// the distinct unknown (NOT isKnown) running words per sentence, in order,
// preserving the original surface form. Predicate-driven so the Malay path can
// inject the dictionary test and the English path can inject the known-English set.
const wbi = (words) => new Map(words.map((w, i) => [i, w]))

describe('sentenceUnknowns', () => {
  it('collects the words for which isKnown is false, preserving surface form', () => {
    const sentences = [{ sentenceId: 's1', tokenIndices: [0, 1, 2] }]
    const wordByIndex = wbi(['Cats', 'and', 'xenophobia'])
    const isKnown = (norm) => norm === 'cats' || norm === 'and'
    const m = sentenceUnknowns(sentences, wordByIndex, isKnown)
    expect(m.get('s1')).toEqual(['xenophobia'])
  })

  it('dedupes within a sentence by normalised form (keeps first surface)', () => {
    const sentences = [{ sentenceId: 's1', tokenIndices: [0, 1, 2] }]
    const wordByIndex = wbi(['Zword', 'zword', 'zword'])
    const m = sentenceUnknowns(sentences, wordByIndex, () => false)
    expect(m.get('s1')).toEqual(['Zword'])
  })

  it('omits sentences that have no unknown words', () => {
    const sentences = [
      { sentenceId: 's1', tokenIndices: [0, 1] },
      { sentenceId: 's2', tokenIndices: [2] },
    ]
    const wordByIndex = wbi(['the', 'cat', 'zword'])
    const isKnown = (norm) => norm === 'the' || norm === 'cat'
    const m = sentenceUnknowns(sentences, wordByIndex, isKnown)
    expect(m.has('s1')).toBe(false) // all known
    expect(m.get('s2')).toEqual(['zword'])
  })

  it('skips punctuation-only / empty tokens (normalised to nothing)', () => {
    const sentences = [{ sentenceId: 's1', tokenIndices: [0, 1, 2, 3] }]
    const wordByIndex = wbi(['!!!', '', 'zword', '...'])
    const m = sentenceUnknowns(sentences, wordByIndex, () => false)
    expect(m.get('s1')).toEqual(['zword'])
  })

  it('the Malay-style predicate (dictionary membership) collects dict-misses', () => {
    const DICT = { rumah: 'house', makan: 'eat' }
    const sentences = [{ sentenceId: 's1', tokenIndices: [0, 1, 2] }]
    const wordByIndex = wbi(['rumah', 'makan', 'belalang'])
    const isKnown = (norm) => !!DICT[norm]
    const m = sentenceUnknowns(sentences, wordByIndex, isKnown)
    expect(m.get('s1')).toEqual(['belalang'])
  })

  it('is safe on empty / missing input', () => {
    expect(sentenceUnknowns([], new Map(), () => false).size).toBe(0)
    expect(sentenceUnknowns(null, new Map(), () => false).size).toBe(0)
    expect(sentenceUnknowns(undefined, undefined, undefined).size).toBe(0)
  })

  it('treats a missing predicate as "nothing known" (everything unknown)', () => {
    const sentences = [{ sentenceId: 's1', tokenIndices: [0, 1] }]
    const wordByIndex = wbi(['alpha', 'beta'])
    const m = sentenceUnknowns(sentences, wordByIndex)
    expect(m.get('s1')).toEqual(['alpha', 'beta'])
  })
})
