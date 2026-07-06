// Data-correctness regression guards for the mistake pipeline — two bugs from
// the 2026-07-03 adversarial review's 🟡 PLAUSIBLE list, verified real here:
//
//  A) promoteMistakeToCard linked cross-language: `state.cards.find(c => c.m === m)`
//     matched a headword in ANY language, so an English vocab miss whose word is
//     spelled the same as an existing Malay card (a shared loanword like "radio")
//     linked to the MALAY card and never created an English one — the English
//     study deck silently never gains the card. Every other card-identity site
//     (addCards, reviewCardAction) already keys on (m, t, lang); this was the
//     lone outlier. cf. the shipped cloud card_key ::en fix (same collision class).
//
//  B) The 24h dedupe "bump" branch of addMistake refreshed attempts/timestamp/
//     severity but never reset `reviewed`. A mistake the learner marked fixed,
//     then got wrong AGAIN within 24h, stayed reviewed:true — so it vanished from
//     getFixUpQueue / getMistakeStats.total. Re-failing a "fixed" item is exactly
//     the hypercorrection signal the journal exists to surface; it must re-open.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'
import { cardsForLang, cardLang } from '../../lib/cardLang'
import { createNewCardState } from '../../lib/fsrs'

function resetStore() {
  useStore.setState(s => ({
    cards: [],
    mistakes: [],
    mistakeHistory: [],
    reviewedToday: 0,
    lastStudyDate: null,
    studyHistory: {},
    sync: { ...s.sync, queue: [] },
  }))
}

describe('A) promoteMistakeToCard is language-scoped (no cross-language link)', () => {
  beforeEach(resetStore)

  it('creates a NEW English card for an en miss even when a same-spelled Malay card exists', () => {
    // Seed a Malay card for the shared loanword "radio" (studied in a normal deck).
    useStore.setState({
      cards: [{ m: 'radio', e: 'radio', lang: 'ms', t: 'Objek', ...createNewCardState() }],
    })

    // English vocab miss for the same headword — Dictation.jsx / ClozeListening.jsx shape.
    useStore.getState().addMistake({
      type: 'vocab', source: 'test', language: 'en', category: 'vocab',
      severity: 'med', word: 'radio', correct: 'radio', given: '',
      surface: 'The radio is loud.',
    })

    const cards = useStore.getState().cards
    // The English deck must now contain a radio card…
    expect(cardsForLang(cards, 'en').some(c => c.m === 'radio')).toBe(true)
    // …and the original Malay radio card is untouched (exactly one ms radio card).
    expect(cardsForLang(cards, 'ms').filter(c => c.m === 'radio')).toHaveLength(1)

    // The mistake promoted to a real card, and it is the English one.
    const mistake = useStore.getState().mistakes.find(m => m.word === 'radio')
    expect(mistake.promotedCardId).toBe('radio')
    const promoted = cards.find(c => c.t === 'Mistakes' && c.m === 'radio')
    expect(promoted).toBeTruthy()
    expect(cardLang(promoted)).toBe('en')
  })

  it('still links to an existing SAME-language card instead of duplicating', () => {
    // A Malay card already exists; a Malay miss for it links, does not duplicate.
    useStore.setState({
      cards: [{ m: 'meja', e: 'table', lang: 'ms', t: 'Rumah', ...createNewCardState() }],
    })
    useStore.getState().addMistake({
      type: 'vocab', source: 'test', language: 'ms', category: 'vocab',
      severity: 'med', word: 'meja', correct: 'table', given: '', surface: 'Meja itu besar.',
    })
    // No duplicate Mistakes-deck card; the mistake links to the existing one.
    expect(useStore.getState().cards.filter(c => c.m === 'meja')).toHaveLength(1)
    expect(useStore.getState().mistakes.find(m => m.word === 'meja').promotedCardId).toBe('meja')
  })
})

describe('B) re-failing a reviewed mistake within 24h re-opens it', () => {
  beforeEach(resetStore)

  it('resets reviewed:false on a dedupe bump so it returns to the fix-up queue', () => {
    const mk = () => ({
      type: 'vocab', source: 'test', language: 'ms', category: 'vocab',
      severity: 'med', word: 'meja', correct: 'table', given: '', surface: 'Meja itu besar.',
    })

    useStore.getState().addMistake(mk())
    const id = useStore.getState().mistakes.find(m => m.word === 'meja').id
    useStore.getState().markMistakeReviewed(id)
    expect(useStore.getState().mistakes.find(m => m.id === id).reviewed).toBe(true) // sanity

    // Same mistake happens again within the 24h dedupe window → bump branch.
    useStore.getState().addMistake(mk())

    const after = useStore.getState().mistakes.find(m => m.id === id)
    expect(after.attempts).toBe(2)          // it bumped (not a new row)
    expect(after.reviewed).toBe(false)      // …and re-opened
    // Observable harm the bug caused: it never came back to the queue / active count.
    expect(useStore.getState().getFixUpQueue().some(m => m.word === 'meja')).toBe(true)
    expect(useStore.getState().getMistakeStats().total).toBeGreaterThan(0)
  })
})
