// P2-C2: card resurrection. Sign-in sync must learn which keys the cloud has
// TOMBSTONED (deleted:true) so a stale device stops re-pushing them as live.
// fetchCloudCards already hides tombstones (`.eq('deleted', false)`), so the
// pull can't see them — we need the COMPLEMENT: the set of deleted card_keys.
//
// This pins the data-access boundary: fetchCloudDeletedCardKeys queries
// user_cards WHERE deleted = true and returns a Set of card_key strings.

import { describe, it, expect, beforeEach, vi } from 'vitest'

let deletedRows = []
const eqCalls = []

// Minimal thenable query builder mirroring supabase-js's PostgrestFilterBuilder:
// every filter method returns `this`, and awaiting it resolves to {data,error}.
function makeBuilder(result) {
  const builder = {
    select: () => builder,
    eq: (col, val) => { eqCalls.push([col, val]); return builder },
    limit: () => builder,
    order: () => builder,
    then: (resolve) => resolve(result),
  }
  return builder
}

const fakeClient = {
  from: () => makeBuilder({ data: deletedRows, error: null }),
}

vi.mock('../../config/supabase', () => ({
  initSupabase: vi.fn(async () => fakeClient),
  getCurrentUser: vi.fn(async () => ({ id: 'user-1' })),
  upsertUserProfile: vi.fn(async () => true),
}))

import { fetchCloudDeletedCardKeys } from '../cloudSync'

describe('fetchCloudDeletedCardKeys — the cloud tombstone set (P2-C2)', () => {
  beforeEach(() => {
    deletedRows = []
    eqCalls.length = 0
  })

  it('returns the set of card_keys the cloud has tombstoned', async () => {
    deletedRows = [{ card_key: 'rumah::Mistakes' }, { card_key: 'buku::' }]

    const keys = await fetchCloudDeletedCardKeys()

    expect(keys).toBeInstanceOf(Set)
    expect(keys.has('rumah::Mistakes')).toBe(true)
    expect(keys.has('buku::')).toBe(true)
    expect(keys.size).toBe(2)
  })

  it('filters by deleted:true (only tombstones, not live rows)', async () => {
    await fetchCloudDeletedCardKeys()
    expect(eqCalls).toContainEqual(['deleted', true])
  })

  it('returns an empty set when nothing is tombstoned', async () => {
    deletedRows = []
    const keys = await fetchCloudDeletedCardKeys()
    expect(keys.size).toBe(0)
  })
})
