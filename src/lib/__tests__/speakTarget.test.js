import { describe, it, expect } from 'vitest'
import { speakTargetFor } from '../speakTarget.js'

// Speak mode (#9) practises the example SENTENCE when the card has a real one,
// but must fall back to the word for the store's "word (gloss)." placeholders —
// otherwise ms-MY TTS would try to pronounce the English gloss.

describe('speakTargetFor', () => {
  it('returns the example sentence when it is a real Malay sentence', () => {
    expect(speakTargetFor({ m: 'air', e: 'water', ex: 'Saya minum air setiap pagi.' }))
      .toBe('Saya minum air setiap pagi.')
  })

  it('falls back to the WORD for a "word (gloss)." placeholder', () => {
    expect(speakTargetFor({ m: 'abad', e: 'century', ex: 'abad (century).' })).toBe('abad')
  })

  it('treats a multi-word-entry placeholder as a placeholder (→ word)', () => {
    expect(speakTargetFor({ m: 'alat komunikasi', e: 'communication tool', ex: 'alat komunikasi (communication tool).' }))
      .toBe('alat komunikasi')
  })

  it('catches a placeholder even without the trailing period', () => {
    expect(speakTargetFor({ m: 'abad', e: 'century', ex: 'abad (century)' })).toBe('abad')
  })

  it('falls back to the word when there is no example', () => {
    expect(speakTargetFor({ m: 'rumah', e: 'house' })).toBe('rumah')
    expect(speakTargetFor({ m: 'rumah', e: 'house', ex: '' })).toBe('rumah')
  })

  it('uses the sentence even if the word field is absent', () => {
    expect(speakTargetFor({ ex: 'Dia pergi ke sekolah.' })).toBe('Dia pergi ke sekolah.')
  })

  it('returns "" for a junk card', () => {
    expect(speakTargetFor(null)).toBe('')
    expect(speakTargetFor({})).toBe('')
    expect(speakTargetFor({ m: 42 })).toBe('')
  })
})
