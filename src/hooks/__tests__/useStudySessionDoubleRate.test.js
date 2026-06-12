// @vitest-environment jsdom
//
// P2-C5 regression: rapid double-rating a flashcard during the advance window
// must apply exactly ONE FSRS review.
//
// The live bug: `rate()` schedules the queue advance on a setTimeout (300 ms,
// or 5 s after Again) but nothing latches further calls in that window. The
// typed sub-modes guard via their feedback state (`if (reverseFb) return`),
// but the standard flashcard's rating buttons AND the live keyboard handler
// (FlashcardMode keys 1-4) call `rate()` directly — a double-tap or
// button+key combo reviews the same card twice, corrupting its FSRS
// stability/difficulty schedule and double-counting session stats.
//
// Note the two calls below happen across SEPARATE act() flushes: the second
// call uses the rate closure from the post-re-render generation, exactly like
// a keyboard press landing after the button tap's re-render. A latch that
// lives in per-render state would miss this; the fix must survive re-renders.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Node 25 ships a broken global localStorage stub (setItem throws without
// --localstorage-file) and zustand's persist resolves the BARE global — so a
// real in-memory shim must be in place BEFORE the store module loads.
// vi.hoisted runs ahead of the static imports below. Same workaround as
// authGuardSignInMergeIntegration.test.js.
vi.hoisted(() => {
  const mem = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)) },
      removeItem: (k) => { mem.delete(k) },
      clear: () => { mem.clear() },
      key: (i) => [...mem.keys()][i] ?? null,
      get length() { return mem.size },
    },
  })
})

import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import useStore from '../../store/useStore'
import useStudySession from '../useStudySession'
import { createNewCardState, Rating } from '../../lib/fsrs'

const makeCard = (m, e) => ({
  m, e, t: 'TestDeck', p: 'n', ex: `${m} (${e}).`, mn: '',
  ...createNewCardState(),
})

// Captured in an effect (not during render) to satisfy the react-hooks
// purity lint; act() flushes effects, so the ref is fresh after every act.
const sessionRef = { current: null }
function Harness() {
  const session = useStudySession()
  useEffect(() => { sessionRef.current = session })
  return null
}

describe('useStudySession.rate — double-rate latch (P2-C5)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    useStore.setState(s => ({
      cards: [makeCard('rumah', 'house'), makeCard('kucing', 'cat')],
      activeDeck: 'All',
      reviewedToday: 0,
      lastStudyDate: null,
      studyHistory: {},
      mistakes: [],
      confidenceLog: [],
      lastSessionAt: null,
      sync: { ...s.sync, queue: [] },
    }))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Harness)))
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
    vi.useRealTimers()
    sessionRef.current = null
  })

  it('two rapid rate() calls in the advance window apply exactly one FSRS review', () => {
    const studied = sessionRef.current.card.m
    act(() => { sessionRef.current.rate(Rating.Good) })
    // Second call lands before the 300 ms advance fires — e.g. keyboard "3"
    // right after the Good button. Uses the fresh post-re-render closure.
    act(() => { sessionRef.current.rate(Rating.Good) })

    const card = useStore.getState().cards.find(c => c.m === studied)
    expect(card.reps).toBe(1)
    expect(useStore.getState().reviewedToday).toBe(1)
    expect(sessionRef.current.sessionStats.reviewed).toBe(1)
  })

  it('rating works again once the advance window has elapsed', () => {
    const first = sessionRef.current.card.m
    act(() => { sessionRef.current.rate(Rating.Good) })
    act(() => { vi.advanceTimersByTime(400) })

    const second = sessionRef.current.card.m
    expect(second).not.toBe(first)
    act(() => { sessionRef.current.rate(Rating.Good) })

    expect(useStore.getState().cards.find(c => c.m === second).reps).toBe(1)
    expect(useStore.getState().reviewedToday).toBe(2)
  })

  it('latches the long (5 s) Again window too, then unlatches after it fires', () => {
    const studied = sessionRef.current.card.m
    act(() => { sessionRef.current.rate(Rating.Again) })
    act(() => { sessionRef.current.rate(Rating.Again) })

    const card = useStore.getState().cards.find(c => c.m === studied)
    expect(card.reps).toBe(1)
    expect(card.lapses).toBeLessThanOrEqual(1)
    expect(useStore.getState().reviewedToday).toBe(1)

    act(() => { vi.advanceTimersByTime(5100) })
    act(() => { sessionRef.current.rate(Rating.Good) })
    expect(useStore.getState().reviewedToday).toBe(2)
  })
})
