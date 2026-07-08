import { describe, it, expect } from 'vitest'
import { parseTutorControl } from '../tutorContract'

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
