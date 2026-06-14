import { describe, it, expect } from 'vitest'
import { normalizeSelection, isCardWorthy, detectLanguage, cardSidesFor } from '../selectionToCard'

describe('normalizeSelection', () => {
  it('returns null for empty / whitespace-only input', () => {
    expect(normalizeSelection('')).toBeNull()
    expect(normalizeSelection('   ')).toBeNull()
    expect(normalizeSelection('\n\t ')).toBeNull()
    expect(normalizeSelection(null)).toBeNull()
    expect(normalizeSelection(undefined)).toBeNull()
  })

  it('trims and reports a single word', () => {
    expect(normalizeSelection('  Makan. ')).toEqual({ term: 'Makan', wordCount: 1 })
  })

  it('strips leading/trailing punctuation but keeps inner hyphens', () => {
    expect(normalizeSelection('"jalan-jalan"')).toEqual({ term: 'jalan-jalan', wordCount: 1 })
    expect(normalizeSelection('(rumah),')).toEqual({ term: 'rumah', wordCount: 1 })
    expect(normalizeSelection('…makan?')).toEqual({ term: 'makan', wordCount: 1 })
  })

  it('collapses internal whitespace and counts words for a short phrase', () => {
    expect(normalizeSelection('  rumah    sakit ')).toEqual({ term: 'rumah sakit', wordCount: 2 })
  })

  it('keeps phrases up to 6 words', () => {
    expect(normalizeSelection('satu dua tiga empat lima enam')).toEqual({
      term: 'satu dua tiga empat lima enam', wordCount: 6,
    })
  })

  it('rejects long selections (a sentence, not a card)', () => {
    expect(normalizeSelection('satu dua tiga empat lima enam tujuh')).toBeNull()
  })

  it('rejects numbers-only / punctuation-only selections', () => {
    expect(normalizeSelection('123')).toBeNull()
    expect(normalizeSelection('  42 ')).toBeNull()
    expect(normalizeSelection('!!! ...')).toBeNull()
  })

  it('keeps a token that mixes letters and digits (e.g. covid-19)', () => {
    expect(normalizeSelection('covid-19')).toEqual({ term: 'covid-19', wordCount: 1 })
  })
})

describe('detectLanguage', () => {
  it("defaults to 'ms' — the app's primary language — for unknown / unmarked words", () => {
    // The failure mode that matters is an English word mis-translated ms→en;
    // a Malay (or ambiguous) word defaulting to ms is correct.
    expect(detectLanguage('xyzzy')).toBe('ms')
    expect(detectLanguage('')).toBe('ms')
  })

  it("recognizes known Malay dictionary words as 'ms'", () => {
    expect(detectLanguage('makan')).toBe('ms')
    expect(detectLanguage('Rumah')).toBe('ms') // case-insensitive
    expect(detectLanguage('buku')).toBe('ms')
  })

  it("flags English words by morphology as 'en'", () => {
    expect(detectLanguage('eating')).toBe('en')   // -ing
    expect(detectLanguage('education')).toBe('en') // -tion
    expect(detectLanguage('quickly')).toBe('en')   // -ly
    expect(detectLanguage('beautiful')).toBe('en') // -ful
  })

  it('uses the context sentence to decide direction when the lone word is unmarked', () => {
    // "weather" has no decisive suffix, but its English sentence is obvious.
    expect(detectLanguage('weather', { context: "What's the weather like today?" })).toBe('en')
    // A Malay sentence keeps an unmarked word on the ms side.
    expect(detectLanguage('cuaca', { context: 'Cuaca hari ini sangat panas.' })).toBe('ms')
  })

  it('lets a strongly-marked term override an opposite-language context', () => {
    // English suffix on the term wins even if the surrounding text is Malay.
    expect(detectLanguage('swimming', { context: 'Saya suka swimming pada hujung minggu.' })).toBe('en')
  })

  it('falls back to the pageLang hint only when nothing else is decisive', () => {
    expect(detectLanguage('blop', { pageLang: 'en' })).toBe('en')
    expect(detectLanguage('blop', { pageLang: 'ms' })).toBe('ms')
    expect(detectLanguage('blop')).toBe('ms') // no hint → default ms
  })
})

describe('cardSidesFor (Select-mode card direction follows studyLang, v34)', () => {
  // studyLang='ms' — the legacy Malay-front card; must stay byte-identical so a
  // Malay learner sees no change.
  it("ms learner selecting a Malay word → Malay-front card (m=term, e=gloss), lang 'ms'", () => {
    expect(cardSidesFor({ term: 'kucing', translation: 'cat', source: 'ms' }, 'ms'))
      .toEqual({ m: 'kucing', e: 'cat', lang: 'ms' })
  })

  it('ms learner selecting an English word → still Malay-front (m=gloss, e=term)', () => {
    // legacy behaviour: malay = translation, english = term
    expect(cardSidesFor({ term: 'cat', translation: 'kucing', source: 'en' }, 'ms'))
      .toEqual({ m: 'kucing', e: 'cat', lang: 'ms' })
  })

  // studyLang='en' — English-target card so it joins the v34 English (lang:'en')
  // deck in the right study direction (m = English headword, e = Malay L1 gloss).
  it("en learner selecting an English word → English-target card (m=term, e=Malay gloss), lang 'en'", () => {
    expect(cardSidesFor({ term: 'cat', translation: 'kucing', source: 'en' }, 'en'))
      .toEqual({ m: 'cat', e: 'kucing', lang: 'en' })
  })

  it('en learner selecting a Malay word → still English-target (m=English gloss, e=Malay term)', () => {
    expect(cardSidesFor({ term: 'kucing', translation: 'cat', source: 'ms' }, 'en'))
      .toEqual({ m: 'cat', e: 'kucing', lang: 'en' })
  })

  it("treats a missing/unknown studyLang as Malay (default) — byte-identical to 'ms'", () => {
    expect(cardSidesFor({ term: 'cat', translation: 'kucing', source: 'en' }, undefined))
      .toEqual({ m: 'kucing', e: 'cat', lang: 'ms' })
    expect(cardSidesFor({ term: 'cat', translation: 'kucing', source: 'en' }, 'xx'))
      .toEqual({ m: 'kucing', e: 'cat', lang: 'ms' })
  })

  it('invariant: m is always the target word in the active study language', () => {
    // m === the side in plan.from language, regardless of which side was selected.
    expect(cardSidesFor({ term: 'cat', translation: 'kucing', source: 'en' }, 'en').m).toBe('cat')   // en target
    expect(cardSidesFor({ term: 'kucing', translation: 'cat', source: 'ms' }, 'en').m).toBe('cat')   // en target (gloss)
    expect(cardSidesFor({ term: 'kucing', translation: 'cat', source: 'ms' }, 'ms').m).toBe('kucing') // ms target
    expect(cardSidesFor({ term: 'cat', translation: 'kucing', source: 'en' }, 'ms').m).toBe('kucing') // ms target (gloss)
  })
})

describe('isCardWorthy', () => {
  it('is true exactly when normalizeSelection returns a term', () => {
    expect(isCardWorthy('Makan')).toBe(true)
    expect(isCardWorthy('rumah sakit')).toBe(true)
    expect(isCardWorthy('')).toBe(false)
    expect(isCardWorthy('123')).toBe(false)
    expect(isCardWorthy('a b c d e f g')).toBe(false)
  })
})
