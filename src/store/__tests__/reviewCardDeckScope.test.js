// P2-C1 regression: reviewCardAction must reschedule ONLY the studied deck's
// copy of a word — not every deck that happens to hold the same word.
//
// Card identity everywhere else in the app is `m::t` (addCards dedupe,
// removeCard(malay, deck), getFilteredCards). reviewCardAction matched by word
// only (`c.m !== malay`), so a word saved in two decks (e.g. a topic pack + the
// auto-promoted 'Mistakes' deck) had BOTH copies rescheduled on every review —
// the learner's FSRS schedule silently drifted from reality. DEMONSTRATED.
//
// Fix: thread `deck` through the signature (mirrors removeCard) and scope the
// map by `c.m === malay && c.t === deck`. NO silent word-only fallback — that
// just reintroduces the bug.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'
import { createNewCardState, Rating } from '../../lib/fsrs'

function makeCard(t) {
  return {
    m: 'rumah', e: 'house', t, p: 'n',
    ex: 'rumah saya besar.', mn: '',
    ...createNewCardState(),
  }
}

describe('reviewCardAction — deck-scoped rescheduling (P2-C1)', () => {
  beforeEach(() => {
    useStore.setState({
      cards: [makeCard('DeckA'), makeCard('DeckB')],
      reviewedToday: 0,
      lastStudyDate: null,
      studyHistory: {},
    })
  })

  it('reschedules only the studied deck copy; the other deck stays byte-identical', () => {
    const before = useStore.getState().cards
    const snapshotB = JSON.parse(JSON.stringify(before.find(c => c.t === 'DeckB')))

    useStore.getState().reviewCardAction('rumah', 'DeckA', Rating.Good)

    const after = useStore.getState().cards
    const deckA = after.find(c => c.t === 'DeckA')
    const deckB = after.find(c => c.t === 'DeckB')

    // The studied copy advanced through FSRS.
    expect(deckA.reps).toBe(1)
    expect(deckA.last_review).not.toBeNull()
    expect(deckA.due).not.toBe(snapshotB.due)

    // The OTHER deck's copy must be completely untouched.
    expect(deckB).toEqual(snapshotB)
  })
})
