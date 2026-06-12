// @vitest-environment jsdom
//
// Calibration loop — "You were sure, but…" panel: the end-of-session summary
// lists THIS session's certain-but-wrong words (hypercorrection targets) with
// their correct meanings, and stays hidden when the session had none.
// Scope = sessionStats.startTime; older certain-wrong entries and in-session
// low-confidence misses must NOT appear.

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

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import useStore from '../../store/useStore'
import SessionSummary from '../study/SessionSummary'

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

const makeSession = (startTime) => ({
  sessionStats: { startTime, endTime: Date.now(), reviewed: 4, correct: 2 },
  activeDeck: 'All',
  restartSession: vi.fn(),
})

describe('SessionSummary — "You were sure, but…" panel', () => {
  let root, host, sessionStart

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    sessionStart = Date.now() - 10 * MIN
    useStore.setState({
      cards: [
        { m: 'rumah', e: 'house', t: 'TestDeck' },
        { m: 'lama', e: 'old', t: 'TestDeck' },
        { m: 'kerja', e: 'work', t: 'TestDeck' },
      ],
      confidenceLog: [],
      sessionFeedback: [{ ts: Date.now(), deck: 'All', accuracy: 50, perceived: 'right' }],
      reflections: [],
      dailyGoal: 20,
      reviewedToday: 4,
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  const render = async (session) => act(async () =>
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(SessionSummary, { session })),
    ))

  it('lists this session\'s certain-but-wrong words with their meanings', async () => {
    useStore.setState({
      confidenceLog: [
        { word: 'rumah', level: 3, correct: false, ts: sessionStart + 2 * MIN }, // in
        { word: 'lama', level: 3, correct: false, ts: sessionStart - 2 * DAY },  // old session → out
        { word: 'kerja', level: 1, correct: false, ts: sessionStart + 3 * MIN }, // unsure → out
      ],
    })
    await render(makeSession(sessionStart))
    const panel = host.querySelector('[data-testid="hypercorrection-panel"]')
    expect(panel).not.toBeNull()
    expect(panel.textContent).toContain('You were sure, but')
    expect(panel.textContent).toContain('rumah')
    expect(panel.textContent).toContain('house')
    expect(panel.textContent).not.toContain('lama')
    expect(panel.textContent).not.toContain('kerja')
  })

  it('stays hidden when the session had no certain-but-wrong answers', async () => {
    useStore.setState({
      confidenceLog: [
        { word: 'rumah', level: 3, correct: true, ts: sessionStart + 2 * MIN },
      ],
    })
    await render(makeSession(sessionStart))
    expect(host.querySelector('[data-testid="hypercorrection-panel"]')).toBeNull()
  })
})
