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
import { score } from '../writingGrader'

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
    /* Malay — see the Q2/Q3 quotes above. */
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

// ── English ──────────────────────────────────────────────────────────────────
//
// Authority — Cambridge IGCSE 0510 (English as a Second Language) syllabus
// 2024–2026, Paper 2:
//   "The two writing exercises both require candidates to write 120–160 words of
//    continuous prose."
//   Exercise 5 — "Type of response: An informal email."
//   Exercise 6 — "Type of response: A formal/semi-formal article, report, essay,
//                 or review."
//   https://www.cambridgeinternational.org/Images/637160-2024-2026-syllabus.pdf
//
// Owner ruling 2026-08-14: the English grader optimises for 0510 ESL. The 0500-only
// genres keep their longer 0500 targets and are NOT pinned here.
//
// WHY THIS IS PINNED: before the change, a flawless 126-word article — exactly what
// 0510 asks for — scored band 3 of 6, because eng-article demanded 250 words and 126
// tripped the under-length hard cap. Gauntlet lane L1 round 3, docs/gauntlet/L1/.
const EN_0510_FORMATS = [
  'eng-email', 'eng-letter-informal', 'eng-article', 'eng-report', 'eng-review', 'eng-discursive',
]
const EN_0510_SHORTEST_COMPLIANT = 120

describe('IGCSE 0510 formats match the published syllabus word counts', () => {
  it.each(EN_0510_FORMATS)('%s targets 120–160 words', (id) => {
    expect(FORMATS_BY_ID[id].minWords).toBe(120)
    expect(FORMATS_BY_ID[id].maxWords).toBe(160)
  })

  it('a syllabus-compliant 0510 answer is never hit by the under-length hard cap', () => {
    for (const id of EN_0510_FORMATS) {
      expect(EN_0510_SHORTEST_COMPLIANT).toBeGreaterThanOrEqual(FORMATS_BY_ID[id].minWords * 0.6)
    }
  })

  it('a flawless 126-word article scores above the hard-capped band 3', () => {
    // Authored for this test — NOT candidate exam material. Correctly paragraphed,
    // no grammar errors, and inside the 120–160 word window 0510 specifies.
    const article = [
      'Should students be allowed to use phones in school? I believe they should, but only with clear rules.',
      '',
      'Firstly, a phone is a powerful learning tool. Students can look up a word they do not know, check a fact, or record homework instructions they might otherwise forget. Teachers can also share resources instantly.',
      '',
      'However, phones are distracting when they are used badly. Messages arrive constantly, and it is difficult to concentrate when a screen is lighting up beside you.',
      '',
      'Therefore, a sensible rule would be simple. Phones stay in bags during lessons unless a teacher asks for them, and they may be used freely at break. This respects both learning and independence.',
      '',
      'In conclusion, banning phones completely ignores their value. A fair rule teaches responsibility instead.',
    ].join('\n')

    const r = score(article, { lang: 'eng', format: 'eng-article' })
    expect(r.error).toBeUndefined()
    expect(r.words).toBeGreaterThanOrEqual(120)
    expect(r.words).toBeLessThanOrEqual(160)
    expect(r.subBands.accuracy).toBeGreaterThanOrEqual(5) // it really is clean English
    expect(r.band).toBeGreaterThan(3) // was exactly 3 while minWords was 250
  })

  it('0500-only genres keep their longer First Language targets', () => {
    // "Write about 250 to 350 words." / "Write about 350 to 450 words…"
    // https://www.cambridgeinternational.org/Images/718843-2027-specimen-paper-2.pdf
    for (const id of ['eng-narrative', 'eng-descriptive', 'eng-speech']) {
      expect(FORMATS_BY_ID[id].minWords).toBeGreaterThanOrEqual(250)
    }
  })
})
