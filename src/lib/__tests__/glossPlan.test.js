import { describe, it, expect } from 'vitest'
import { glossPlanFor } from '../glossPlan'

// The active studyLang signals the SOURCE language of a text the learner is
// importing / reading, which fixes the card-creation gloss direction. This is
// the keystone Phase-1.5 (Fork E / F5) decision, kept in ONE place so Import and
// the PDF reader can't diverge (mirrors localeFor / cardsForLang).
describe('glossPlanFor', () => {
  it('en → gloss an English source word into Malay; no Malay stemmer', () => {
    expect(glossPlanFor('en')).toEqual({ lang: 'en', from: 'en', to: 'ms', useStemmer: false })
  })
  it('ms → the legacy Malay→English path with the Malay stemmer', () => {
    expect(glossPlanFor('ms')).toEqual({ lang: 'ms', from: 'ms', to: 'en', useStemmer: true })
  })
  it('defaults missing/unknown studyLang to Malay (back-compat with pre-v34)', () => {
    const ms = { lang: 'ms', from: 'ms', to: 'en', useStemmer: true }
    expect(glossPlanFor(undefined)).toEqual(ms)
    expect(glossPlanFor('zz')).toEqual(ms)
  })
})
