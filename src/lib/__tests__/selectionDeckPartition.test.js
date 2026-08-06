// Census B4 (2026-08-06): "Add to deck" in the reader minted self-gloss cards
// from FAILED translations.
//
//   en: translations[pi++]?.text || s.word
//
// It read `.text` and ignored `.source`. A failed translation's `.text` is the
// source word, so offline / rate-limited / on a messy OCR scan the learner got
// cards teaching `makan = makan` — or `makarn = makarn` from a mis-scanned
// token — with no error shown, then rehearsed them for weeks.
//
// Kheshav's call (2026-08-06): block the add and say why, rather than adding
// them flagged "unverified" — a flag just defers the harm into the deck, and
// the whole point of the app is not being confident-wrong.

import { describe, it, expect } from 'vitest'
import { partitionSelectionForDeck } from '../selectionToCard.js'

const ok = (text) => ({ text, source: 'gtx', provider: 'gtx' })
// What a failed provider actually returns: the INPUT echoed back.
const err = (text) => ({ text, source: 'error', provider: 'gtx' })

describe('partitionSelectionForDeck (census B4)', () => {
  it('mints cards for entries that translated', () => {
    const { ready, failed } = partitionSelectionForDeck(
      [{ word: 'rumah' }, { word: 'makan' }],
      [ok('house'), ok('eat')],
    )
    expect(ready).toEqual([{ word: 'rumah', en: 'house' }, { word: 'makan', en: 'eat' }])
    expect(failed).toEqual([])
  })

  it('holds back a failed translation instead of teaching the word as its own meaning', () => {
    const { ready, failed } = partitionSelectionForDeck([{ word: 'makan' }], [err('makan')])
    expect(ready, 'no card may be minted from a failed translation').toEqual([])
    expect(failed).toEqual([{ word: 'makan' }])
  })

  it('holds back an OCR token whose translation failed (the messy-scan case)', () => {
    const { ready } = partitionSelectionForDeck([{ word: 'makarn' }], [err('makarn')])
    expect(ready).toEqual([])
  })

  it('keeps the good ones when only some fail, and stays aligned', () => {
    const { ready, failed } = partitionSelectionForDeck(
      [{ word: 'rumah' }, { word: 'xyzq' }, { word: 'buku' }],
      [ok('house'), err('xyzq'), ok('book')],
    )
    expect(ready.map(r => r.word)).toEqual(['rumah', 'buku'])
    expect(ready.map(r => r.en)).toEqual(['house', 'book'])
    expect(failed.map(f => f.word)).toEqual(['xyzq'])
  })

  it('does not consume a translation slot for an entry that already has a gloss', () => {
    // The reader only translates entries LACKING `en`, so the results array is
    // indexed against that subset — an off-by-one here would pair the wrong
    // gloss with the wrong word, which is its own confident-wrong defect.
    const { ready, failed } = partitionSelectionForDeck(
      [{ word: 'rumah', en: 'house' }, { word: 'buku' }],
      [ok('book')],
    )
    expect(ready).toEqual([{ word: 'rumah', en: 'house' }, { word: 'buku', en: 'book' }])
    expect(failed).toEqual([])
  })

  it('treats an empty or whitespace gloss as a failure even when marked successful', () => {
    const { ready, failed } = partitionSelectionForDeck(
      [{ word: 'satu' }, { word: 'dua' }],
      [ok('   '), { text: undefined, source: 'gtx' }],
    )
    expect(ready).toEqual([])
    expect(failed.map(f => f.word)).toEqual(['satu', 'dua'])
  })

  it('holds back everything when the provider returned nothing at all', () => {
    const { ready, failed } = partitionSelectionForDeck([{ word: 'satu' }, { word: 'dua' }], [])
    expect(ready).toEqual([])
    expect(failed).toHaveLength(2)
  })
})
