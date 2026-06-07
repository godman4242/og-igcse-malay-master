import { describe, it, expect } from 'vitest'
import { classifyGesture } from '../gestureModel.js'

// The select-mode gesture model (PDF reader). Kheshav's canonical mapping:
//   left-drag  → individual words (each its own card)
//   right-drag → group as ONE phrase (compositional meaning: jam tangan = watch)
//   single click (either button) → one word
// This pure classifier is the SINGLE source of truth so the mapping can never
// silently invert again (that bug shipped precisely because it was untested).

describe('classifyGesture — Kheshav mapping (left=individual, right=phrase)', () => {
  it('left-drag selects individual words', () => {
    expect(classifyGesture({ button: 0, startIndex: 2, endIndex: 5 }).kind).toBe('words')
  })

  it('right-drag groups the span into one phrase', () => {
    expect(classifyGesture({ button: 2, startIndex: 2, endIndex: 5 }).kind).toBe('phrase')
  })

  it('a single token (no drag) is one word, regardless of button', () => {
    expect(classifyGesture({ button: 0, startIndex: 3, endIndex: 3 }).kind).toBe('word')
    expect(classifyGesture({ button: 2, startIndex: 4, endIndex: 4 }).kind).toBe('word')
  })

  it('normalises a backwards drag to min/max and keeps the kind', () => {
    const left = classifyGesture({ button: 0, startIndex: 5, endIndex: 2 })
    expect(left).toMatchObject({ kind: 'words', startIndex: 2, endIndex: 5 })
    const right = classifyGesture({ button: 2, startIndex: 9, endIndex: 4 })
    expect(right).toMatchObject({ kind: 'phrase', startIndex: 4, endIndex: 9 })
  })

  it('falls back to a single word on non-finite / garbage indices (never throws)', () => {
    expect(classifyGesture({ button: 0, startIndex: null, endIndex: 3 }).kind).toBe('word')
    expect(() => classifyGesture({})).not.toThrow()
    expect(classifyGesture({}).kind).toBe('word')
  })
})

describe('classifyGesture — groupIntent (touch has no right button)', () => {
  it('a left/primary drag groups when groupIntent is "phrase"', () => {
    expect(classifyGesture({ button: 0, startIndex: 2, endIndex: 5, groupIntent: 'phrase' }).kind).toBe('phrase')
  })

  it('a left/primary drag selects words when groupIntent is "words" (default toggle)', () => {
    expect(classifyGesture({ button: 0, startIndex: 2, endIndex: 5, groupIntent: 'words' }).kind).toBe('words')
  })

  it('groupIntent never upgrades a single token to a phrase', () => {
    expect(classifyGesture({ button: 0, startIndex: 3, endIndex: 3, groupIntent: 'phrase' }).kind).toBe('word')
  })

  it('right-drag still groups even when groupIntent says "words" (button wins)', () => {
    expect(classifyGesture({ button: 2, startIndex: 2, endIndex: 5, groupIntent: 'words' }).kind).toBe('phrase')
  })

  it('omitting groupIntent preserves the default left=words mapping', () => {
    expect(classifyGesture({ button: 0, startIndex: 2, endIndex: 5 }).kind).toBe('words')
  })
})
