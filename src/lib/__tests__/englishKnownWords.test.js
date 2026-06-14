import { describe, it, expect } from 'vitest'
import {
  enLemmaCandidates,
  buildKnownEnglish,
  makeIsKnownEnglish,
} from '../englishKnownWords.js'

describe('enLemmaCandidates — light English de-inflection', () => {
  it('plural -s → base (cats → cat)', () => {
    expect(enLemmaCandidates('cats')).toContain('cat')
  })

  it('plural/3sg -es → base (boxes → box, wishes → wish)', () => {
    expect(enLemmaCandidates('boxes')).toContain('box')
    expect(enLemmaCandidates('wishes')).toContain('wish')
  })

  it('-ies → y (studies → study, parties → party)', () => {
    expect(enLemmaCandidates('studies')).toContain('study')
    expect(enLemmaCandidates('parties')).toContain('party')
  })

  it('past -ed → base, incl. e-restore and doubled consonant', () => {
    expect(enLemmaCandidates('walked')).toContain('walk')
    expect(enLemmaCandidates('used')).toContain('use')      // e-restore
    expect(enLemmaCandidates('stopped')).toContain('stop')  // undouble
    expect(enLemmaCandidates('studied')).toContain('study') // -ied → y
  })

  it('gerund -ing → base, incl. e-restore and doubled consonant', () => {
    expect(enLemmaCandidates('reading')).toContain('read')
    expect(enLemmaCandidates('making')).toContain('make')   // e-restore
    expect(enLemmaCandidates('running')).toContain('run')   // undouble
    expect(enLemmaCandidates('studying')).toContain('study')
  })

  it('comparative/superlative → base (faster → fast, biggest → big, happier → happy)', () => {
    expect(enLemmaCandidates('faster')).toContain('fast')
    expect(enLemmaCandidates('biggest')).toContain('big')
    expect(enLemmaCandidates('happier')).toContain('happy')
    expect(enLemmaCandidates('happiest')).toContain('happy')
  })

  it('adverb -ly → base (quickly → quick, happily → happy, easily → easy)', () => {
    expect(enLemmaCandidates('quickly')).toContain('quick')
    expect(enLemmaCandidates('happily')).toContain('happy')
    expect(enLemmaCandidates('easily')).toContain('easy')
  })

  it('possessive apostrophe-s strips to base', () => {
    expect(enLemmaCandidates("teacher's")).toContain('teacher')
  })

  it('returns an array and never throws on short / empty / non-string input', () => {
    expect(Array.isArray(enLemmaCandidates('as'))).toBe(true) // too short → no candidates
    expect(enLemmaCandidates('as')).toEqual([])
    expect(enLemmaCandidates('')).toEqual([])
    expect(enLemmaCandidates(null)).toEqual([])
    expect(enLemmaCandidates(undefined)).toEqual([])
  })

  it('only ever produces candidates ≥ 2 chars (no 1-char garbage stems)', () => {
    for (const w of ['ring', 'sing', 'wing', 'aged', 'ties']) {
      for (const c of enLemmaCandidates(w)) expect(c.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('buildKnownEnglish + makeIsKnownEnglish', () => {
  it('a frequency-list word is known directly', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ frequency: ['the', 'cat', 'run', 'study', 'quick'] }))
    expect(isKnown('the')).toBe(true)
    expect(isKnown('cat')).toBe(true)
  })

  it('an inflected form of a known base is known via the lemmatiser', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ frequency: ['cat', 'run', 'study', 'quick'] }))
    expect(isKnown('cats')).toBe(true)     // → cat
    expect(isKnown('running')).toBe(true)  // → run
    expect(isKnown('studies')).toBe(true)  // → study
    expect(isKnown('quickly')).toBe(true)  // → quick
  })

  it('an unknown word is not known', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ frequency: ['the', 'cat'] }))
    expect(isKnown('xenophobia')).toBe(false)
    expect(isKnown('zqxword')).toBe(false)
  })

  it('is case-insensitive', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ frequency: ['the', 'cat'] }))
    expect(isKnown('THE')).toBe(true)
    expect(isKnown('Cats')).toBe(true)
  })

  it('the dictionaryEn seed contributes known words; multi-word headwords split into components', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ seed: ['airplane', 'a little', 'air-conditioned'] }))
    expect(isKnown('airplane')).toBe(true)
    expect(isKnown('little')).toBe(true)            // split from 'a little'
    expect(isKnown('air-conditioned')).toBe(true)   // internal hyphen preserved
  })

  it("the learner's own English cards count as known (string or {m})", () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ cards: [{ m: 'computer' }, 'garden'] }))
    expect(isKnown('computer')).toBe(true)
    expect(isKnown('computers')).toBe(true) // inflected
    expect(isKnown('garden')).toBe(true)
  })

  it('blends all three sources into one known set', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({
      frequency: ['the'],
      seed: ['airplane'],
      cards: [{ m: 'computer' }],
    }))
    expect(isKnown('the')).toBe(true)
    expect(isKnown('airplane')).toBe(true)
    expect(isKnown('computer')).toBe(true)
  })

  it('is safe on empty / missing input (no throw, nothing known)', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({}))
    expect(isKnown('anything')).toBe(false)
    expect(isKnown('')).toBe(false)
    const isKnown2 = makeIsKnownEnglish(buildKnownEnglish())
    expect(isKnown2('anything')).toBe(false)
  })

  it('ignores 1-char and punctuation-only tokens', () => {
    const isKnown = makeIsKnownEnglish(buildKnownEnglish({ frequency: ['cat'] }))
    expect(isKnown('a')).toBe(false)
    expect(isKnown('!')).toBe(false)
  })
})
