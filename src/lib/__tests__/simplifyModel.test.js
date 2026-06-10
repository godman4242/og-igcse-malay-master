// Option F — L2 (Malay) sentence simplification: pure prompt-builder + parser.
// Spec: docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md (F4, F5)
// Plan: docs/superpowers/plans/2026-06-10-option-f-l2-simplification.md (Task 1)

import { describe, it, expect } from 'vitest'
import { buildSimplifyPrompt, parseSimplifyResponse } from '../simplifyModel'

const SENTENCE = 'Walaupun hujan lebat melanda kawasan itu, mereka tetap meneruskan perjalanan ke sekolah.'

describe('buildSimplifyPrompt', () => {
  it('returns a {systemPrompt, messages} shape callInstruct accepts', () => {
    const p = buildSimplifyPrompt(SENTENCE)
    expect(typeof p.systemPrompt).toBe('string')
    expect(Array.isArray(p.messages)).toBe(true)
    expect(p.messages).toHaveLength(1)
    expect(p.messages[0].role).toBe('user')
  })

  it('puts the exact sentence in the user message', () => {
    const p = buildSimplifyPrompt(SENTENCE)
    expect(p.messages[0].content).toContain(SENTENCE)
  })

  it('instructs: simpler Malay, no English, return only the sentence', () => {
    const sys = buildSimplifyPrompt(SENTENCE).systemPrompt.toLowerCase()
    expect(sys).toMatch(/simpler|simple|mudah/)
    expect(sys).toMatch(/malay|melayu/)
    expect(sys).toMatch(/no english|not.*english|without english|do not use english/)
    expect(sys).toMatch(/only the/)
  })

  it('caps the response with a small maxTokens (one sentence, not an essay)', () => {
    const p = buildSimplifyPrompt(SENTENCE)
    expect(p.maxTokens).toBeGreaterThan(0)
    expect(p.maxTokens).toBeLessThanOrEqual(300)
  })
})

describe('parseSimplifyResponse', () => {
  const original = SENTENCE

  it('flags blank / whitespace / nullish as empty', () => {
    expect(parseSimplifyResponse('', original).status).toBe('empty')
    expect(parseSimplifyResponse('   \n\t ', original).status).toBe('empty')
    expect(parseSimplifyResponse(null, original).status).toBe('empty')
    expect(parseSimplifyResponse(undefined, original).status).toBe('empty')
  })

  it('accepts a clean simpler-Malay rewrite', () => {
    const r = parseSimplifyResponse('Hujan sangat lebat, tetapi mereka tetap pergi ke sekolah.', original)
    expect(r.status).toBe('ok')
    expect(r.text).toBe('Hujan sangat lebat, tetapi mereka tetap pergi ke sekolah.')
  })

  it('strips wrapping quotes of common styles', () => {
    const cases = [
      '"Hujan lebat tetapi mereka tetap pergi ke sekolah."',
      '“Hujan lebat tetapi mereka tetap pergi ke sekolah.”',
      '「Hujan lebat tetapi mereka tetap pergi ke sekolah.」',
      "'Hujan lebat tetapi mereka tetap pergi ke sekolah.'",
    ]
    for (const raw of cases) {
      const r = parseSimplifyResponse(raw, original)
      expect(r.status).toBe('ok')
      expect(r.text).toBe('Hujan lebat tetapi mereka tetap pergi ke sekolah.')
    }
  })

  it('strips leading labels like "Simpler:", "Jawapan:", "Ayat mudah:"', () => {
    const cases = [
      'Simpler: Hujan lebat tetapi mereka tetap pergi ke sekolah.',
      'Jawapan: Hujan lebat tetapi mereka tetap pergi ke sekolah.',
      'Ayat mudah: Hujan lebat tetapi mereka tetap pergi ke sekolah.',
    ]
    for (const raw of cases) {
      const r = parseSimplifyResponse(raw, original)
      expect(r.status).toBe('ok')
      expect(r.text).toBe('Hujan lebat tetapi mereka tetap pergi ke sekolah.')
    }
  })

  it('drops a preamble line ending in ":" and keeps the sentence', () => {
    const raw = 'Berikut ialah ayat yang lebih mudah:\nHujan lebat tetapi mereka tetap pergi ke sekolah.'
    const r = parseSimplifyResponse(raw, original)
    expect(r.status).toBe('ok')
    expect(r.text).toBe('Hujan lebat tetapi mereka tetap pergi ke sekolah.')
  })

  it('strips markdown bold wrapping', () => {
    const r = parseSimplifyResponse('**Hujan lebat tetapi mereka tetap pergi ke sekolah.**', original)
    expect(r.status).toBe('ok')
    expect(r.text).toBe('Hujan lebat tetapi mereka tetap pergi ke sekolah.')
  })

  it('flags an unchanged echo of the input (case/space/punct-insensitive)', () => {
    expect(parseSimplifyResponse(original, original).status).toBe('echo')
    expect(parseSimplifyResponse(original.toUpperCase(), original).status).toBe('echo')
    expect(parseSimplifyResponse(`  ${original}  `, original).status).toBe('echo')
    expect(parseSimplifyResponse(original.replace(/,/g, ''), original).status).toBe('echo')
    expect(parseSimplifyResponse(`"${original}"`, original).status).toBe('echo')
  })

  it('flags English-dominated output', () => {
    const r = parseSimplifyResponse('Even though it rained heavily, they still went to school.', original)
    expect(r.status).toBe('english')
    const r2 = parseSimplifyResponse('The sentence means they continued the journey to school.', original)
    expect(r2.status).toBe('english')
  })

  it('keeps short marker-less Malay (fails open to ok, not english)', () => {
    const r = parseSimplifyResponse('Ali makan nasi goreng setiap pagi.', original)
    expect(r.status).toBe('ok')
  })

  it('never throws on junk input', () => {
    expect(() => parseSimplifyResponse(12345, original)).not.toThrow()
    expect(() => parseSimplifyResponse({}, original)).not.toThrow()
    expect(() => parseSimplifyResponse([], original)).not.toThrow()
    expect(() => parseSimplifyResponse('x', null)).not.toThrow()
    expect(parseSimplifyResponse(12345, original).status).toBeDefined()
  })
})
