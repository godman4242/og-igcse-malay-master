// readerKeymap — the reflow reader's pure key → action dispatcher.
//
// Mirrors gestureModel.js: the canonical key map lives in ONE tested pure
// function so it can never silently invert. The component performs the side
// effects (focus moves, handleCommit, revealGloss, addGloss); this maps.
//
// Spec: docs/superpowers/specs/2026-06-12-reader-drill-a11y-design.md §3.3/§3.4.
// Key invariant pinned here: a keyboard range commits with EXACTLY the same
// `kind` a pointer drag of the same span would get (classifyGesture parity).

import { describe, it, expect } from 'vitest'
import { resolveReaderKey } from '../readerKeymap'
import { classifyGesture } from '../gestureModel'

// Content-token global indices are non-contiguous (spaces/punct are skipped
// by the renderer), so the order array is the document-order lookup table.
const ORDER = [2, 5, 9, 14]

const ctx = (over = {}) => ({
  activeIndex: 5,
  order: ORDER,
  anchorIndex: null,
  mode: 'translate',
  groupOn: false,
  hasGloss: false,
  glossRevealed: false,
  ...over,
})

describe('resolveReaderKey — movement', () => {
  it('ArrowLeft / ArrowUp move to the previous content token', () => {
    expect(resolveReaderKey({ key: 'ArrowLeft' }, ctx())).toEqual({ type: 'move', to: 2 })
    expect(resolveReaderKey({ key: 'ArrowUp' }, ctx())).toEqual({ type: 'move', to: 2 })
  })

  it('ArrowRight / ArrowDown move to the next content token', () => {
    expect(resolveReaderKey({ key: 'ArrowRight' }, ctx())).toEqual({ type: 'move', to: 9 })
    expect(resolveReaderKey({ key: 'ArrowDown' }, ctx())).toEqual({ type: 'move', to: 9 })
  })

  it('clamps at both document ends (no wrap, no crash)', () => {
    expect(resolveReaderKey({ key: 'ArrowLeft' }, ctx({ activeIndex: 2 }))).toEqual({ type: 'move', to: 2 })
    expect(resolveReaderKey({ key: 'ArrowRight' }, ctx({ activeIndex: 14 }))).toEqual({ type: 'move', to: 14 })
  })

  it('Home / End jump to the first / last content token', () => {
    expect(resolveReaderKey({ key: 'Home' }, ctx())).toEqual({ type: 'move', to: 2 })
    expect(resolveReaderKey({ key: 'End' }, ctx())).toEqual({ type: 'move', to: 14 })
  })
})

describe('resolveReaderKey — range building', () => {
  it('Shift+Arrow extends towards the neighbour', () => {
    expect(resolveReaderKey({ key: 'ArrowRight', shiftKey: true }, ctx())).toEqual({ type: 'extend', to: 9 })
    expect(resolveReaderKey({ key: 'ArrowLeft', shiftKey: true }, ctx())).toEqual({ type: 'extend', to: 2 })
    expect(resolveReaderKey({ key: 'ArrowDown', shiftKey: true }, ctx())).toEqual({ type: 'extend', to: 9 })
    expect(resolveReaderKey({ key: 'ArrowUp', shiftKey: true }, ctx())).toEqual({ type: 'extend', to: 2 })
  })

  it('Shift+Arrow clamps at the ends too', () => {
    expect(resolveReaderKey({ key: 'ArrowRight', shiftKey: true }, ctx({ activeIndex: 14 })))
      .toEqual({ type: 'extend', to: 14 })
  })

  it('Escape clears an in-progress range', () => {
    expect(resolveReaderKey({ key: 'Escape' }, ctx({ anchorIndex: 5, activeIndex: 9 })))
      .toEqual({ type: 'clearRange' })
  })

  it('Escape with no range passes through (null) so other UI can use it', () => {
    expect(resolveReaderKey({ key: 'Escape' }, ctx())).toBeNull()
  })
})

describe('resolveReaderKey — Enter (activate vs commitRange)', () => {
  it('Enter with no range activates the focused token', () => {
    expect(resolveReaderKey({ key: 'Enter' }, ctx())).toEqual({ type: 'activate', index: 5 })
  })

  it('Enter with a collapsed range (anchor === focus) still activates', () => {
    expect(resolveReaderKey({ key: 'Enter' }, ctx({ anchorIndex: 5 })))
      .toEqual({ type: 'activate', index: 5 })
  })

  it('Enter with a range commits it as individual words when Group is off', () => {
    const action = resolveReaderKey({ key: 'Enter' }, ctx({ anchorIndex: 5, activeIndex: 14 }))
    expect(action).toEqual({ type: 'commitRange', startIndex: 5, endIndex: 14, kind: 'words' })
  })

  it('Enter with a range commits it as one phrase when Group is on', () => {
    const action = resolveReaderKey({ key: 'Enter' }, ctx({ anchorIndex: 5, activeIndex: 14, groupOn: true }))
    expect(action).toEqual({ type: 'commitRange', startIndex: 5, endIndex: 14, kind: 'phrase' })
  })

  it('normalises a backwards range (anchor after focus)', () => {
    const action = resolveReaderKey({ key: 'Enter' }, ctx({ anchorIndex: 14, activeIndex: 2 }))
    expect(action).toEqual({ type: 'commitRange', startIndex: 2, endIndex: 14, kind: 'words' })
  })

  it('keyboard ranges classify EXACTLY like a pointer drag of the same span', () => {
    for (const groupOn of [false, true]) {
      const action = resolveReaderKey({ key: 'Enter' }, ctx({ anchorIndex: 9, activeIndex: 2, groupOn }))
      const drag = classifyGesture({
        button: 0, startIndex: 9, endIndex: 2, groupIntent: groupOn ? 'phrase' : 'words',
      })
      expect(action.kind).toBe(drag.kind)
      expect(action.startIndex).toBe(drag.startIndex)
      expect(action.endIndex).toBe(drag.endIndex)
    }
  })
})

describe('resolveReaderKey — add to deck', () => {
  it("'a' asks to add the focused token's gloss to the deck", () => {
    expect(resolveReaderKey({ key: 'a' }, ctx())).toEqual({ type: 'addDeck', index: 5 })
  })
})

describe('resolveReaderKey — pass-through (browser keeps the key)', () => {
  it('unknown keys return null', () => {
    expect(resolveReaderKey({ key: 'x' }, ctx())).toBeNull()
    expect(resolveReaderKey({ key: ' ' }, ctx())).toBeNull() // Space keeps native scroll (D5)
    expect(resolveReaderKey({ key: 'Tab' }, ctx())).toBeNull() // native roving entry/exit
  })

  it('modified keys (Ctrl/Meta/Alt) return null — never hijack shortcuts like Ctrl+A', () => {
    expect(resolveReaderKey({ key: 'a', ctrlKey: true }, ctx())).toBeNull()
    expect(resolveReaderKey({ key: 'a', metaKey: true }, ctx())).toBeNull()
    expect(resolveReaderKey({ key: 'ArrowRight', altKey: true }, ctx())).toBeNull()
    expect(resolveReaderKey({ key: 'Enter', ctrlKey: true }, ctx())).toBeNull()
  })

  it('returns null when there are no content tokens or the active token is unknown', () => {
    expect(resolveReaderKey({ key: 'ArrowRight' }, ctx({ order: [] }))).toBeNull()
    expect(resolveReaderKey({ key: 'Enter' }, ctx({ order: [] }))).toBeNull()
    expect(resolveReaderKey({ key: 'ArrowRight' }, ctx({ activeIndex: 999 }))).toBeNull()
  })
})
