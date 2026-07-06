// @vitest-environment jsdom
//
// P1-1 INTEGRATION lock — a settings-only change must survive a signed-in
// reload. The live bug: ~10 pref setters mutated state without stamping
// `lastMutationAt`, so on the next sign-in AuthGuard's newer-wins tie-break
// saw the pre-change cloud blob as "newer" and silently reverted the change.
//
// Unlike the unit proxy (prefMutationSync.test.js, which only checks the
// stamp), this drives the REAL sign-in orchestration: the real <AuthGuard>
// component mounts in jsdom, its real handleSignIn pulls/pushes the real
// pushStateBlob/pullStateBlob against the in-memory fake Supabase backend,
// and the real cardDelta/timestamp tie-break decides restore-vs-push.
//
// Module-generation rule: createDevice() resets the module registry, so
// React, react-dom AND AuthGuard are dynamically imported AFTER it — mixing
// a static (gen-0) React with the device's (gen-1) AuthGuard would mean two
// React copies and "Invalid hook call".

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabaseBackend, createDevice, TEST_USER } from '../../test-utils/twoDeviceSync'

const fsrsCard = (m, e, t) => ({
  m, e, t, p: 'n', ex: `${m} (${e}).`, mn: '',
  due: '2026-01-01T00:00:00.000Z', stability: 1, difficulty: 5,
  elapsed_days: 0, scheduled_days: 1, reps: 1, lapses: 0, state: 2, last_review: null,
})

describe('AuthGuard sign-in merge — settings survive a reload (P1-1)', () => {
  let backend, device, React, act, createRoot, AuthGuard
  let root

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    // Node 25 ships a broken global localStorage stub (the property exists but
    // setItem throws without --localstorage-file), and zustand's persist
    // resolves the BARE global — so install a real in-memory Storage shim
    // before the store module loads. Fresh per test: nothing leaks between
    // tests, while the unmount/remount inside one test keeps real
    // persistence semantics (it is a reload, after all).
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
    backend = createFakeSupabaseBackend()
    device = await createDevice(backend, TEST_USER)
    ;({ default: React, act } = await import('react'))
    ;({ createRoot } = await import('react-dom/client'))
    ;({ default: AuthGuard } = await import('../AuthGuard'))
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    root = null
    device?.dispose()
  })

  async function mountAuthGuard() {
    root = createRoot(document.createElement('div'))
    await act(async () => {
      root.render(React.createElement(AuthGuard, null, null))
    })
  }

  async function unmountAuthGuard() {
    await act(async () => root.unmount())
    root = null
  }

  it('a settings-only change (exam date) is NOT reverted by the next sign-in restore', async () => {
    // The account has a small deck, so the blob restore branch is reachable
    // (it requires cloudCardCount > 0; counts stay equal → delta 0 → tie-break).
    device.useStore.setState({ cards: [fsrsCard('rumah', 'house', '')] })

    // Sign-in #1 (new account): AuthGuard pushes the local state blob up.
    await mountAuthGuard()
    await vi.waitFor(() => {
      expect(backend.counts.upserts.user_state || 0).toBeGreaterThanOrEqual(1)
    })
    await unmountAuthGuard()
    expect(backend.rows('user_state')[0].state.examDate ?? null).toBeNull()

    // The user changes ONLY the exam date — no reviews, no card mutations.
    // Recreate the bug's precondition first: a stale lastMutationAt older
    // than the blob's updated_at. The FIX is that setExamDate stamps it
    // forward via commitPrefMutation; the reverted code leaves it stale.
    device.useStore.setState({ lastMutationAt: '2020-01-01T00:00:00.000Z' })
    device.state().setExamDate('2026-12-01')

    // Sign-in #2 — the reload. Buggy tie-break: cloud blob (no exam date)
    // reads as newer → restoreFromCloud silently reverts the setting.
    await mountAuthGuard()
    await vi.waitFor(() => {
      const pushedAgain = (backend.counts.upserts.user_state || 0) >= 2
      const reverted = device.state().examDate !== '2026-12-01'
      expect(pushedAgain || reverted).toBe(true) // sign-in #2 settled either way
    })

    // The change SURVIVED the reload…
    expect(device.state().examDate).toBe('2026-12-01')
    // …and local-newer won the tie-break, pushing the change up to the cloud.
    expect(backend.rows('user_state')[0].state.examDate).toBe('2026-12-01')
  })

  it('a restored backup is NOT reverted by the next sign-in restore (#11)', async () => {
    // Same shape as the exam-date case, but the change arrives via importData
    // (a backup restore) instead of a pref setter. The bug: importData raw-set
    // the store WITHOUT stamping lastMutationAt / triggering a push, so the
    // next sign-in's newer-wins tie-break saw the old cloud blob as newer and
    // silently undid the restore.
    device.useStore.setState({ cards: [fsrsCard('rumah', 'house', '')] })

    // Sign-in #1 (new account): AuthGuard pushes the local blob up (no exam date).
    await mountAuthGuard()
    await vi.waitFor(() => {
      expect(backend.counts.upserts.user_state || 0).toBeGreaterThanOrEqual(1)
    })
    await unmountAuthGuard()
    expect(backend.rows('user_state')[0].state.examDate ?? null).toBeNull()

    // The user RESTORES a backup that carries an exam date. Recreate the bug's
    // precondition — a stale lastMutationAt older than the blob's updated_at —
    // then restore. The FIX stamps lastMutationAt forward inside importData.
    device.useStore.setState({ lastMutationAt: '2020-01-01T00:00:00.000Z' })
    device.state().importData({ ...device.state().exportData(), examDate: '2026-12-01' })

    // Sign-in #2 — the reload. Buggy importData leaves the stamp stale → the
    // cloud blob (no exam date) reads as newer → restoreFromCloud reverts it.
    await mountAuthGuard()
    await vi.waitFor(() => {
      const pushedAgain = (backend.counts.upserts.user_state || 0) >= 2
      const reverted = device.state().examDate !== '2026-12-01'
      expect(pushedAgain || reverted).toBe(true) // sign-in #2 settled either way
    })

    // The restore SURVIVED the reload…
    expect(device.state().examDate).toBe('2026-12-01')
    // …and local-newer won the tie-break, pushing the restore up to the cloud.
    expect(backend.rows('user_state')[0].state.examDate).toBe('2026-12-01')
  })
})
