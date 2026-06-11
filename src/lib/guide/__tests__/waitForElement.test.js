import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitForElement } from '../waitForElement'

// Returns a fake document whose querySelector yields each value in `sequence`
// on successive calls (the final value repeats). Lets us simulate an element
// that mounts late, or never. Node test env has no real DOM, so we inject.
function fakeDoc(sequence) {
  let i = 0
  return {
    querySelector: vi.fn(() => {
      const v = sequence[Math.min(i, sequence.length - 1)]
      i++
      return v
    }),
  }
}

describe('waitForElement', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves immediately with the node when it is already present', async () => {
    const node = { tag: 'present' }
    const doc = fakeDoc([node])
    await expect(
      waitForElement('[data-tour="x"]', { doc, win: globalThis, timeoutMs: 3000 })
    ).resolves.toBe(node)
  })

  it('resolves with the node once it appears during polling', async () => {
    const node = { tag: 'late' }
    const doc = fakeDoc([null, null, node]) // immediate miss, then mounts
    const p = waitForElement('[data-tour="late"]', {
      doc, win: globalThis, timeoutMs: 3000, intervalMs: 100,
    })
    await vi.advanceTimersByTimeAsync(250)
    await expect(p).resolves.toBe(node)
  })

  it('resolves null after the timeout when the element never appears', async () => {
    const doc = fakeDoc([null])
    const p = waitForElement('[data-tour="never"]', {
      doc, win: globalThis, timeoutMs: 300, intervalMs: 100,
    })
    await vi.advanceTimersByTimeAsync(400)
    await expect(p).resolves.toBeNull()
  })

  it('resolves null when there is no usable document', async () => {
    await expect(
      waitForElement('[data-tour="x"]', { doc: null, win: globalThis })
    ).resolves.toBeNull()
  })
})
