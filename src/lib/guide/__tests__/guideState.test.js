import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGuideState, setGuideState, resetGuideState, subscribeGuideState } from '../guideState'

beforeEach(() => resetGuideState())

describe('guideState', () => {
  it('starts idle', () => {
    expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
  })

  it('setGuideState merges a patch and notifies subscribers', () => {
    const fn = vi.fn()
    const off = subscribeGuideState(fn)
    setGuideState({ dragging: true, zone: 'top' })
    expect(getGuideState()).toMatchObject({ dragging: true, zone: 'top', docked: null })
    expect(fn).toHaveBeenCalledTimes(1)
    off()
  })

  it('returns a STABLE snapshot reference when nothing changed (React-safe)', () => {
    const before = getGuideState()
    setGuideState({ dragging: false }) // same value → no-op
    expect(getGuideState()).toBe(before)
  })

  it('does NOT notify on a no-op set', () => {
    const fn = vi.fn()
    const off = subscribeGuideState(fn)
    setGuideState({ dragging: false, zone: null }) // already these values
    expect(fn).not.toHaveBeenCalled()
    off()
  })

  it('unsubscribe stops further notifications', () => {
    const fn = vi.fn()
    const off = subscribeGuideState(fn)
    off()
    setGuideState({ dragging: true })
    expect(fn).not.toHaveBeenCalled()
  })

  it('resetGuideState restores the idle shape', () => {
    setGuideState({ dragging: true, zone: 'br', docked: 'br', announce: 'x' })
    resetGuideState()
    expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
  })
})
