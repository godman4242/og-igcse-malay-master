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
//
// This suite also pins the two side-effects the kickoff flagged as "DON'T
// BREAK": the `card_reviewed` sync-event payload must carry `deck` (so a future
// refactor can't silently drop it and re-open the cloud half of the bug — same
// philosophy as syncEnqueue.test.js), and the `Again → addMistake` path must
// stay deck-scoped.

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

const snapshot = (card) => JSON.parse(JSON.stringify(card))

describe('reviewCardAction — deck-scoped rescheduling (P2-C1)', () => {
  beforeEach(() => {
    useStore.setState(s => ({
      cards: [makeCard('DeckA'), makeCard('DeckB')],
      reviewedToday: 0,
      lastStudyDate: null,
      studyHistory: {},
      mistakes: [],
      sync: { ...s.sync, queue: [] },
    }))
  })

  it('reschedules only the studied deck copy; the other deck stays byte-identical', () => {
    const before = useStore.getState().cards
    const aBefore = snapshot(before.find(c => c.t === 'DeckA'))
    const bBefore = snapshot(before.find(c => c.t === 'DeckB'))

    useStore.getState().reviewCardAction('rumah', 'DeckA', Rating.Good)

    const after = useStore.getState().cards
    const deckA = after.find(c => c.t === 'DeckA')
    const deckB = after.find(c => c.t === 'DeckB')

    // The studied copy advanced through FSRS (vs its OWN pre-review state).
    expect(deckA.reps).toBe(aBefore.reps + 1)
    expect(deckA.last_review).not.toBe(aBefore.last_review)
    expect(deckA.due).not.toBe(aBefore.due)

    // The OTHER deck's copy must be completely untouched.
    expect(deckB).toEqual(bBefore)
  })

  it('enqueues a card_reviewed sync event scoped to the studied deck', () => {
    useStore.getState().reviewCardAction('rumah', 'DeckA', Rating.Good)

    const events = useStore.getState().sync.queue.filter(e => e.type === 'card_reviewed')
    expect(events).toHaveLength(1)
    // Pins the store half of the cloud contract: cloudSync filters by m::t, so
    // the payload MUST carry the deck or the cloud sync silently mis-targets.
    expect(events[0].payload).toEqual({ malay: 'rumah', deck: 'DeckA', rating: Rating.Good })
  })

  it('keeps the Again → addMistake path deck-scoped (other deck untouched, miss still logged)', () => {
    const bBefore = snapshot(useStore.getState().cards.find(c => c.t === 'DeckB'))

    useStore.getState().reviewCardAction('rumah', 'DeckA', Rating.Again)

    const deckB = useStore.getState().cards.find(c => c.t === 'DeckB')
    expect(deckB).toEqual(bBefore)

    // The vocab miss is still recorded (the auto-promote-to-Mistakes pipeline).
    expect(useStore.getState().mistakes.some(mk => mk.word === 'rumah')).toBe(true)
  })
})
