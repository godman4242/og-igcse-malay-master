// END-RESULT regression guard for the "close the listening loop" pipeline.
//
// WHY THIS EXISTS (the 2026-06-13 green-but-broken bug, generalised):
// glossFor shipped guarding Array.isArray(dictionary) while src/data/dictionary.js
// is an OBJECT MAP, so it returned '' for every word. Dictation / ClozeListening
// misses were still JOURNALED (the side-effect the e2e asserted) but never carried
// a gloss, so the store's auto-promotion gate dropped them and NO FSRS card was
// ever created (the END RESULT no test asserted). Build + 1100 unit tests + lint +
// an e2e were all green while the feature was 100% dead.
//
// This suite drives the ACTUAL store action through the REAL dictionary + REAL
// glossFor and asserts the user-visible end result: a card lands in the
// 'Mistakes' deck. It fails against the old array-only glossFor (gloss '' →
// no promotion → no card), so it locks the fix at the level that matters.
//
// Mirrors the Dictation.jsx / ClozeListening.jsx call shape exactly (vocab /
// med / language 'ms' / correct = glossFor(word, DICTIONARY)).

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'
import { glossFor } from '../../lib/listeningMistakes'
import DICTIONARY from '../../data/dictionary'

// Exactly how Dictation.jsx:73 / ClozeListening.jsx:76 build the mistake.
function listeningMiss(word, { surface = 'Saya minum air setiap pagi.' } = {}) {
  return {
    type: 'vocab',
    source: 'dictation-test',
    language: 'ms',
    category: 'vocab',
    severity: 'med',
    word,
    given: '',
    correct: glossFor(word, DICTIONARY),
    surface,
    note: '[Dictation] missed while transcribing',
  }
}

describe('listening-mistake → FSRS promotion (end-to-end, real dictionary)', () => {
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

  it('auto-promotes a dictionary-known Malay miss to a card in the Mistakes deck', () => {
    const word = 'air'
    // Sanity: the real pipeline must produce a gloss. If glossFor regresses to
    // array-only against the object-map dictionary, this is the first thing to go.
    expect(glossFor(word, DICTIONARY)).toBe('water')

    useStore.getState().addMistake(listeningMiss(word))

    const promoted = useStore.getState().cards.find(c => c.t === 'Mistakes' && c.m === word)
    expect(promoted).toBeTruthy()
    expect(promoted.e).toBe('water')

    const mistake = useStore.getState().mistakes.find(m => m.word === word)
    expect(mistake).toBeTruthy()
    expect(mistake.promotedCardId).toBe(word) // promotion actually linked back
  })

  it('leaves a NON-dictionary miss journal-only (no phantom card)', () => {
    const word = 'belalbuztik' // invented — absent from the real dictionary
    expect(glossFor(word, DICTIONARY)).toBe('')

    useStore.getState().addMistake(listeningMiss(word, { surface: 'Contoh ayat.' }))

    expect(useStore.getState().cards.find(c => c.t === 'Mistakes')).toBeFalsy()
    // ...but it is still journaled so the learner sees it in the Mistake Journal.
    expect(useStore.getState().mistakes.find(m => m.word === word)).toBeTruthy()
  })

  it('does NOT promote an English miss even when a gloss exists (Malay-only gate)', () => {
    // language 'en' must never seed a Malay FSRS card.
    useStore.getState().addMistake({ ...listeningMiss('air'), language: 'en' })
    expect(useStore.getState().cards.find(c => c.t === 'Mistakes')).toBeFalsy()
    expect(useStore.getState().mistakes.find(m => m.word === 'air')).toBeTruthy()
  })
})
