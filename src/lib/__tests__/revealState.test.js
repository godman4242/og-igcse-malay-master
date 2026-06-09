import { describe, it, expect } from 'vitest'
import {
  createRevealState, isRevealed, reveal, hide, setShowAll, hideAll,
} from '../revealState.js'

// Generic id-keyed reveal reducer, extracted from sentenceRevealState so it can back
// BOTH the sentence reveal and the Full-translation page (Step 1 of
// docs/superpowers/plans/2026-06-09-full-translation-page.md). Reveal-gated default:
// nothing revealed, showAll off. The module `../revealState.js` does NOT exist yet.

describe('createRevealState', () => {
  it('starts reveal-gated: nothing revealed, showAll off', () => {
    expect(createRevealState()).toEqual({ showAll: false, revealed: {} })
  })
})

describe('isRevealed', () => {
  it('is false for an id in the initial gated state', () => {
    expect(isRevealed(createRevealState(), '1:0')).toBe(false)
  })
  it('is true once revealed, false for others', () => {
    const s = reveal(createRevealState(), '1:0')
    expect(isRevealed(s, '1:0')).toBe(true)
    expect(isRevealed(s, '2:0')).toBe(false)
  })
  it('is true for every id when showAll is on', () => {
    const s = setShowAll(createRevealState(), true)
    expect(isRevealed(s, 'anything')).toBe(true)
  })
})

describe('reducers are immutable', () => {
  it('reveal does not mutate the previous state', () => {
    const s0 = createRevealState()
    const s1 = reveal(s0, '3:1')
    expect(s0).toEqual({ showAll: false, revealed: {} })
    expect(s1).not.toBe(s0)
    expect(isRevealed(s1, '3:1')).toBe(true)
  })
})

describe('hide', () => {
  it('hides a previously revealed id', () => {
    let s = reveal(createRevealState(), '1:0')
    s = hide(s, '1:0')
    expect(isRevealed(s, '1:0')).toBe(false)
  })
  it('is a no-op for an id that was never revealed', () => {
    expect(isRevealed(hide(createRevealState(), 'x'), 'x')).toBe(false)
  })
})

describe('hideAll', () => {
  it('collapses everything back to the gated default', () => {
    let s = setShowAll(createRevealState(), true)
    s = reveal(s, '1:0')
    expect(isRevealed(s, '1:0')).toBe(true) // sanity: state is non-default first
    expect(hideAll()).toEqual({ showAll: false, revealed: {} })
  })
})
