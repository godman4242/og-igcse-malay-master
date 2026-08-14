// Pins the five IGCSE 0546 Paper 4 writing formats to the word counts the
// SYLLABUS actually specifies. Content truth, not style preference.
//
// Authority — Cambridge IGCSE Malay 0546 syllabus for 2025–2027, Paper 4, p.24:
//   Q2 "Candidates complete a directed writing task in about 80–90 words on a
//       familiar, everyday topic."
//   Q3 "Candidates choose between two tasks (an email/letter and an article/blog)
//       and complete one of these in about 130–140 words."
//   https://www.cambridgeinternational.org/Images/664637-2025-2027-syllabus.pdf
//
// WHY THIS IS PINNED: these formats used to demand 150–250 words (250–350 for an
// article) — above Cambridge's MAXIMUM for the longest Malay task, roughly double
// the real ask. minWords drives the content sub-band AND the on-screen advice
// ("Kembangkan kepada N+ perkataan"), so the app both marked correctly-sized work
// down and coached students toward the wrong exam length. Found by measuring the
// grader against 22 examiner-marked scripts — Gauntlet lane L0, docs/gauntlet/L0/.
import { describe, it, expect } from 'vitest'
import { FORMATS_BY_ID } from '../writingFormats'

// The syllabus's own ceiling for ANY 0546 Paper 4 writing task.
const SYLLABUS_MAX_WORDS = 140

const Q3_FORMATS = ['ms-surat-rasmi', 'ms-surat-tidak-rasmi', 'ms-email', 'ms-rencana']

describe('IGCSE 0546 Paper 4 formats match the published syllabus word counts', () => {
  it('Q2 directed writing (Karangan Berpandu) targets about 80–90 words', () => {
    const f = FORMATS_BY_ID['ms-directed']
    expect(f.minWords).toBe(80)
    expect(f.maxWords).toBe(90)
  })

  it.each(Q3_FORMATS)('Q3 %s targets about 130–140 words', (id) => {
    const f = FORMATS_BY_ID[id]
    expect(f.minWords).toBe(130)
    expect(f.maxWords).toBe(140)
  })

  it('no 0546 Paper 4 format demands more than the syllabus maximum', () => {
    for (const id of ['ms-directed', ...Q3_FORMATS]) {
      expect(FORMATS_BY_ID[id].minWords).toBeLessThanOrEqual(SYLLABUS_MAX_WORDS)
    }
  })

  it('a syllabus-compliant answer is never hit by the under-length hard cap', () => {
    // writingGrader caps `overall` at the content sub-band when
    // `wordCount < minWords * 0.6`. A student who writes exactly what Cambridge
    // asks for must never trip that.
    const cases = [
      { id: 'ms-directed', shortestCompliant: 80 },
      ...Q3_FORMATS.map((id) => ({ id, shortestCompliant: 130 })),
    ]
    for (const { id, shortestCompliant } of cases) {
      const hardCapBelow = FORMATS_BY_ID[id].minWords * 0.6
      expect(shortestCompliant).toBeGreaterThanOrEqual(hardCapBelow)
    }
  })
})
