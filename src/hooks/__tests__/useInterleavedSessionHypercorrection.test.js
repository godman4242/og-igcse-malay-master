// @vitest-environment jsdom
//
// Calibration loop — smart-study wiring: useInterleavedSession must feed the
// store's certain-but-wrong words (getHypercorrectionTargets) into
// buildSession, so a word the learner was SURE about but got WRONG leads the
// next Smart Session even when it isn't FSRS-due and isn't in the mistake
// journal. Harness pattern: useStudySessionSingleCard.test.js.

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

import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import useStore from '../../store/useStore'
import useInterleavedSession from '../useInterleavedSession'
import { createNewCardState } from '../../lib/fsrs'

const dueCard = (m, e) => ({
  m, e, t: 'TestDeck', p: 'n', ex: `${m} (${e}).`, mn: '',
  ...createNewCardState(),
})

// Far-future due + high stability: invisible to every existing focal tier.
const notDueCard = (m, e) => ({
  ...dueCard(m, e),
  due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  stability: 60,
  state: 2,
})

const sessionRef = { current: null }
function Harness() {
  const session = useInterleavedSession({ includeSpeaking: false, targetMinutes: 8 })
  useEffect(() => { sessionRef.current = session })
  return null
}

describe('useInterleavedSession — hypercorrection boost wiring', () => {
  let root, host

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.removeItem('smart-session-state')
    useStore.setState({
      cards: [dueCard('mudah', 'easy'), notDueCard('sukar', 'difficult')],
      activeDeck: 'All',
      mistakes: [],
      confidenceLog: [
        { word: 'sukar', level: 3, correct: false, ts: Date.now() - 60 * 60 * 1000 },
      ],
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  it('a certain-but-wrong word leads the session even when not due', async () => {
    await act(async () => root.render(React.createElement(Harness)))
    await act(async () => { sessionRef.current.startSession() })
    expect(sessionRef.current.cycles[0].focalWord).toBe('sukar')
  })
})
