// Census A8 (2026-08-06): the whole-store cloud blob push swallowed EVERY
// failure into a console.warn.
//
//   } catch (e) {
//     console.warn('[cloud sync]', e.message);
//   }
//
// So when a signed-in learner's token expired, or the free-tier Supabase
// project paused (a documented recurring event in this repo — see
// project_supabase_freetier_pause), the header pill kept reporting a healthy
// sync while every settings change, streak day and mistake since then existed
// only on that device.
//
// The machinery to say so already existed: the C1 hardening added
// `setCloudUnavailable`, which raises `sync.cloudUnavailable` so the header
// renders "Cloud backup unavailable" in red with Retry enabled. Two other call
// sites use it (`hydrateCloudData`, AuthGuard's blob catch); this one was never
// wired up. The fix is to use the existing mechanism, not to invent a new one.
//
// No mocking: `pushStateBlob` throws "Supabase not configured" when there is no
// client, which is exactly the state of a test run — so this drives the real
// failure path rather than a simulated one.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import useStore from '../useStore'

// triggerCloudSync does `await import('../config/supabase')` INSIDE its 5 s
// debounce. Under fake timers the timer fires but that first-time module
// resolution does not settle within the flush, so the catch is never reached
// and the test reads as "no failure happened". Importing it here warms the
// module cache so the dynamic import resolves from cache during the flush.
await import('../../config/supabase')

const signedIn = () => {
  const s = useStore.getState()
  useStore.setState({
    auth: { ...s.auth, user: { id: 'u1', email: 'k@example.com' } },
    sync: { ...s.sync, cloudUnavailable: false, lastError: null },
  })
}

describe('A8 — a failed cloud blob push is visible, not just logged', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('raises cloudUnavailable when the push throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    signedIn()

    useStore.getState().triggerCloudSync()
    await vi.advanceTimersByTimeAsync(5000)

    expect(warn, 'the push really did fail (guards the fixture)').toHaveBeenCalled()
    expect(
      useStore.getState().sync.cloudUnavailable,
      'a signed-in learner must be told their work is not reaching the cloud',
    ).toBe(true)
  })

  it('records why, so the pill can explain itself', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    signedIn()

    useStore.getState().triggerCloudSync()
    await vi.advanceTimersByTimeAsync(5000)

    expect(useStore.getState().sync.lastError).toBeTruthy()
  })

  it('does nothing at all when signed out (no false alarm)', async () => {
    const s = useStore.getState()
    useStore.setState({
      auth: { ...s.auth, user: null },
      sync: { ...s.sync, cloudUnavailable: false, lastError: null },
    })

    useStore.getState().triggerCloudSync()
    await vi.advanceTimersByTimeAsync(5000)

    expect(
      useStore.getState().sync.cloudUnavailable,
      'a signed-out user has no cloud backup to lose — the banner would be noise',
    ).toBe(false)
  })
})
