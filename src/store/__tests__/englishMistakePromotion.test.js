// END-RESULT regression guard for the True English study mode's mistake → FSRS
// loop (F5 follow-up, 2026-06-14). The English half of the app's #1 principle —
// "every mistake routes into spaced retrieval". Mirrors
// listeningMistakePromotion.test.js but for studyLang='en': a missed English
// vocab item, glossed to Malay, must auto-promote to a lang:'en' card in the
// 'Mistakes' deck so it joins the English study session's Due queue.
//
// Drives the REAL store action through the REAL English seed (dictionaryEn) +
// REAL glossFor, asserting the user-visible end result (a lang:'en' card lands in
// the English partition). Mirrors the Dictation.jsx / ClozeListening.jsx EN call
// shape exactly (vocab / med / language 'en' / correct = glossFor(word,
// DICTIONARY_EN)) — the same green-but-broken trap the Malay sibling guards.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'
import { glossFor } from '../../lib/listeningMistakes'
import { cardsForLang } from '../../lib/cardLang'
import DICTIONARY_EN from '../../data/dictionaryEn'

// Exactly how Dictation.jsx / ClozeListening.jsx build an English miss (F5):
// the English word is glossed to Malay off the reversed seed dictionary.
function enListeningMiss(word, { surface = 'The weather is hot today.', category = 'vocab' } = {}) {
  return {
    type: 'vocab',
    source: 'dictation-en-test',
    language: 'en',
    category,
    severity: 'med',
    word,
    given: '',
    correct: glossFor(word, DICTIONARY_EN),
    surface,
    note: '[Dictation] missed while transcribing',
  }
}

describe('English mistake → FSRS promotion (end-to-end, real English seed)', () => {
  beforeEach(() => {
    useStore.setState(s => ({
      cards: [],
      mistakes: [],
      reviewedToday: 0,
      lastStudyDate: null,
      studyHistory: {},
      sync: { ...s.sync, queue: [] },
    }))
  })

  it('auto-promotes a seed-known English miss to a lang:en card in the Mistakes deck', () => {
    const word = 'weather'
    // Sanity: the real pipeline must produce a Malay gloss from the English seed.
    // If the seed regresses, this is the first thing to go.
    expect(glossFor(word, DICTIONARY_EN)).toBe('cuaca')

    useStore.getState().addMistake(enListeningMiss(word))

    const promoted = useStore.getState().cards.find(c => c.t === 'Mistakes' && c.m === word)
    expect(promoted).toBeTruthy()
    expect(promoted.e).toBe('cuaca')   // Malay gloss — the English deck is English→Malay
    expect(promoted.lang).toBe('en')   // joins the English deck, never Malay

    // It actually lands in the English partition the Study session reads…
    expect(cardsForLang(useStore.getState().cards, 'en').some(c => c.m === word)).toBe(true)
    // …and NOT in the Malay one.
    expect(cardsForLang(useStore.getState().cards, 'ms').some(c => c.m === word)).toBe(false)

    const mistake = useStore.getState().mistakes.find(m => m.word === word)
    expect(mistake.promotedCardId).toBe(word) // promotion linked back
  })

  it('leaves an English miss with NO seed gloss journal-only (no phantom card)', () => {
    const word = 'zzqwordnotinseed' // invented — absent from the reversed seed
    expect(glossFor(word, DICTIONARY_EN)).toBe('')

    useStore.getState().addMistake(enListeningMiss(word, { surface: 'An example sentence.' }))

    expect(useStore.getState().cards.find(c => c.t === 'Mistakes')).toBeFalsy()
    // ...but it is still journaled so the learner sees it in the Mistake Journal.
    expect(useStore.getState().mistakes.find(m => m.word === word)).toBeTruthy()
  })

  it('does NOT promote an English imbuhan-category mistake (English has no imbuhan)', () => {
    // Decision #1: en promotes vocab ONLY. imbuhan is Malay-only morphology.
    useStore.getState().addMistake(enListeningMiss('weather', { category: 'imbuhan' }))
    expect(useStore.getState().cards.find(c => c.t === 'Mistakes')).toBeFalsy()
    expect(useStore.getState().mistakes.find(m => m.word === 'weather')).toBeTruthy()
  })

  it('still auto-promotes Malay vocab AND imbuhan misses (byte-identical Malay path)', () => {
    // Guard: adding the en branch must not regress the shipped Malay behavior.
    useStore.getState().addMistake({
      type: 'vocab', source: 't', language: 'ms', category: 'vocab',
      severity: 'med', word: 'kucing', correct: 'cat', given: '', surface: 'Kucing itu comel.',
    })
    useStore.getState().addMistake({
      type: 'grammar', source: 't', language: 'ms', category: 'imbuhan',
      severity: 'med', word: 'memakan', correct: 'to eat', given: '', surface: 'Dia memakan nasi.',
    })
    const malayMistakeCards = cardsForLang(useStore.getState().cards, 'ms').filter(c => c.t === 'Mistakes')
    expect(malayMistakeCards.some(c => c.m === 'kucing')).toBe(true)
    expect(malayMistakeCards.some(c => c.m === 'memakan')).toBe(true)
  })
})
