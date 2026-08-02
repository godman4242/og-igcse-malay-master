// @vitest-environment jsdom
//
// END-RESULT regression guard for V7 (2026-08-03): a missed non-FSRS micro-task
// (micro-write / micro-speak) logged its mistake with NO `language`, and the
// store defaults an absent language to 'ms'. So an ENGLISH word the learner
// missed was journaled as Malay and auto-promoted into the MALAY deck as
// { m:'weather', e:'cuaca', lang:'ms' } — gloss-inverted for that deck, and
// invisible in the learner's own English session.
//
// The fix must read `cardLang(task.card)` — the single source of truth for the
// deck partition — NOT `task.card.lang || studyLang`. The second test below is
// the reason: at the pre-v34 edge an untagged card (which cardLang documents as
// Malay) would fall through to studyLang and push a MALAY word into the English
// deck — the exact mirror of the bug being fixed. That state is reachable, since
// a persisted session survives a studyLang switch.
//
// Harness pattern: useInterleavedSessionHypercorrection.test.js. Tasks are
// injected through the persisted-session path so the assertion does not depend
// on buildSession's internal task mix.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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
import { cardsForLang } from '../../lib/cardLang'

const PERSIST_KEY = 'smart-session-state'

const card = (m, e, lang) => ({
  m, e, t: 'TestDeck', p: 'n', ex: `${m} (${e}).`, mn: '',
  ...(lang ? { lang } : {}),
  ...createNewCardState(),
})

// micro-write is card-driven but NOT an FSRS task, so completeTask takes the
// addMistake branch rather than reviewCardAction.
const microWrite = (c) => ({ type: 'micro-write', card: c, prompt: `Tulis ayat: ${c.m}`, weight: 3, source: 'thematic-followup' })

const sessionRef = { current: null }
function Harness() {
  const session = useInterleavedSession({ includeSpeaking: false, targetMinutes: 8 })
  useEffect(() => { sessionRef.current = session })
  return null
}

describe('useInterleavedSession — a missed micro-task stays in its own deck', () => {
  let root, host

  async function runMissedTask(focal, studyLang) {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      tasks: [microWrite(focal)],
      cycles: [],
      cursor: 0,
      results: [],
      startTime: Date.now() - 60000,
    }))
    useStore.setState({ cards: [focal], activeDeck: 'All', mistakes: [], studyLang })

    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root.render(React.createElement(Harness)))
    await act(async () => { sessionRef.current.resumeSession() })
    await act(async () => { sessionRef.current.completeTask({ correct: false }) })
  }

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.removeItem(PERSIST_KEY)
    sessionRef.current = null
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    host?.remove()
    root = null
  })

  it('journals a missed ENGLISH word as English and promotes it to the English deck', async () => {
    await runMissedTask(card('weather', 'cuaca', 'en'), 'en')

    const mistake = useStore.getState().mistakes.find(m => m.word === 'weather')
    expect(mistake, 'the miss is journaled').toBeTruthy()
    expect(mistake.language).toBe('en')

    // The word is already in the English deck, so promotion LINKS to that card.
    // Pre-fix it looked for a Malay 'weather', found none, and minted a second
    // copy in the wrong partition — hence the ms assertion below.
    expect(mistake.promotedCardId).toBe('weather')

    const cards = useStore.getState().cards
    expect(cardsForLang(cards, 'ms').some(c => c.m === 'weather')).toBe(false)
    expect(cardsForLang(cards, 'en').filter(c => c.m === 'weather')).toHaveLength(1)
  })

  // Pins the ⚠️ correction itself: an untagged (pre-v34) card is MALAY by
  // definition, even while studyLang is 'en'. `task.card.lang || studyLang`
  // would tag it 'en' here and mint the mirror-image bug.
  it('treats an untagged pre-v34 card as Malay even when studyLang is English', async () => {
    await runMissedTask(card('makan', 'to eat'), 'en')

    const mistake = useStore.getState().mistakes.find(m => m.word === 'makan')
    expect(mistake, 'the miss is journaled').toBeTruthy()
    expect(mistake.language).toBe('ms')

    const cards = useStore.getState().cards
    expect(cardsForLang(cards, 'en').some(c => c.m === 'makan')).toBe(false)
  })
})
