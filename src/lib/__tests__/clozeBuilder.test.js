import { describe, it, expect } from 'vitest'
import { makeClozeItem } from '../clozeBuilder'

describe('makeClozeItem', () => {
  it('blanks the saved word inside its example sentence (cloze)', () => {
    const card = { m: 'rumah', e: 'house', ex: 'Saya tinggal di rumah besar.' }
    const item = makeClozeItem(card)
    expect(item.kind).toBe('cloze')
    expect(item.sentence).toBe('Saya tinggal di rumah besar.')
    expect(item.answer).toBe('rumah')
    expect(item.clue).toBe('house')
    // the blank span covers exactly the word
    expect(item.sentence.slice(item.blankStart, item.blankEnd)).toBe('rumah')
  })

  it('falls back to produce when the word is absent from the example', () => {
    const card = { m: 'rumah', e: 'house', ex: 'Saya suka makan nasi.' }
    const item = makeClozeItem(card)
    expect(item.kind).toBe('produce')
    expect(item.answer).toBe('rumah')
    expect(item.clue).toBe('house')
  })

  it('falls back to produce when the example is just the word itself', () => {
    const card = { m: 'rumah', e: 'house', ex: 'rumah' }
    expect(makeClozeItem(card).kind).toBe('produce')
  })

  it('falls back to produce when there is no example sentence', () => {
    expect(makeClozeItem({ m: 'rumah', e: 'house', ex: '' }).kind).toBe('produce')
    expect(makeClozeItem({ m: 'rumah', e: 'house' }).kind).toBe('produce')
  })

  it('blanks a multi-word phrase as a single span', () => {
    const card = { m: 'rumah sakit', e: 'hospital', ex: 'Dia bekerja di rumah sakit itu.' }
    const item = makeClozeItem(card)
    expect(item.kind).toBe('cloze')
    expect(item.sentence.slice(item.blankStart, item.blankEnd)).toBe('rumah sakit')
    expect(item.answer).toBe('rumah sakit')
  })

  it('matches the word case-insensitively but keeps the original casing in the blank span', () => {
    const card = { m: 'rumah', e: 'house', ex: 'Rumah itu cantik.' }
    const item = makeClozeItem(card)
    expect(item.kind).toBe('cloze')
    expect(item.blankStart).toBe(0)
    expect(item.sentence.slice(item.blankStart, item.blankEnd)).toBe('Rumah')
    expect(item.answer).toBe('rumah')
  })

  it('blanks only the first occurrence when the word appears twice', () => {
    const card = { m: 'rumah', e: 'house', ex: 'Rumah saya dekat rumah dia.' }
    const item = makeClozeItem(card)
    expect(item.kind).toBe('cloze')
    expect(item.blankStart).toBe(0)
    expect(item.blankEnd).toBe(5)
  })

  it('returns null for garbage input (no usable word)', () => {
    expect(makeClozeItem(null)).toBeNull()
    expect(makeClozeItem({})).toBeNull()
    expect(makeClozeItem({ m: '', e: 'house', ex: 'x' })).toBeNull()
  })
})
