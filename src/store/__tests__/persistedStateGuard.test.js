// 2026-09-28 bug hunt U4: a saved state with a wrong-typed field ("cards" not a
// list) or a malformed card (null, or no word) crashed EVERY route on load —
// a permanent white screen with no way to reach Settings. A restored backup can
// carry exactly that (isValidBackup only checks that `cards` is an array).
// Hydration must repair types instead of trusting them.
import { describe, it, expect } from 'vitest'

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

const { mergePersistedState } = await import('../useStore')
const current = { cards: [], mistakes: [], streak: { count: 0, last: '' }, theme: 'dark', examDate: null, act: () => 1 }

describe('mergePersistedState', () => {
  it('replaces a wrong-typed list or object with its default', () => {
    const out = mergePersistedState({ cards: { a: 1 }, mistakes: 'x', streak: null }, current)
    expect(out.cards).toEqual([])
    expect(out.mistakes).toEqual([])
    expect(out.streak).toEqual({ count: 0, last: '' })
  })

  it('drops malformed cards and keeps good ones untouched', () => {
    const good = { m: 'makan', e: 'eat', t: 'T', reps: 3 }
    const out = mergePersistedState({ cards: [null, { id: 1 }, 'x', good] }, current)
    expect(out.cards).toEqual([good])
  })

  it('keeps well-typed values, nulls where the default is null, and the actions', () => {
    const out = mergePersistedState({ theme: 'light', examDate: '2026-11-02', streak: { count: 4, last: 'x' } }, current)
    expect(out.theme).toBe('light')
    expect(out.examDate).toBe('2026-11-02')
    expect(out.streak).toEqual({ count: 4, last: 'x' })
    expect(out.act).toBe(current.act)
  })

  it('tolerates a missing persisted state', () => {
    expect(mergePersistedState(undefined, current)).toEqual(current)
  })
})
