import { describe, it, expect } from 'vitest'
import {
  createGlossState,
  isRevealed,
  revealToken,
  hideToken,
  setShowAll,
  hideAll,
} from '../docGlossState.js'

// RED handoff for "Translate the whole document, free" — Step 3 of
// docs/superpowers/plans/2026-06-08-translate-document.md.
// Pure reveal-state reducer for the reveal-gated gloss layer (the load-bearing
// learning-science guardrail: hidden until tapped by default; "show all" is the
// opt-in escape hatch). The module `../docGlossState.js` does NOT exist yet.

describe('createGlossState', () => {
  it('starts reveal-gated: nothing revealed, showAll off', () => {
    const s = createGlossState()
    expect(s).toEqual({ showAll: false, revealed: {} })
  })
})

describe('isRevealed', () => {
  it('is false for a token in the initial gated state', () => {
    expect(isRevealed(createGlossState(), 7)).toBe(false)
  })
  it('is true once a token is revealed', () => {
    const s = revealToken(createGlossState(), 7)
    expect(isRevealed(s, 7)).toBe(true)
    expect(isRevealed(s, 8)).toBe(false)
  })
  it('is true for every token when showAll is on', () => {
    const s = setShowAll(createGlossState(), true)
    expect(isRevealed(s, 1)).toBe(true)
    expect(isRevealed(s, 999)).toBe(true)
  })
})

describe('reducers are immutable', () => {
  it('revealToken does not mutate the previous state', () => {
    const s0 = createGlossState()
    const s1 = revealToken(s0, 3)
    expect(s0).toEqual({ showAll: false, revealed: {} })
    expect(s1).not.toBe(s0)
    expect(isRevealed(s1, 3)).toBe(true)
  })
  it('setShowAll does not mutate the previous state', () => {
    const s0 = createGlossState()
    const s1 = setShowAll(s0, true)
    expect(s0.showAll).toBe(false)
    expect(s1.showAll).toBe(true)
  })
})

describe('hideToken', () => {
  it('hides a previously revealed token', () => {
    let s = revealToken(createGlossState(), 5)
    s = hideToken(s, 5)
    expect(isRevealed(s, 5)).toBe(false)
  })
  it('is a no-op for a token that was never revealed', () => {
    const s = hideToken(createGlossState(), 42)
    expect(isRevealed(s, 42)).toBe(false)
  })
})

describe('hideAll', () => {
  it('resets to the gated default (showAll off, nothing revealed)', () => {
    let s = setShowAll(createGlossState(), true)
    s = revealToken(s, 2)
    s = hideAll(s)
    expect(s).toEqual({ showAll: false, revealed: {} })
    expect(isRevealed(s, 2)).toBe(false)
  })
})
