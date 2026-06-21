import { describe, it, expect } from 'vitest'
import { isValidBackup } from '../importBackup'

// Guards the Settings restore path: importData OVERWRITES the store, so anything
// that isn't a real backup must be rejected BEFORE it can wipe the deck.
describe('isValidBackup', () => {
  it('accepts a real backup (cards array present)', () => {
    expect(isValidBackup({ cards: [] })).toBe(true)
    expect(isValidBackup({ cards: [{ m: 'rumah', e: 'house' }], streak: 5 })).toBe(true)
  })

  it('rejects an empty object (would reset the whole store to defaults)', () => {
    expect(isValidBackup({})).toBe(false)
  })

  it('rejects a bare array', () => {
    expect(isValidBackup([1, 2, 3])).toBe(false)
    expect(isValidBackup([])).toBe(false)
  })

  it('rejects when cards is present but not an array', () => {
    expect(isValidBackup({ cards: 'nope' })).toBe(false)
    expect(isValidBackup({ cards: 42 })).toBe(false)
    expect(isValidBackup({ cards: { 0: 'x' } })).toBe(false)
  })

  it('rejects null / undefined / primitives', () => {
    expect(isValidBackup(null)).toBe(false)
    expect(isValidBackup(undefined)).toBe(false)
    expect(isValidBackup('string')).toBe(false)
    expect(isValidBackup(123)).toBe(false)
    expect(isValidBackup(true)).toBe(false)
  })
})
