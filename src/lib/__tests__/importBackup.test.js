import { describe, it, expect } from 'vitest'
import { isValidBackup, backupRejection } from '../importBackup'
import { deckFileContent } from '../sharedDeck'

// Guards the Settings restore path: importData OVERWRITES the store, so anything
// that isn't a real backup must be rejected BEFORE it can wipe the deck.
describe('isValidBackup', () => {
  it('accepts a real backup (exportDate + cards array — exportData has written both since 2026-04-13)', () => {
    expect(isValidBackup({ exportDate: '2026-09-28T00:00:00.000Z', cards: [] })).toBe(true)
    expect(isValidBackup({ exportDate: '2026-09-28T00:00:00.000Z', cards: [{ m: 'rumah', e: 'house' }], streak: 5 })).toBe(true)
  })

  it('rejects an empty object (would reset the whole store to defaults)', () => {
    expect(isValidBackup({})).toBe(false)
    expect(isValidBackup({ cards: [] })).toBe(false)
  })

  // R1 #7 (2026-09-28 bug hunt): Settings' OWN two other JSON files carry a
  // `cards` array too. Restoring either wiped streak/exam date/mistakes, and the
  // Export JSON one blanked every card ({malay,english} has no m/e).
  it("rejects Settings' Export JSON and names the file that does restore", () => {
    const cardExport = { // exportToJSON's shape, src/lib/export.js
      exported: '2026-09-28T00:00:00.000Z', version: '1.0', cardCount: 1,
      cards: [{ malay: 'rumah', english: 'house', example: '', topic: 'General', progress: 'n', ease: 2.5, interval: 1, box: 0, lastReview: null, nextReview: null }],
    }
    expect(isValidBackup(cardExport)).toBe(false)
    expect(backupRejection(cardExport)).toMatch(/Backup All Data/)
  })

  it('rejects a shared .deck.json and names the Shared Deck importer', () => {
    const deck = JSON.parse(deckFileContent([{ m: 'rumah', e: 'house', t: 'Home' }]))
    expect(isValidBackup(deck)).toBe(false)
    expect(backupRejection(deck)).toMatch(/Import a Shared Deck/)
  })

  it('gives a plain message for unrelated JSON and null for a real backup', () => {
    expect(backupRejection({ foo: 1 })).toBe('Not a valid backup file')
    expect(backupRejection({ exportDate: 'x', cards: [] })).toBeNull()
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
