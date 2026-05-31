// Unit suite for capDuration — the abandoned-session duration clamp.
// Design: docs/improvements.md §B. A "soft" timer (Exam Rehearsal, Speaking)
// lets a distracted student rack up a massive durationSec; capping it at 1h
// keeps telemetry honest (an abandoned session, not a very slow student).
import { describe, it, expect } from 'vitest'
import { capDuration } from '../duration.js'

describe('capDuration', () => {
  it('returns a normal duration unchanged', () => {
    expect(capDuration(125)).toBe(125)
  })

  it('caps a value above the default 1h max', () => {
    expect(capDuration(5000)).toBe(3600)
  })

  it('treats the boundary value as in-range', () => {
    expect(capDuration(3600)).toBe(3600)
  })

  it('honours a custom max', () => {
    expect(capDuration(200, 120)).toBe(120)
  })

  it('clamps negative durations (clock skew) to 0', () => {
    expect(capDuration(-30)).toBe(0)
  })

  it('returns 0 for non-finite input', () => {
    expect(capDuration(NaN)).toBe(0)
    expect(capDuration(Infinity)).toBe(0)
    expect(capDuration(undefined)).toBe(0)
  })

  it('floors fractional seconds to a whole number', () => {
    expect(capDuration(125.9)).toBe(125)
  })
})
