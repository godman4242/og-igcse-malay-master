// Unit suite for the PURE vision-OCR prompt module (Phase 2 "Sharper read").
// Locks: the transcription prompt asks for VERBATIM text only (no commentary /
// translation / fences), the ocrLang toggle becomes a one-line language hint,
// and cleanVisionText strips a wrapping markdown fence a model might add
// despite instructions. No DOM, no network — mirrors ocr.js purity.
// Spec: docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md (Fork 5)
// Plan: docs/superpowers/plans/2026-06-11-past-paper-ocr-vision-rung.md (Task 1)

import { describe, it, expect } from 'vitest'
import { buildVisionMessages, cleanVisionText, VISION_SYSTEM_PROMPT } from '../ocrVision'

describe('buildVisionMessages', () => {
  it('returns a single user message whose text asks for verbatim transcription', () => {
    const { systemPrompt, messages } = buildVisionMessages({ lang: 'ms' })
    expect(systemPrompt).toBe(VISION_SYSTEM_PROMPT)
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content.toLowerCase()).toMatch(/verbatim|transcribe/)
  })

  it('forbids commentary, translation, and markdown fences in the instruction', () => {
    const { messages } = buildVisionMessages({ lang: 'ms' })
    const content = messages[0].content.toLowerCase()
    expect(content).toMatch(/no commentary/)
    expect(content).toMatch(/no translation/)
    expect(content).toMatch(/fence/)
  })

  it('adds a Malay/English language hint from lang', () => {
    expect(buildVisionMessages({ lang: 'ms' }).messages[0].content).toMatch(/Malay/i)
    expect(buildVisionMessages({ lang: 'en' }).messages[0].content).toMatch(/English/i)
    expect(buildVisionMessages({ lang: 'en' }).messages[0].content).not.toMatch(/Malay/i)
  })

  it('omits the hint for an unknown/missing lang instead of guessing', () => {
    for (const args of [{}, { lang: 'xx' }, { lang: null }]) {
      const content = buildVisionMessages(args).messages[0].content
      expect(content).not.toMatch(/page is in/i)
      expect(content.toLowerCase()).toMatch(/transcribe/)
    }
  })
})

describe('cleanVisionText', () => {
  it('strips wrapping markdown code fences but keeps inner text', () => {
    expect(cleanVisionText('```\nSaya suka.\n```')).toBe('Saya suka.')
  })

  it('strips a language-tagged fence too', () => {
    expect(cleanVisionText('```text\nNasi lemak.\n```')).toBe('Nasi lemak.')
  })

  it('keeps multi-paragraph structure (blank lines) intact for the {pages} split', () => {
    expect(cleanVisionText('Saya suka.\n\nNasi lemak.')).toBe('Saya suka.\n\nNasi lemak.')
  })

  it('trims surrounding whitespace, leaves inner text untouched', () => {
    expect(cleanVisionText('  Ayat mudah.  \n')).toBe('Ayat mudah.')
  })

  it('non-string → empty string', () => {
    expect(cleanVisionText(null)).toBe('')
    expect(cleanVisionText(undefined)).toBe('')
    expect(cleanVisionText(42)).toBe('')
  })
})
