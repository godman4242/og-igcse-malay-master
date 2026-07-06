// @vitest-environment jsdom
//
// Review #12: a bilingual user can never finish a study session. The queue is
// studyLang-scoped (cardsForLang), but rate()'s end-of-session `remaining`
// check counted due cards of BOTH languages (deck filter only). So while the
// OTHER language still had a due card, the summary never fired and nextCard()
// spun forever. Same jsdom harness as useStudySessionSingleCard.test.js.

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

// The summary path fires confetti (canvas.getContext('2d') is null in jsdom).
vi.mock('../../lib/confetti', () => ({
  fireConfetti: vi.fn(),
  checkStreakMilestone: () => false,
}))

import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import useStore from '../../store/useStore'
import useStudySession from '../useStudySession'
import { createNewCardState, Rating } from '../../lib/fsrs'

const msCard = (m, e) => ({
  m, e, t: 'TestDeck', p: 'n', ex: `${m} (${e}).`, mn: '',
  ...createNewCardState(),
})
const enCard = (m, e) => ({
  m, e, t: 'TestDeck', p: 'n', ex: `${m} (${e}).`, mn: '', lang: 'en',
  ...createNewCardState(),
})

const sessionRef = { current: null }
function Harness() {
  const session = useStudySession()
  useEffect(() => { sessionRef.current = session })
  return null
}

describe('useStudySession.rate — bilingual session finish (#12)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    useStore.setState(s => ({
      // One Malay due card + one English due card. The Malay session queue must
      // ignore the English card entirely — including at the finish check.
      cards: [msCard('rumah', 'house'), enCard('house', 'rumah')],
      studyLang: 'ms',
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

  it('shows the summary after the last Malay card, even while an English card is due', () => {
    expect(sessionRef.current.due).toHaveLength(1) // queue is Malay-scoped
    expect(sessionRef.current.showSummary).toBe(false)
    act(() => { sessionRef.current.rate(Rating.Good) })
    act(() => { vi.advanceTimersByTime(400) }) // fire the 300 ms advance
    expect(sessionRef.current.showSummary).toBe(true)
    expect(sessionRef.current.sessionStats.reviewed).toBe(1)
  })
})
