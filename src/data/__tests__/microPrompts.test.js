import { describe, it, expect } from 'vitest'
import { TEMPLATES, TEMPLATES_EN, getRandomPrompt } from '../microPrompts'

// Issue 4b — Smart Session prompt-language consistency. ORIGINALLY (pre-v34) the
// app had NO English vocabulary, so the Smart Session was a Malay-vocab engine and
// every micro-prompt had to be Malay (a stray English template would surface an
// English instruction mid-Malay-session). v34 shipped True English study mode, so
// the Smart Session is now bilingual: it scopes to the active `studyLang`. The
// invariant is now PER-LANGUAGE PURITY — a Malay session shows only Malay prompts,
// an English session shows only English prompts (the same immersion rationale that
// kept the Malay set all-Malay now keeps the English set all-English).

// Words that only appear in an English instruction (never in the Malay ones,
// which use Tulis/Bina/Gunakan/Cakap/Beri + perkataan/ayat).
const ENGLISH_MARKERS = /\b(write|say|sentence|spoken|naturally|context)\b/i
// Malay instruction words that must NEVER appear in an English prompt.
const MALAY_MARKERS = /\b(tulis|bina|gunakan|cakap|beri|perkataan|ayat|menggunakan|lisan|seharian)\b/i

describe('microPrompts — Malay path stays all-Malay (Issue 4b, lang="ms" default)', () => {
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

describe('microPrompts — English path is all-English (v34, lang="en")', () => {
  it('every English writing template renders English (no Malay instruction)', () => {
    expect(TEMPLATES_EN.writing.length).toBeGreaterThan(0)
    for (const t of TEMPLATES_EN.writing) {
      const out = t('achieve')
      expect(out).toContain('achieve')
      expect(out).toMatch(ENGLISH_MARKERS)
      expect(out).not.toMatch(MALAY_MARKERS)
    }
  })

  it('every English speaking template renders English (no Malay instruction)', () => {
    expect(TEMPLATES_EN.speaking.length).toBeGreaterThan(0)
    for (const t of TEMPLATES_EN.speaking) {
      const out = t('achieve')
      expect(out).toContain('achieve')
      expect(out).toMatch(ENGLISH_MARKERS)
      expect(out).not.toMatch(MALAY_MARKERS)
    }
  })

  it('getRandomPrompt(..., "en") returns an English prompt across the full index range', () => {
    const orig = Math.random
    try {
      for (let i = 0; i < 20; i++) {
        Math.random = () => i / 20 // walk every template index for any list length
        expect(getRandomPrompt('writing', 'achieve', 'en')).not.toMatch(MALAY_MARKERS)
        expect(getRandomPrompt('writing', 'achieve', 'en')).toContain('achieve')
        expect(getRandomPrompt('speaking', 'achieve', 'en')).not.toMatch(MALAY_MARKERS)
        expect(getRandomPrompt('speaking', 'achieve', 'en')).toContain('achieve')
      }
    } finally {
      Math.random = orig
    }
  })

  it('omitted / "ms" lang stays byte-identical to the Malay path', () => {
    const orig = Math.random
    try {
      Math.random = () => 0 // deterministic: first template each list
      expect(getRandomPrompt('writing', 'rumah')).toBe(getRandomPrompt('writing', 'rumah', 'ms'))
      expect(getRandomPrompt('writing', 'rumah', 'ms')).toMatch(/tulis/i)
      expect(getRandomPrompt('speaking', 'rumah', 'ms')).not.toMatch(ENGLISH_MARKERS)
    } finally {
      Math.random = orig
    }
  })

  it('falls back to the Malay set for an unknown lang', () => {
    const orig = Math.random
    try {
      Math.random = () => 0
      expect(getRandomPrompt('writing', 'rumah', 'zz')).toBe(getRandomPrompt('writing', 'rumah', 'ms'))
    } finally {
      Math.random = orig
    }
  })
})
