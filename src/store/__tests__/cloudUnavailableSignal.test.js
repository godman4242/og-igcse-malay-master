// C1-hardening (2026-08-03): a dead or PAUSED Supabase backend must fail
// loudly, not silently.
//
// Supabase pauses a free-tier project after ~1 week idle and the subdomain
// stops resolving — indistinguishable from deletion by DNS. Every cloud call
// then rejects with a network error. Before this change the app swallowed all
// of them: hydrateCloudData caught, telemetried to a dead backend, and returned
// false; AuthGuard's blob sync caught into a console.warn. The app kept working
// (offline-first) and the header still showed the green signed-in cloud pill,
// so NOTHING told the user their cloud backup was unreachable — the worst shape
// for a data-safety feature.
//
// SUPABASE_CONFIG.enabled cannot be the detector: it is a *presence* check on
// two env vars and must stay synchronous (12 render-path consumers). Reachability
// is therefore observed at the point of failure and surfaced through the sync
// slice, which the header pill already renders.

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../config/supabaseConfig', () => ({
  SUPABASE_CONFIG: { enabled: true, url: 'https://dead.supabase.co', key: 'anon' },
}))

// A paused project: DNS does not resolve, so fetch rejects before any HTTP.
const DEAD_HOST = () => { throw new TypeError('Failed to fetch') }
const cloud = { alive: false }

vi.mock('../../lib/cloudSync', () => ({
  fetchCloudCards: vi.fn(async () => (cloud.alive ? [] : DEAD_HOST())),
  fetchCloudWritingHistory: vi.fn(async () => (cloud.alive ? [] : DEAD_HOST())),
  fetchCloudSpeakingHistory: vi.fn(async () => (cloud.alive ? [] : DEAD_HOST())),
  fetchCloudDeletedCardKeys: vi.fn(async () => (cloud.alive ? new Set() : DEAD_HOST())),
  syncCloudSnapshot: vi.fn(async () => ({ cards: 0, writingEntries: 0, speakingEntries: 0 })),
}))

import useStore from '../useStore'

describe('dead/paused backend surfaces a visible error (C1-hardening)', () => {
  beforeEach(() => {
    cloud.alive = false
    useStore.setState({
      userRole: 'enhanced',
      cards: [], writingHistory: [], speakingHistory: [],
      sync: { networkStatus: 'online', syncStatus: 'synced', queue: [], lastSyncAt: null, lastError: null, cloudUnavailable: false },
    })
  })

  it('flags the cloud as unavailable when every cloud read rejects', async () => {
    const ok = await useStore.getState().hydrateCloudData()
    expect(ok).toBe(false)
    const { sync } = useStore.getState()
    expect(sync.cloudUnavailable).toBe(true)
    expect(sync.lastError).toBeTruthy()
  })

  it('clears the flag once the backend answers again (unpaused)', async () => {
    await useStore.getState().hydrateCloudData()
    expect(useStore.getState().sync.cloudUnavailable).toBe(true)

    cloud.alive = true
    const ok = await useStore.getState().hydrateCloudData()
    expect(ok).toBe(true)
    expect(useStore.getState().sync.cloudUnavailable).toBe(false)
  })

  it('exposes an action so non-store callers (AuthGuard blob sync) can report it', () => {
    useStore.getState().setCloudUnavailable('Failed to fetch')
    expect(useStore.getState().sync.cloudUnavailable).toBe(true)
    expect(useStore.getState().sync.lastError).toBe('Failed to fetch')

    useStore.getState().setCloudUnavailable(null)
    expect(useStore.getState().sync.cloudUnavailable).toBe(false)
  })

  it('never flags the cloud for a guest (static role never touches the backend)', async () => {
    useStore.setState({ userRole: 'static' })
    const ok = await useStore.getState().hydrateCloudData()
    expect(ok).toBe(false)
    expect(useStore.getState().sync.cloudUnavailable).toBe(false)
  })
})
