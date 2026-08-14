// Pins the `lang` vocabulary contract shared by score() / listFormats().
//
// WHY THIS EXISTS: during Gauntlet lane L0 (docs/gauntlet/L0/README.md §8.0) a
// measurement harness passed lang:'english' instead of lang:'eng'. That fails
// SILENTLY AND ASYMMETRICALLY — score() branches on `lang === 'malay'`, so
// 'english' still takes the English grading path and every number looks
// plausible, but listFormats() filters on `f.lang === lang`, so 'english'
// matched ZERO formats and every script came back format:null. It produced a
// published-but-false "English format detection is completely broken" finding.
//
// The two accepted values are 'eng' and 'malay' — exactly what the app passes
// (src/hooks/useWritingEvaluator.js, src/pages/ExamRehearsal.jsx).
import { describe, it, expect } from 'vitest'
import { score } from '../writingGrader'
import { listFormats, FORMATS } from '../writingFormats'

// Authored for this test — NOT candidate exam material.
const INFORMAL_LETTER = `Dear Sam,

How are you doing these days? Hope you are keeping well and that school is not
being too hard on you this term. I wanted to tell you about the trip my family
took to the coast last month, because I think you would have loved every minute
of it. We left early on Saturday morning and drove for about three hours, and
the weather stayed bright the whole way there.

We spent the first afternoon swimming and the second walking along the cliffs,
which was tiring but worth it for the view. In the evening we cooked outside and
talked until it got dark. I have not laughed that much in a long time.

Write back soon and tell me what you have been up to.

Take care,
Alex`

describe('writingGrader lang vocabulary contract', () => {
  it("accepts exactly 'eng' and 'malay' — the values the app passes", () => {
    const langs = [...new Set(FORMATS.map((f) => f.lang))].sort()
    expect(langs).toEqual(['eng', 'malay'])
  })

  it('listFormats returns a non-empty catalogue for both accepted values', () => {
    expect(listFormats('eng').length).toBeGreaterThan(0)
    expect(listFormats('malay').length).toBeGreaterThan(0)
  })

  it("listFormats('english') matches NOTHING — the exact trap that broke L0", () => {
    // Documents the footgun rather than hiding it: a near-miss string is not a
    // synonym, it is a silent empty catalogue.
    expect(listFormats('english')).toHaveLength(0)
  })

  it("score() with lang:'eng' DETECTS a format on a plain informal letter", () => {
    const r = score(INFORMAL_LETTER, { lang: 'eng', format: 'auto' })
    expect(r.error).toBeUndefined()
    expect(r.format).toBe('eng-letter-informal')
  })

  it("score() with a near-miss lang silently loses format detection (regression witness)", () => {
    // Same text, same everything, only the lang string differs. If a future
    // change makes this detect a format anyway, that is an IMPROVEMENT and this
    // expectation should be updated — but it must never change unnoticed.
    const r = score(INFORMAL_LETTER, { lang: 'english', format: 'auto' })
    expect(r.format).toBeNull()
  })
})
