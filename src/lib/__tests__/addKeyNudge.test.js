// Unit suite for the BYOK "add your own key" nudge decision helper.
// Design: docs/superpowers/specs/2026-05-31-add-key-nudge-design.md
import { describe, it, expect } from 'vitest'
import { shouldShowAddKeyNudge } from '../addKeyNudge.js'

describe('shouldShowAddKeyNudge', () => {
  it('shows when AI is unavailable and the user has no key', () => {
    expect(shouldShowAddKeyNudge(true, false)).toBe(true)
  })

  it('hides when the user already has a key (never tell them to add one)', () => {
    expect(shouldShowAddKeyNudge(true, true)).toBe(false)
  })

  it('hides when AI is available (no dead-end to recover from)', () => {
    expect(shouldShowAddKeyNudge(false, false)).toBe(false)
  })

  it('hides when AI is available and a key exists', () => {
    expect(shouldShowAddKeyNudge(false, true)).toBe(false)
  })

  it('coerces falsy/edge inputs to a boolean (never returns undefined)', () => {
    expect(shouldShowAddKeyNudge(undefined, undefined)).toBe(false)
    expect(shouldShowAddKeyNudge(1, 0)).toBe(true)
  })
})
