// @vitest-environment jsdom
//
// Two tabs (2026-09-28 bug hunt U3 / R1 #4): every set() serialises the tab's
// WHOLE in-memory state to one localStorage key. Without a cross-tab listener, a
// tab opened earlier writes its stale snapshot over another tab's reviews the
// moment it changes anything — even just the network pill going back online.
// Measured on the live site: tab A reviewed 5 cards, tab B reviewed 1, the saved
// history said 1. The store must pick up the other tab's write first.
import { describe, it, expect, beforeEach } from 'vitest'

const KEY = 'igcse-malay-store'
let useStore, mem

beforeEach(async () => {
  mem = new Map()
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
  ;({ default: useStore } = await import('../useStore'))
  useStore.setState({ studyHistory: {}, reviewedToday: 0 })
})

// What the OTHER tab does: write its newer state straight to storage, which fires
// a `storage` event in every other tab of the same origin (never in the writer).
function otherTabWrites(patch) {
  const saved = JSON.parse(mem.get(KEY))
  saved.state = { ...saved.state, ...patch }
  const newValue = JSON.stringify(saved)
  mem.set(KEY, newValue)
  window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue }))
}
const flush = () => new Promise(r => setTimeout(r, 0))

describe('cross-tab persistence', () => {
  it("picks up another tab's saved progress", async () => {
    otherTabWrites({ studyHistory: { '2026-09-28': { reviews: 5, minutes: 3 } }, reviewedToday: 5 })
    await flush()
    expect(useStore.getState().studyHistory).toEqual({ '2026-09-28': { reviews: 5, minutes: 3 } })
  })

  it("this tab's next write keeps the other tab's progress instead of overwriting it", async () => {
    otherTabWrites({ studyHistory: { '2026-09-28': { reviews: 5, minutes: 3 } }, reviewedToday: 5 })
    await flush()
    useStore.getState().setNetworkStatus('online') // the Layout `online` handler — no user action
    const saved = JSON.parse(mem.get(KEY)).state
    expect(saved.studyHistory).toEqual({ '2026-09-28': { reviews: 5, minutes: 3 } })
    expect(saved.reviewedToday).toBe(5)
  })

  it('ignores other keys and a cleared value', async () => {
    useStore.setState({ reviewedToday: 2 })
    window.dispatchEvent(new StorageEvent('storage', { key: 'igcse-malay-telemetry', newValue: '[]' }))
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }))
    await flush()
    expect(useStore.getState().reviewedToday).toBe(2)
  })
})
