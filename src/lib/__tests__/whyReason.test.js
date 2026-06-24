import { describe, it, expect } from 'vitest'
import { reasonForTask, reasonForPicked, reasonForRail } from '../whyReason.js'

describe('whyReason', () => {
  it('passes a task reason through', () => {
    expect(reasonForTask({ reason: 'Spaced review is time-sensitive.' }))
      .toBe('Spaced review is time-sensitive.')
  })
  it('returns empty string when a task has no reason', () => {
    expect(reasonForTask({})).toBe('')
    expect(reasonForTask(null)).toBe('')
  })
  it('names the weak spots for Picked for you', () => {
    expect(reasonForPicked(['vocab', 'tense']))
      .toBe('Built around your weak spots this week: Vocabulary, Tenses.')
  })
  it('maps the refined meN- key to its label', () => {
    expect(reasonForPicked(['imbuhan:meN-']))
      .toBe('Built around your weak spots this week: meN- prefixes.')
  })
  it('falls back when there are no focus topics', () => {
    const fallback = 'A focused session built from what you most need to review.'
    expect(reasonForPicked([])).toBe(fallback)
    expect(reasonForPicked(null)).toBe(fallback)
  })
  it('returns a rail blurb for known shelves, empty for others', () => {
    expect(reasonForRail('saved')).toMatch(/captured while reading/i)
    expect(reasonForRail('unknown')).toBe('')
  })
})
