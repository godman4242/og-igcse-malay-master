// Unit suite for Select v2 grouping logic. The PDF reader's selection bucket can
// glue adjacent individual words into one phrase (compositional meaning, e.g.
// "jam tangan" = watch) and split it back. This pure module is the testable core
// so the bucket UI stays a thin adapter.
//
// Entry shapes (the selection bucket array):
//   word   → { word, en?, type:'word',   index }
//   phrase → { word,      type:'phrase', startIndex, endIndex }
//
// Plan: docs/superpowers/plans/2026-06-07-select-v2.md Step 2.

import { describe, it, expect } from 'vitest'
import { groupSelection, ungroupSelection, explainCompound } from '../selectionGroup.js'

const word = (w, index, en) => ({ word: w, type: 'word', index, ...(en ? { en } : {}) })

describe('groupSelection', () => {
  it('merges two adjacent word entries into one phrase entry', () => {
    const sel = [word('jam', 5), word('tangan', 6)]
    expect(groupSelection(sel, 0, 1)).toEqual([
      { word: 'jam tangan', type: 'phrase', startIndex: 5, endIndex: 6 },
    ])
  })

  it('drops per-word en so the phrase re-translates as a unit', () => {
    const sel = [word('jam', 5, "o'clock"), word('tangan', 6, 'hand')]
    const out = groupSelection(sel, 0, 1)
    expect(out[0].en).toBeUndefined()
    expect(out[0]).toMatchObject({ word: 'jam tangan', type: 'phrase' })
  })

  it('preserves the other entries and their order', () => {
    const sel = [word('besar', 2), word('jam', 5), word('tangan', 6), word('rumah', 9)]
    expect(groupSelection(sel, 1, 2)).toEqual([
      word('besar', 2),
      { word: 'jam tangan', type: 'phrase', startIndex: 5, endIndex: 6 },
      word('rumah', 9),
    ])
  })

  it('joins words in token-index order regardless of array order', () => {
    // entries out of token order in the array still join left-to-right by index
    const sel = [word('tangan', 6), word('jam', 5)]
    expect(groupSelection(sel, 0, 1)[0].word).toBe('jam tangan')
  })

  it('treats a reversed range the same as a forward range', () => {
    const sel = [word('jam', 5), word('tangan', 6)]
    expect(groupSelection(sel, 1, 0)).toEqual(groupSelection(sel, 0, 1))
  })

  it('is a no-op for a group of one', () => {
    const sel = [word('jam', 5), word('tangan', 6)]
    expect(groupSelection(sel, 0, 0)).toEqual(sel)
  })

  it('ignores a non-contiguous range (gap in token indices)', () => {
    const sel = [word('jam', 5), word('air', 8)]
    expect(groupSelection(sel, 0, 1)).toEqual(sel)
  })

  it('ignores the request when the range contains a non-word entry', () => {
    const sel = [
      { word: 'jam tangan', type: 'phrase', startIndex: 5, endIndex: 6 },
      word('rumah', 7),
    ]
    expect(groupSelection(sel, 0, 1)).toEqual(sel)
  })

  it('never throws on malformed input', () => {
    expect(groupSelection(null, 0, 1)).toEqual([])
    expect(groupSelection([word('jam', 5)], 9, 12)).toEqual([word('jam', 5)])
  })
})

describe('ungroupSelection', () => {
  it('splits a phrase entry back into per-word entries with derived indices', () => {
    const sel = [{ word: 'jam tangan', type: 'phrase', startIndex: 5, endIndex: 6 }]
    expect(ungroupSelection(sel, 0)).toEqual([word('jam', 5), word('tangan', 6)])
  })

  it('preserves the other entries and their order', () => {
    const sel = [
      word('besar', 2),
      { word: 'jam tangan', type: 'phrase', startIndex: 5, endIndex: 6 },
      word('rumah', 9),
    ]
    expect(ungroupSelection(sel, 1)).toEqual([
      word('besar', 2), word('jam', 5), word('tangan', 6), word('rumah', 9),
    ])
  })

  it('is a no-op on a word entry', () => {
    const sel = [word('jam', 5)]
    expect(ungroupSelection(sel, 0)).toEqual(sel)
  })

  it('round-trips: group then ungroup restores the original words + indices', () => {
    const sel = [word('jam', 5), word('tangan', 6)]
    const grouped = groupSelection(sel, 0, 1)
    expect(ungroupSelection(grouped, 0)).toEqual([word('jam', 5), word('tangan', 6)])
  })

  it('never throws on malformed input', () => {
    expect(ungroupSelection(null, 0)).toEqual([])
    expect(ungroupSelection([word('jam', 5)], 9)).toEqual([word('jam', 5)])
  })
})

describe('explainCompound', () => {
  it('assembles the side-by-side teaching view-model', () => {
    expect(explainCompound(['jam', 'tangan'], ["o'clock", 'hand'], 'watch')).toEqual({
      parts: [{ w: 'jam', gloss: "o'clock" }, { w: 'tangan', gloss: 'hand' }],
      phrase: { w: 'jam tangan', gloss: 'watch' },
    })
  })

  it('tolerates missing part glosses', () => {
    const out = explainCompound(['jam', 'tangan'], ["o'clock"], 'watch')
    expect(out.parts).toEqual([{ w: 'jam', gloss: "o'clock" }, { w: 'tangan', gloss: '' }])
  })

  it('never throws on malformed input', () => {
    expect(explainCompound(null, null, null)).toEqual({ parts: [], phrase: { w: '', gloss: '' } })
  })
})
