import { describe, it, expect } from 'vitest'
import {
  createSentenceState,
  isSentenceRevealed,
  revealSentence,
  hideSentence,
  setShowAllSentences,
  hideAllSentences,
} from '../sentenceRevealState.js'

// RED handoff for the sentence-level reveal feature — Step 2 of
// docs/superpowers/plans/2026-06-08-sentence-reveal.md.
//
// A reveal-state reducer keyed by sentenceId, mirroring docGlossState exactly but
// kept as a SEPARATE state object from the word gloss state (independent toggles,
// spec §4). Reveal-gated default: nothing revealed, showAll off. The module
// `../sentenceRevealState.js` does NOT exist yet.

describe('createSentenceState', () => {
  it('starts reveal-gated: nothing revealed, showAll off', () => {
    expect(createSentenceState()).toEqual({ showAll: false, revealed: {} })
  })
})

describe('isSentenceRevealed', () => {
  it('is false for a sentence in the initial gated state', () => {
    expect(isSentenceRevealed(createSentenceState(), '1:0:3')).toBe(false)
  })
  it('is true once a sentence is revealed, false for others', () => {
    const s = revealSentence(createSentenceState(), '1:0:3')
    expect(isSentenceRevealed(s, '1:0:3')).toBe(true)
    expect(isSentenceRevealed(s, '1:0:9')).toBe(false)
  })
  it('is true for every sentence when showAll is on', () => {
    const s = setShowAllSentences(createSentenceState(), true)
    expect(isSentenceRevealed(s, '1:0:3')).toBe(true)
    expect(isSentenceRevealed(s, '9:9:999')).toBe(true)
  })
})

describe('reducers are immutable', () => {
  it('revealSentence does not mutate the previous state', () => {
    const s0 = createSentenceState()
    const s1 = revealSentence(s0, '2:1:5')
    expect(s0).toEqual({ showAll: false, revealed: {} })
    expect(s1).not.toBe(s0)
    expect(isSentenceRevealed(s1, '2:1:5')).toBe(true)
  })
  it('setShowAllSentences does not mutate the previous state', () => {
    const s0 = createSentenceState()
    const s1 = setShowAllSentences(s0, true)
    expect(s0.showAll).toBe(false)
    expect(s1.showAll).toBe(true)
  })
})

describe('hideSentence', () => {
  it('hides a previously revealed sentence', () => {
    let s = revealSentence(createSentenceState(), '1:0:5')
    s = hideSentence(s, '1:0:5')
    expect(isSentenceRevealed(s, '1:0:5')).toBe(false)
  })
  it('is a no-op for a sentence that was never revealed', () => {
    const s = hideSentence(createSentenceState(), '1:0:42')
    expect(isSentenceRevealed(s, '1:0:42')).toBe(false)
  })
})

describe('hideAllSentences', () => {
  it('collapses everything back to the gated default', () => {
    let s = setShowAllSentences(createSentenceState(), true)
    s = revealSentence(s, '1:0:2')
    s = hideAllSentences()
    expect(s).toEqual({ showAll: false, revealed: {} })
    expect(isSentenceRevealed(s, '1:0:2')).toBe(false)
  })
})
