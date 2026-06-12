// Two-device cloud-sync harness (quality-debt ledger Q-1).
//
// A "device" = a FRESH module-registry instance of the Zustand store (and
// everything it lazy-imports: cloudSync.js, supabase.js, syncEngine.js), all
// wired to ONE shared in-memory fake Supabase backend. That reproduces the
// real two-device topology — device A deletes, device B signs in — with zero
// network and full determinism.
//
// How isolation works: vi.resetModules() clears the module cache, so the next
// dynamic import of useStore builds a brand-new store (plus its own
// module-level _flushInFlight / timer state, just like a separate browser).
// vi.doMock survives resetModules and is re-registered per device anyway:
//   - '@supabase/supabase-js' → createClient returns the SHARED backend client
//   - '../config/supabaseConfig' → enabled:true (the store gates sync on it)
// State lives only in the store instances + the shared backend — module
// identity is irrelevant, so device A keeps working after device B's reset.

import { vi } from 'vitest'

// NOTE: the `export ... from` form is required here — under vitest's module
// mocker, `import { x }` followed by a separate `export { x }` re-exports
// `undefined` instead of the live binding.
export { createFakeSupabaseBackend } from './fakeSupabase'

export const TEST_USER = { id: 'user-1', email: 'student@example.com' }

export function mockCloudModules(backend, user = TEST_USER) {
  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => backend.createClient({ user }),
  }))
  vi.doMock('../config/supabaseConfig', () => ({
    SUPABASE_CONFIG: { enabled: true, url: 'http://fake.test', key: 'fake-key' },
  }))
}

/**
 * Create a device: fresh store instance bound to the shared backend.
 * Always await devices SEQUENTIALLY — module-registry resets are global.
 */
export async function createDevice(backend, user = TEST_USER) {
  vi.resetModules()
  mockCloudModules(backend, user)
  const { default: useStore } = await import('../store/useStore')

  // Prime the fresh registry's supabase client cache from HERE (a module the
  // test file awaited). Empirically, when the FIRST '@supabase/supabase-js'
  // import in a new registry generation is triggered from inside the store's
  // own lazy chain, the re-registered doMock is not applied yet and the REAL
  // package leaks in (auth.getUser() → null → 'cloud_auth_required').
  // Importing supabase.js and calling initSupabase() from harness level
  // commits the mock and caches the fake client for the whole generation.
  const supa = await import('../config/supabase')
  const primed = await supa.initSupabase()
  if (!primed?.__fake) {
    throw new Error('twoDeviceSync: fake supabase client failed to prime — mock not applied')
  }

  const device = {
    useStore,
    user,
    state: () => useStore.getState(),

    // Store-level sign-in: what AuthGuard's handleSignIn does to the store
    // before the pulls (auth.user set + role elevated + network online).
    // The full AuthGuard orchestration is exercised separately in the jsdom
    // integration test; here the merge entry points are driven directly.
    signIn() {
      useStore.getState().setAuthUser({ id: user.id, email: user.email })
      useStore.getState().setNetworkStatus(true)
    },

    // The sign-in pull: real hydrateCloudData → real cloudSync → fake backend.
    hydrate: () => useStore.getState().hydrateCloudData(),

    // Drain the offline-first event queue: real flushSyncQueue → real
    // syncEngine.processSyncQueue → real processCloudSyncEvent → fake backend.
    flush: () => useStore.getState().flushSyncQueue(),

    // Neutralize the 5s debounced blob push timer so a test that outlives the
    // debounce can't see a surprise user_state write from a finished test:
    // triggerCloudSync's callback bails when auth.user is null.
    dispose() {
      useStore.setState(s => ({ auth: { ...s.auth, user: null } }))
    },
  }
  return device
}

export function cardKeyOf(user, m, t) {
  return `${user.id}|${m}::${t || ''}`
}
