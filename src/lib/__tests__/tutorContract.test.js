import { describe, it, expect } from 'vitest'
import { parseTutorControl, enforceLength } from '../tutorContract'

describe('parseTutorControl', () => {
  it('returns text unchanged and null control when no control block', () => {
    expect(parseTutorControl('Jawapannya ialah "makan".')).toEqual({
      text: 'Jawapannya ialah "makan".', control: null,
    })
  })
  it('strips a trailing control block and parses it', () => {
    const raw = 'Guna "mem-" di sini.\n⟦CTRL⟧{"gave_answer":true,"next_action":"try one"}'
    const out = parseTutorControl(raw)
    expect(out.text).toBe('Guna "mem-" di sini.')
    expect(out.control).toEqual({ gave_answer: true, next_action: 'try one' })
  })
  it('is defensive: malformed control JSON is stripped, control=null', () => {
    const out = parseTutorControl('Answer.\n⟦CTRL⟧{not json')
    expect(out.text).toBe('Answer.')
    expect(out.control).toBeNull()
  })
  it('handles non-string input', () => {
    expect(parseTutorControl(undefined)).toEqual({ text: '', control: null })
  })
})

describe('enforceLength', () => {
  it('leaves a normal explain answer untouched', () => {
    const t = 'Guna "mem-". Contoh: "memasak". ✓'
    expect(enforceLength(t, { mode: 'explain' })).toEqual({ text: t, truncated: false })
  })
  it('truncates a runaway explain answer at a sentence boundary', () => {
    const t = Array.from({ length: 300 }, (_, i) => (i % 12 === 11 ? 'end.' : 'word')).join(' ')
    const out = enforceLength(t, { mode: 'explain' })
    expect(out.truncated).toBe(true)
    expect(out.text.split(/\s+/).length).toBeLessThanOrEqual(221)
    expect(out.text.trim().endsWith('.') || out.text.trim().endsWith('…')).toBe(true)
  })
  it('applies a tighter budget in retrieval mode', () => {
    const t = Array.from({ length: 120 }, () => 'kata').join(' ')
    const out = enforceLength(t, { mode: 'retrieval' })
    expect(out.truncated).toBe(true)
    expect(out.text.split(/\s+/).length).toBeLessThanOrEqual(61)
  })
  it('falls back to ellipsis when the only sentence boundary is too early to retain ~40%', () => {
    const t = 'Short. ' + Array.from({ length: 100 }, () => 'kata').join(' ')
    const out = enforceLength(t, { mode: 'retrieval' })
    expect(out.truncated).toBe(true)
    expect(out.text.endsWith('…')).toBe(true)
  })
  it('cuts at a deep sentence boundary when it retains ~40%+', () => {
    const t = Array.from({ length: 100 }, (_, i) => (i === 45 ? 'end.' : 'kata')).join(' ')
    const out = enforceLength(t, { mode: 'retrieval' })
    expect(out.truncated).toBe(true)
    expect(out.text.trim().endsWith('.')).toBe(true)
  })
  it('does not truncate at exactly the budget', () => {
    const t = Array.from({ length: 60 }, () => 'kata').join(' ')
    expect(enforceLength(t, { mode: 'retrieval' })).toEqual({ text: t, truncated: false })
  })
  it('falls back to the explain budget for an unknown mode', () => {
    const t = Array.from({ length: 100 }, () => 'kata').join(' ')
    expect(enforceLength(t, { mode: 'zzz' }).truncated).toBe(false)
  })
  it('normalizes non-string input to empty string', () => {
    expect(enforceLength(undefined, { mode: 'explain' })).toEqual({ text: '', truncated: false })
  })
})
