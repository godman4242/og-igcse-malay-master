// @vitest-environment jsdom
//
// P2-C4 regression: a session with exactly ONE due card must still show the
// end-of-session summary once that card is rated.
//
// The live bug: rate()'s setTimeout reads `sessionStats.reviewed > 0` from the
// CLOSURE captured when rate() was called — which is still 0 for the first (and
// only) review, because the setSessionStats update hasn't committed yet. With
// 2+ cards the guard passes by the second review; with exactly one card it
// never does, so the queue silently advances (nextCard) instead of surfacing
// the summary. Same harness as useStudySessionDoubleRate.test.js.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Node 25 ships a broken global localStorage stub; install an in-memory shim
// BEFORE the store module loads (zustand persist resolves the bare global).
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

// The summary path fires confetti, which calls canvas.getContext('2d') — null
// in jsdom. Stub the module so the summary branch doesn't throw.
vi.mock('../../lib/confetti', () => ({
  fireConfetti: vi.fn(),
  checkStreakMilestone: () => false,
}))

import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import useStore from '../../store/useStore'
import useStudySession from '../useStudySession'
import { createNewCardState, Rating } from '../../lib/fsrs'

const makeCard = (m, e) => ({
  m, e, t: 'TestDeck', p: 'n', ex: `${m} (${e}).`, mn: '',
  ...createNewCardState(),
})

const sessionRef = { current: null }
function Harness() {
  const session = useStudySession()
  useEffect(() => { sessionRef.current = session })
  return null
}

describe('useStudySession.rate — single-due-card summary (P2-C4)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    useStore.setState(s => ({
      cards: [makeCard('rumah', 'house')], // exactly ONE due card
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

  it('shows the summary after the only due card is rated', () => {
    expect(sessionRef.current.showSummary).toBe(false)
    act(() => { sessionRef.current.rate(Rating.Good) })
    act(() => { vi.advanceTimersByTime(400) }) // fire the 300 ms advance
    expect(sessionRef.current.showSummary).toBe(true)
    expect(sessionRef.current.sessionStats.reviewed).toBe(1)
  })
})
