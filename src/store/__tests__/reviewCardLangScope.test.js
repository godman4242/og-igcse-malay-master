// v34 card-identity regression: reviewCardAction / removeCard must scope by
// LANGUAGE too, not just (m, t).
//
// addCards dedupes on (m, t, lang) (useStore.addCards), so a bilingual learner
// can legitimately hold the SAME spelling in both decks — e.g. the loanword
// "hotel" as a Malay card AND an English card, both tagged t:'Travel'.
// reviewCardAction/removeCard keyed by (m, t) ONLY, so:
//   - reviewing the English "hotel" ALSO rescheduled the Malay "hotel" (map
//     matched both) — the wrong-language card's FSRS schedule silently drifted;
//   - the Again→addMistake `.find(m,t)` could log the wrong-language card;
//   - removeCard deleted BOTH language copies.
// Fix: thread an optional `lang` through both (default-preserving — omitted lang
// keeps the exact (m,t) behavior the deck-scope tests pin).

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'
import { createNewCardState, Rating } from '../../lib/fsrs'
import { cardLang } from '../../lib/cardLang'

function makeCard(lang) {
  return {
    m: 'hotel', e: lang === 'en' ? 'a place to stay' : 'hotel', t: 'Travel',
    lang, p: 'n', ex: 'the hotel is big.', mn: '',
    ...createNewCardState(),
  }
}

const snapshot = (card) => JSON.parse(JSON.stringify(card))

describe('reviewCardAction / removeCard — language-scoped (v34)', () => {
  beforeEach(() => {
    useStore.setState(s => ({
      cards: [makeCard('ms'), makeCard('en')],
      reviewedToday: 0,
      lastStudyDate: null,
      studyHistory: {},
      mistakes: [],
      sync: { ...s.sync, queue: [] },
    }))
  })

  it('reschedules ONLY the studied language copy; the other language stays byte-identical', () => {
    const msBefore = snapshot(useStore.getState().cards.find(c => cardLang(c) === 'ms'))

    useStore.getState().reviewCardAction('hotel', 'Travel', Rating.Good, 'en')

    const after = useStore.getState().cards
    const en = after.find(c => cardLang(c) === 'en')
    const ms = after.find(c => cardLang(c) === 'ms')

    // The English copy advanced through FSRS…
    expect(en.reps).toBe(1)
    expect(en.last_review).toBeTruthy()
    // …and the Malay copy is completely untouched.
    expect(ms).toEqual(msBefore)
  })

  it('carries lang in the card_reviewed sync payload when provided', () => {
    useStore.getState().reviewCardAction('hotel', 'Travel', Rating.Good, 'en')
    const events = useStore.getState().sync.queue.filter(e => e.type === 'card_reviewed')
    expect(events).toHaveLength(1)
    expect(events[0].payload).toEqual({ malay: 'hotel', deck: 'Travel', rating: Rating.Good, lang: 'en' })
  })

  it('removeCard(lang) deletes ONLY that language copy', () => {
    useStore.getState().removeCard('hotel', 'Travel', 'en')
    const cards = useStore.getState().cards
    expect(cards).toHaveLength(1)
    expect(cardLang(cards[0])).toBe('ms')
  })

  it('lang-less calls keep the (m,t) behavior the deck-scope tests pin (default-preserving)', () => {
    // No lang → both same-(m,t) copies are still matched (the pre-v34 contract).
    useStore.getState().reviewCardAction('hotel', 'Travel', Rating.Good)
    const cards = useStore.getState().cards
    expect(cards.every(c => c.reps === 1)).toBe(true)
    const events = useStore.getState().sync.queue.filter(e => e.type === 'card_reviewed')
    expect(events[0].payload).toEqual({ malay: 'hotel', deck: 'Travel', rating: Rating.Good })
  })
})
