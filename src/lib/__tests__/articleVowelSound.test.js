// a/an is a SOUND rule, not a letter rule, and the grader's exception list was
// a prefix allow-list that got it wrong in BOTH directions.
//
// Direction 1 — "a" flagged as needing "an" (id `a-before-vowel`). Words spelled
// with a vowel letter but pronounced /juː/ were missing from the list, so
// ordinary IGCSE discursive vocabulary was flagged HIGH with an UNGRAMMATICAL
// suggestion. Measured before the fix:
//   'a unanimous' -> "an unanimous" · 'a eulogy' -> "an eulogy"
//   'a euphemism' -> "an euphemism" · 'a utopia'  -> "an utopia"
//   'a utility'   -> "an utility"   · 'a ewe'     -> "an ewe"
//   'a euro'      -> "an euro"
//
// Direction 2 — the mirror half the review never mentioned (id
// `an-before-consonant`). The entry `uni` also matches the NEGATIVE PREFIX
// un- + an i-stem, and `one` also matches `onerous`. Measured before the fix:
//   'an unimportant'  -> "a unimportant"  · 'an uninvited'    -> "a uninvited"
//   'an unidentified' -> "a unidentified" · 'an onerous'      -> "a onerous"
//
// Both are HIGH severity, and every HIGH also depresses the reported IGCSE band
// (writingGrader.js:254 divides high-severity count by word count), so a
// student writing correct English lost marks for it.
//
// The app contradicted itself too: its own article DRILL teaches
// "a university … 'University' begins with /j/" (grammarEng.js:51).
//
// This is a TRUTH SET rather than a regression list. Each word is checked in
// both article positions, so a fix that silences one direction by breaking the
// other cannot pass.

import { describe, it, expect } from 'vitest'
import { findIssues } from '../writingErrors.js'

// needsAn: true  -> "an X" is correct, "a X" is the error
//          false -> "a X" is correct, "an X" is the error
const TRUTH = [
  // /juː/ — written with a vowel letter, said with a consonant sound
  ['unanimous', false], ['uniform', false], ['unique', false], ['unit', false],
  ['union', false], ['university', false], ['universal', false], ['unicorn', false],
  ['unilateral', false], ['utility', false], ['utopia', false], ['utensil', false],
  ['usual', false], ['usage', false], ['useful', false], ['user', false],
  ['ubiquitous', false], ['uranium', false], ['urinal', false], ['uvula', false],
  ['eulogy', false], ['euphemism', false], ['euro', false], ['European', false],
  ['euthanasia', false], ['ewe', false], ['one', false], ['once', false],

  // genuine vowel sounds — "an" is correct
  ['umbrella', true], ['uncle', true], ['urgent', true], ['ugly', true],
  ['umpire', true], ['undergraduate', true], ['unusual', true], ['unfair', true],
  // the mirror trap: negative prefix un- + a vowel-initial stem
  ['unimportant', true], ['uninvited', true], ['unidentified', true],
  ['unequal', true], ['unable', true], ['unanswered', true],
  // `one` must not shadow these
  ['onerous', true], ['onion', true],
  // ordinary vowels + silent h
  ['apple', true], ['elephant', true], ['issue', true], ['orange', true],
  ['hour', true], ['honest', true], ['heir', true],
]

const articleFindings = (sentence) =>
  findIssues(sentence).filter(f => f.id === 'a-before-vowel' || f.id === 'an-before-consonant')

describe('a/an article rule — vowel SOUND, checked in both directions', () => {
  it('never flags the CORRECT article for any word in the truth set', () => {
    const wrong = []
    for (const [word, needsAn] of TRUTH) {
      const correct = `${needsAn ? 'an' : 'a'} ${word}`
      const found = articleFindings(`This is ${correct} example for the class.`)
      if (found.length) wrong.push(`"${correct}" wrongly flagged -> "${found[0].suggestion}"`)
    }
    expect(wrong, 'correct English flagged HIGH (a false positive costs the student band marks)').toEqual([])
  })

  it('still catches the genuinely WRONG article for the unambiguous cases', () => {
    // Restricted to words where the error is not debatable, so the suite stays
    // honest about the conservative "prefer a miss to a confident-wrong fix" bias.
    const mustCatch = ['apple', 'elephant', 'orange', 'hour', 'honest', 'umbrella', 'uncle']
    const missed = []
    for (const word of mustCatch) {
      const found = articleFindings(`This is a ${word} example for the class.`)
      if (!found.length) missed.push(`"a ${word}" not caught`)
    }
    expect(missed).toEqual([])
  })

  it('suggests a grammatical correction, never "an unanimous"', () => {
    const bad = []
    for (const [word, needsAn] of TRUTH) {
      const wrongArticle = `${needsAn ? 'a' : 'an'} ${word}`
      for (const f of articleFindings(`This is ${wrongArticle} example for the class.`)) {
        const fixed = `${needsAn ? 'an' : 'a'} ${word}`
        if (f.suggestion.toLowerCase() !== fixed.toLowerCase()) {
          bad.push(`"${wrongArticle}" -> "${f.suggestion}" (want "${fixed}")`)
        }
      }
    }
    expect(bad, 'the grader proposed an ungrammatical correction').toEqual([])
  })
})
