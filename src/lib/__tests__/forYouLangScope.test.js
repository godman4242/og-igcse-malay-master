import { describe, it, expect } from 'vitest'
import {
  keepByLanguage,
  keepBySpeechLang,
  scopeMistakes,
  scopeSpeaking,
  scopeWriting,
  scopeGrammarCards,
} from '../forYouLangScope.js'

// The "For You" page already scopes its CARD slice to studyLang (cardsForLang),
// but the "Keep going" daily-plan + weak-spot signals (mistakes, fix-up queue,
// speaking/writing history, grammar drills) were cross-language. These pure
// scopers filter the language-TAGGED slices to the active study language so the
// whole page is one language (v34 no-mixing). Field conventions are verified
// against source: mistakes.language 'ms'|'en'; speaking/writing .lang
// 'eng'|'malay'; grammar drill ids 'eng-…' = English.

describe('forYouLangScope — language predicates', () => {
  it('keepByLanguage: ms|en field, untagged is legacy (Malay only)', () => {
    expect(keepByLanguage('en', 'en')).toBe(true)
    expect(keepByLanguage('ms', 'en')).toBe(false)
    expect(keepByLanguage('ms', 'ms')).toBe(true)
    expect(keepByLanguage('en', 'ms')).toBe(false)
    // untagged (pre-v34) → kept ONLY for Malay, never leaks into English
    expect(keepByLanguage(undefined, 'ms')).toBe(true)
    expect(keepByLanguage(undefined, 'en')).toBe(false)
  })

  it('keepBySpeechLang: eng|malay field (writing/speaking)', () => {
    expect(keepBySpeechLang('eng', 'en')).toBe(true)
    expect(keepBySpeechLang('malay', 'en')).toBe(false)
    expect(keepBySpeechLang('malay', 'ms')).toBe(true)
    expect(keepBySpeechLang('eng', 'ms')).toBe(false)
    expect(keepBySpeechLang(undefined, 'ms')).toBe(true)
    expect(keepBySpeechLang(undefined, 'en')).toBe(false)
  })
})

describe('forYouLangScope — slice scopers', () => {
  const mistakes = [
    { id: 1, language: 'ms', category: 'vocab' },
    { id: 2, language: 'en', category: 'vocab' },
    { id: 3, category: 'imbuhan' }, // untagged legacy
  ]

  it('scopeMistakes drops the other language (en keeps only en)', () => {
    expect(scopeMistakes(mistakes, 'en').map(m => m.id)).toEqual([2])
    // ms keeps ms + untagged legacy
    expect(scopeMistakes(mistakes, 'ms').map(m => m.id)).toEqual([1, 3])
  })

  it('scopeSpeaking / scopeWriting filter by eng|malay', () => {
    const hist = [
      { ts: 1, lang: 'malay', band: 4 },
      { ts: 2, lang: 'eng', band: 5 },
      { ts: 3, band: 3 }, // untagged legacy
    ]
    expect(scopeSpeaking(hist, 'en').map(e => e.ts)).toEqual([2])
    expect(scopeSpeaking(hist, 'ms').map(e => e.ts)).toEqual([1, 3])
    expect(scopeWriting(hist, 'en').map(e => e.ts)).toEqual([2])
    expect(scopeWriting(hist, 'ms').map(e => e.ts)).toEqual([1, 3])
  })

  it('scopeGrammarCards partitions by the eng- id prefix', () => {
    const g = {
      'imbuhan-3': { due: 'x' },
      'tense-7': { due: 'y' },
      'eng-tense-walked': { due: 'z' },
      'eng-articles-1': { due: 'w' },
    }
    expect(Object.keys(scopeGrammarCards(g, 'en')).sort()).toEqual(['eng-articles-1', 'eng-tense-walked'])
    expect(Object.keys(scopeGrammarCards(g, 'ms')).sort()).toEqual(['imbuhan-3', 'tense-7'])
  })

  it('tolerates non-array / non-object inputs', () => {
    expect(scopeMistakes(undefined, 'en')).toEqual([])
    expect(scopeSpeaking(null, 'ms')).toEqual([])
    expect(scopeGrammarCards(null, 'en')).toEqual({})
  })
})
