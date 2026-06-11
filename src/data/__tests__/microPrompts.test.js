import { describe, it, expect } from 'vitest'
import { TEMPLATES, getRandomPrompt } from '../microPrompts'

// Issue 4b — Smart Session prompt-language consistency. The app has NO English
// vocabulary (every card is a Malay word), so the Smart Session is a Malay-vocab
// engine. The only thing that leaked English was these practice micro-prompts:
// the writing/speaking template lists each carried one English template that
// getRandomPrompt could fire at random, so a Malay-vocab session would
// occasionally show an English instruction. All templates must be Malay.

// Words that only appear in an English instruction (never in the Malay ones,
// which use Tulis/Bina/Gunakan/Cakap/Beri + perkataan/ayat).
const ENGLISH_MARKERS = /\b(write|say|sentence|spoken|naturally|context)\b/i

describe('microPrompts — consistent Malay (Issue 4b)', () => {
  it('every writing template renders Malay (no English instruction)', () => {
    expect(TEMPLATES.writing.length).toBeGreaterThan(0)
    for (const t of TEMPLATES.writing) {
      const out = t('rumah')
      expect(out).toContain('rumah')
      expect(out).not.toMatch(ENGLISH_MARKERS)
    }
  })

  it('every speaking template renders Malay (no English instruction)', () => {
    expect(TEMPLATES.speaking.length).toBeGreaterThan(0)
    for (const t of TEMPLATES.speaking) {
      const out = t('rumah')
      expect(out).toContain('rumah')
      expect(out).not.toMatch(ENGLISH_MARKERS)
    }
  })

  it('getRandomPrompt never returns an English prompt across the full index range', () => {
    const orig = Math.random
    try {
      for (let i = 0; i < 20; i++) {
        Math.random = () => i / 20 // walk every template index for any list length
        expect(getRandomPrompt('writing', 'rumah')).not.toMatch(ENGLISH_MARKERS)
        expect(getRandomPrompt('speaking', 'rumah')).not.toMatch(ENGLISH_MARKERS)
      }
    } finally {
      Math.random = orig
    }
  })

  it('falls back to a (Malay) writing template for an unknown category', () => {
    const out = getRandomPrompt('bogus', 'rumah')
    expect(out).toContain('rumah')
    expect(out).not.toMatch(ENGLISH_MARKERS)
  })
})
