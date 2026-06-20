import { describe, it, expect } from 'vitest'
import DICTIONARY from '../dictionary.js'
import DICTIONARY_EN from '../dictionaryEn.js'

// Content-truth (axis-1): `ijazah` = academic degree (the university qualification).
// "certificate" is a DIFFERENT word in Malay — `sijil` (e.g. Sijil Pelajaran Malaysia,
// sijil kelahiran = birth certificate). Web-verified vs Malay education authorities
// (iluminasi.com, unitar.my, weblogographic.com) 2026-06-21. The old gloss
// 'certificate/degree' taught the wrong synonym in the Malay->English direction.
describe('dictionary content-truth — ijazah', () => {
  it('glosses ijazah as an academic degree, not a certificate (certificate = sijil)', () => {
    expect(DICTIONARY['ijazah']).toBe('academic degree')
    expect(DICTIONARY['ijazah'].toLowerCase()).not.toContain('certificate')
  })

  it('the reversed English seed teaches "academic degree" -> ijazah (regen stayed in sync)', () => {
    // The old slash-gloss was dropped by the reversal (droppedSlash); the clean
    // 2-word gloss is now kept, so dictionaryEn.js must be regenerated in lock-step.
    expect(DICTIONARY_EN['academic degree']).toBe('ijazah')
  })
})
