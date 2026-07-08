// @vitest-environment node
//
// PLAUSIBLE finding (2026-07-03 review) — gemini.js disarms abort/timeout at
// HEADERS. The old code cleared the timeout AND removed the caller-abort
// listener in the fetch try's `finally`, which runs the moment response headers
// arrive — BEFORE res.json() reads the body. So a caller who cancels (or a
// timeout that fires) DURING the body read was ignored: the read ran unbounded
// and uncancellable, contradicting the intent comment "Either trips → abort."
//
// This test wires res.json() to reject when the request's internal signal
// aborts, then fires a caller abort during the body read. Fixed code → the
// guard is still armed → AbortError. Buggy code → the abort is ignored and the
// body resolves normally, which fails the `.rejects` assertion cleanly (no hang).

import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../../config/supabase', () => ({ initSupabase: vi.fn(async () => null) }))

import { callGemini } from '../gemini.js'

afterEach(() => vi.unstubAllGlobals())

describe('callGemini — abort/timeout stays armed through the body read', () => {
  it('a caller abort DURING the body read aborts the call (guard not disarmed at headers)', async () => {
    let capturedSignal = null
    let deliverBody = null // resolves res.json() normally — used only on the buggy path

    const fetchMock = vi.fn(async (_url, opts) => {
      capturedSignal = opts.signal
      return {
        ok: true,
        json: () =>
          new Promise((resolve, reject) => {
            deliverBody = () =>
              resolve({ candidates: [{ content: { parts: [{ text: 'late body' }] } }] })
            if (capturedSignal.aborted) {
              reject(new DOMException('aborted', 'AbortError'))
            } else {
              capturedSignal.addEventListener(
                'abort',
                () => reject(new DOMException('aborted', 'AbortError')),
                { once: true },
              )
            }
          }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const ctrl = new AbortController()
    const p = callGemini({ messages: [{ role: 'user', content: 'hi' }], signal: ctrl.signal })
    p.catch(() => {}) // pre-attach so an early rejection isn't flagged unhandled

    // Let fetch settle and the res.json() body read begin.
    await new Promise((r) => setTimeout(r, 0))

    // Caller cancels mid-body.
    ctrl.abort(new DOMException('user cancel', 'AbortError'))
    await new Promise((r) => setTimeout(r, 0))

    // Buggy path only: the abort was ignored, so settle the body to avoid a hang
    // — the resolved promise then fails the `.rejects` assertion cleanly.
    deliverBody?.()

    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })
})
