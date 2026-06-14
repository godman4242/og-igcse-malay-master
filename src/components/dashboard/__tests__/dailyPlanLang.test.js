// @vitest-environment jsdom
//
// The Dashboard "Your plan for today" (DailyPlan) must be single-language (v34):
// an English session's plan must NOT count Malay activity, and vice-versa. This
// mirrors the just-shipped ForYou "Keep going" scoping (forYouLangScope) — the
// SAME pure buildDailyPlan, scoped at the DailyPlan call site (the builder is
// untouched + byte-identical). MOUNTS the real component because the leak lives
// in the component's wiring, not the builder. The store persists to localStorage,
// so the in-memory shim is installed BEFORE the store module loads (mirrors
// forYouLang.test.js).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, MemoryRouter, DailyPlan, useStore
let root, host

// An overdue, already-reviewed card: reviewed → DailyPlan's hasReviewed gate
// passes; overdue → a 'review' task exists so the section renders regardless of
// the fix-up, which keeps the fix-up assertion meaningful (not trivially null).
const reviewedDueCard = (m, e, lang) => ({
  m, e, lang, t: 'Saved', ex: `${m} — ${e}`,
  due: new Date(Date.now() - 1e6).toISOString(),
  last_review: new Date(Date.now() - 864e5).toISOString(),
  stability: 1, difficulty: 5, state: 2, reps: 2, lapses: 0,
})

const fixupMistake = (language, surface) => ({
  id: `m-${language}`, type: 'vocab', source: 'study', language, category: 'vocab',
  severity: 'med', surface, word: surface, given: 'x', correct: surface,
  reviewed: false, attempts: 1, timestamp: Date.now() - 3600000,
})

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
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
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ default: DailyPlan } = await import('../DailyPlan'))
  ;({ default: useStore } = await import('../../../store/useStore'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = () => act(async () => {
  root.render(React.createElement(MemoryRouter, null, React.createElement(DailyPlan)))
})

describe('DailyPlan follows studyLang', () => {
  it('an English session hides a Malay fix-up task', async () => {
    useStore.setState({
      studyLang: 'en',
      cards: [reviewedDueCard('airplane', 'kapal terbang', 'en')],
      mistakes: [fixupMistake('ms', 'rumah')],
    })
    await mount()
    // The section still renders (the overdue English card → a review task)…
    expect(host.textContent).toContain('Your plan for today')
    // …but the Malay mistake must NOT drive the English plan.
    expect(host.textContent).not.toContain('Fix your top mistakes')
  })

  it('a same-language English mistake DOES drive the English plan', async () => {
    useStore.setState({
      studyLang: 'en',
      cards: [reviewedDueCard('airplane', 'kapal terbang', 'en')],
      mistakes: [fixupMistake('en', 'house')],
    })
    await mount()
    expect(host.textContent).toContain('Fix your top mistakes')
  })

  it('a Malay session keeps a Malay fix-up (byte-identical)', async () => {
    useStore.setState({
      studyLang: 'ms',
      cards: [reviewedDueCard('rumah', 'house', 'ms')],
      mistakes: [fixupMistake('ms', 'salah')],
    })
    await mount()
    expect(host.textContent).toContain('Fix your top mistakes')
  })
})
