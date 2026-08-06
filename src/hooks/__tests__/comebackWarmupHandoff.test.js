// @vitest-environment jsdom
//
// Census A3 + A4 (2026-08-06): the "welcome back" warm-up hands off to the
// normal queue badly, in two separate ways.
//
// The session served cards from `sorted[cardIdx]`, where `sorted` is a memo
// keyed on `[activeDeck, inComebackWarmup]` — TWO different orderings behind
// ONE index:
//
//   A3  When the warm-up ends, `sorted` flips from the 5 high-stability
//       warm-up cards to the full priority queue, but `cardIdx` is still 5.
//       So the learner jumps to priority[5] and their FIVE MOST OVERDUE cards
//       — the whole point of the session — are silently never served.
//
//   A4  `buildComebackQueue` filters to `stability > 0` and slices 5, so it can
//       return FEWER than 5 (or zero). The gate was `sessionStats.reviewed < 5`,
//       a hardcoded count with no relation to what the queue can serve:
//         · shorter than 5 → `sorted[cardIdx % sorted.length]` wraps and the
//           same card is rated repeatedly, corrupting its FSRS stability;
//         · empty → `card` is null and `reviewed` can never reach 5, so the
//           gate NEVER lifts. Reachable: open Study once without rating
//           anything (that alone stamps `lastSessionAt`), return 8 days later.
//
// Contract pinned: the session is ONE queue — warm-up cards first, then the
// priority queue with those removed. No card is served twice, nothing is
// skipped at the hand-off, and a short/empty warm-up degrades to the normal
// queue instead of blocking.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: useStudySession } = await import('../useStudySession')
const { default: useStore } = await import('../../store/useStore')
const { createNewCardState } = await import('../../lib/fsrs')

const DAY = 86400000

// 10 cards, with the two orderings deliberately OPPOSED so a bad hand-off is
// unmistakable in the served order:
//   stability DESCENDING  → buildComebackQueue's top-5 warm-up is kata0..kata4
//   overdue-ness ASCENDING → sortByPriority's most-overdue-first is kata9..kata0
// If these two coincided, "skipped the hand-off" and "handed off correctly"
// would produce the same sequence and the test would be worthless.
// An unrated card must be EXACTLY what the app itself mints — hand-rolling one
// with `stability: 0, difficulty: 5` makes ts-fsrs throw "Invalid memory state"
// the moment it is reviewed. So take the real thing from createNewCardState()
// and only override what the test cares about.
const makeCard = (i, stability) => {
  const base = {
    m: `kata${i}`,
    e: `word ${i}`,
    t: 'Test',
    lang: 'ms',
    ...createNewCardState(),
    due: new Date(Date.now() - (i + 1) * DAY).toISOString(),
  }
  if (stability <= 0) return base
  return {
    ...base,
    stability,
    difficulty: 5,
    state: 2,
    reps: 3,
    elapsed_days: 1,
    scheduled_days: 1,
    last_review: new Date(Date.now() - 8 * DAY).toISOString(),
  }
}

const makeCards = (n = 10, stability = 30) =>
  Array.from({ length: n }, (_, i) => makeCard(i, stability ? stability - i : 0))

describe('Study comeback warm-up → priority queue hand-off (census A3/A4)', () => {
  let root, container, session

  const Probe = () => {
    session = useStudySession()
    return null
  }

  const mount = async (cards) => {
    useStore.setState({
      cards,
      studyLang: 'ms',
      activeDeck: 'All',
      // 8 days ago → isComeback() is true (its threshold is >= 7).
      lastSessionAt: new Date(Date.now() - 8 * DAY).toISOString(),
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Probe)))
  }

  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; session = null })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
    root = null
  })

  // Rate the current card Good and let rate()'s 300 ms advance timer run.
  const rateGood = async () => {
    await act(async () => { session.rate(3) })
    await act(async () => { await new Promise(r => setTimeout(r, 400)) })
  }

  it('is in warm-up on arrival, and the warm-up serves the high-stability cards', async () => {
    await mount(makeCards())
    expect(session.comeback).toBe(true)
    expect(session.inComebackWarmup).toBe(true)
    // Highest stability, not most overdue.
    expect(session.card.m).toBe('kata0')
  })

  it('serves every card exactly once across the warm-up hand-off', async () => {
    await mount(makeCards())
    const served = []
    for (let i = 0; i < 8; i++) {
      expect(session.card, `a card should be served at step ${i}`).toBeTruthy()
      served.push(session.card.m)
      await rateGood()
    }
    expect(new Set(served).size, `no card may be served twice — got ${served.join(' ')}`)
      .toBe(served.length)
  })

  it('does not skip the most-overdue cards when the warm-up ends', async () => {
    await mount(makeCards())
    const served = []
    for (let i = 0; i < 8; i++) {
      served.push(session.card.m)
      await rateGood()
    }
    // Warm-up is kata0..kata4 (top 5 by stability). The moment it ends, the
    // next card must be the most-overdue card that has NOT been served yet —
    // kata9 — not whatever happens to sit at the old index in the new ordering.
    expect(served.slice(0, 5)).toEqual(['kata0', 'kata1', 'kata2', 'kata3', 'kata4'])
    expect(served[5], `hand-off must not skip — served: ${served.join(' ')}`).toBe('kata9')
  })

  it('degrades to the normal queue when no card qualifies for a warm-up (A4 hard block)', async () => {
    // Every card unrated → stability 0 → buildComebackQueue returns []. The old
    // gate (`reviewed < 5`) could never lift, leaving Study with no card at all.
    await mount(makeCards(10, 0))
    expect(session.inComebackWarmup, 'an empty warm-up must not hold the session').toBe(false)
    expect(session.card, 'Study must still serve a card').toBeTruthy()
  })

  it('never re-serves one card to pad a short warm-up (A4 FSRS corruption)', async () => {
    // Only 2 cards have stability, so the warm-up is 2 long, not 5.
    const cards = makeCards(6, 0)
    cards[0] = makeCard(0, 40)
    cards[1] = makeCard(1, 30)
    await mount(cards)
    const served = []
    for (let i = 0; i < 4; i++) {
      served.push(session.card.m)
      await rateGood()
    }
    expect(new Set(served).size, `short warm-up must not repeat a card — got ${served.join(' ')}`)
      .toBe(served.length)
  })
})
