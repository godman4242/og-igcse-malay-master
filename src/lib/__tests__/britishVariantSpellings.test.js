// The English MISSPELLINGS map (writingErrors.js:445) flags a hit as
// `severity: HIGH, type: 'spelling'` with the message `"X" is a common
// misspelling.` — a factual claim. This app teaches Cambridge IGCSE, i.e.
// BRITISH English, so a live British dictionary form must never appear there.
//
// Measured before the fix, each flagged HIGH:
//   orientated -> "oriented"   useable -> "usable"   writeable -> "writable"
//
// All three are dictionary-recognised forms, not errors:
//   • orientated — a Cambridge Dictionary headword and an OED headword, marked
//     chiefly UK; the standard British form of "oriented".
//   • useable    — recognised as a variant spelling by the major dictionaries.
//   • writeable  — Wiktionary: "Alternative spelling of writable", carrying no
//     nonstandard label; the -e- form is the commoner British one.
//
// DELIBERATELY STILL FLAGGED (checked, and the line is drawn on evidence):
//   • glamourous   — Merriam-Webster lists it only as a less-common variant and
//                    style guidance treats it as non-standard.
//   • knowledgable — Wiktionary labels it a RARE, American alternative form.
// Both would be marked by an IGCSE examiner, so pushing the student to the
// standard form is correct pedagogy. They stay.
//
// Separately: a suggestion must not hand a British student the AMERICAN form.
// `nieghbor -> neighbor` did exactly that, while the same map already maps
// `nieghbour -> neighbour` two lines away.

import { describe, it, expect } from 'vitest'
import { findIssues } from '../writingErrors.js'

const spellingFindings = (word) =>
  findIssues(`The report was ${word} in the opinion of the whole committee.`)
    .filter(f => f.type === 'spelling')

// Live British dictionary forms — flagging these tells a student their correct
// British English is a misspelling.
const BRITISH_VARIANTS = ['orientated', 'useable', 'writeable']

// Genuine typos that are not a word in any register — these must keep firing,
// or the fix has simply blunted the rule.
const REAL_TYPOS = ['recieved', 'seperation', 'definately', 'accomodation', 'occured']

describe('MISSPELLINGS map — never calls correct British English a misspelling', () => {
  for (const word of BRITISH_VARIANTS) {
    it(`does not flag "${word}"`, () => {
      const found = spellingFindings(word)
      expect(
        found.map(f => f.message),
        `"${word}" is a live British dictionary form, not a misspelling`
      ).toEqual([])
    })
  }

  it('still flags genuine typos', () => {
    const missed = REAL_TYPOS.filter(w => spellingFindings(w).length === 0)
    expect(missed, 'the rule has been blunted').toEqual([])
  })

  it('keeps flagging the rare/non-standard forms an IGCSE examiner would mark', () => {
    for (const word of ['glamourous', 'knowledgable']) {
      expect(spellingFindings(word).length, `"${word}" should still be flagged`).toBeGreaterThan(0)
    }
  })

  it('corrects the licence/license typo to the BRITISH noun', () => {
    // British English splits these: `licence` is the NOUN ("a driving licence"),
    // `license` is the VERB ("to license a vehicle"); American English uses
    // `license` for both. The map corrected the typo to the American form while
    // the app's own content teaches the British noun in three places —
    // dictionary.js:635 'lesen memandu' -> 'driving licence',
    // dictionaryEn.js:153 "driving licence", and academicEn.js:56
    // "It is not legal to drive without a licence." The noun is far the commoner
    // use in IGCSE writing, so that is what the typo resolves to.
    const found = spellingFindings('lisense')
    expect(found.length, '"lisense" is a real typo and must still be caught').toBeGreaterThan(0)
    expect(found[0].suggestion).toBe('licence')
  })

  it('never suggests an American -or spelling for a -our word', () => {
    const bad = []
    for (const typo of ['nieghbor', 'nieghbour', 'niegbour']) {
      for (const f of spellingFindings(typo)) {
        if (/\b\w*(?:neighbor|colour|honor|favor|behavior)\b/i.test(f.suggestion) && !/our\b/i.test(f.suggestion)) {
          bad.push(`${typo} -> ${f.suggestion}`)
        }
      }
    }
    expect(bad, 'a British-English app must not correct toward the American form').toEqual([])
  })
})
