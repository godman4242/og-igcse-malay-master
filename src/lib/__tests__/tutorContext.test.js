import { describe, it, expect } from 'vitest'
import { learnerScaffoldNote } from '../tutorContext'

describe('learnerScaffoldNote', () => {
  it('returns a heavy-scaffold hint', () => {
    expect(learnerScaffoldNote({ scaffoldLevel: 'heavy' })).toMatch(/scaffold level: heavy/i)
  })
  it('returns empty string for medium or missing profile', () => {
    expect(learnerScaffoldNote({ scaffoldLevel: 'medium' })).toBe('')
    expect(learnerScaffoldNote(null)).toBe('')
  })
})
