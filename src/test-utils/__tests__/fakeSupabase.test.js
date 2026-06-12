// Contract tests for the in-memory fake Supabase backend that powers the
// cross-device cloud-sync integration suite (quality-debt ledger Q-1).
//
// The fake sits at the SAME boundary as the real `@supabase/supabase-js`
// client, so everything above it — cloudSync.js query chains, pushStateBlob /
// pullStateBlob, syncEngine, the store merge — runs REAL code in tests. These
// tests pin the Postgres/PostgREST semantics the app actually relies on:
// onConflict upsert, .eq filters (incl. `deleted` tombstones), .single(),
// and JSONB round-trip (functions dropped, objects deep-cloned).

import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseBackend } from '../fakeSupabase'

const USER = { id: 'user-1', email: 'student@example.com' }

describe('fakeSupabase — backend + client contract', () => {
  let backend, client

  beforeEach(() => {
    backend = createFakeSupabaseBackend()
    client = backend.createClient({ user: USER })
  })

  it('upsert inserts a new row, then REPLACES it on the same onConflict key', async () => {
    const row = (stability) => ({
      user_id: USER.id,
      card_key: 'rumah::DeckA',
      card: { m: 'rumah', t: 'DeckA', stability },
      deleted: false,
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    let res = await client.from('user_cards').upsert(row(1), { onConflict: 'user_id,card_key' })
    expect(res.error).toBeNull()
    res = await client.from('user_cards').upsert(row(9), { onConflict: 'user_id,card_key' })
    expect(res.error).toBeNull()

    const rows = backend.rows('user_cards')
    expect(rows).toHaveLength(1)
    expect(rows[0].card.stability).toBe(9)
  })

  it('select + eq chains filter rows; tombstones are hidden behind eq(deleted,false)', async () => {
    await client.from('user_cards').upsert([
      { user_id: USER.id, card_key: 'a::', card: { m: 'a' }, deleted: false, updated_at: '2026-01-01T00:00:00.000Z' },
      { user_id: USER.id, card_key: 'b::', card: { m: 'b' }, deleted: true, updated_at: '2026-01-02T00:00:00.000Z' },
      { user_id: 'other', card_key: 'c::', card: { m: 'c' }, deleted: false, updated_at: '2026-01-03T00:00:00.000Z' },
    ], { onConflict: 'user_id,card_key' })

    const live = await client.from('user_cards')
      .select('card').eq('user_id', USER.id).eq('deleted', false)
      .order('updated_at', { ascending: false }).limit(5000)
    expect(live.error).toBeNull()
    expect(live.data.map(r => r.card.m)).toEqual(['a']) // not b (tombstoned), not c (other user)

    const dead = await client.from('user_cards')
      .select('card_key').eq('user_id', USER.id).eq('deleted', true).limit(5000)
    expect(dead.data).toEqual([{ card_key: 'b::' }])
  })

  it('order sorts by the requested column and limit caps results', async () => {
    await client.from('writing_history').upsert([
      { user_id: USER.id, entry_id: 'e1', entry: { ts: '2026-01-01' }, created_at: '2026-01-01' },
      { user_id: USER.id, entry_id: 'e2', entry: { ts: '2026-01-03' }, created_at: '2026-01-03' },
      { user_id: USER.id, entry_id: 'e3', entry: { ts: '2026-01-02' }, created_at: '2026-01-02' },
    ], { onConflict: 'user_id,entry_id' })

    const res = await client.from('writing_history')
      .select('entry').eq('user_id', USER.id)
      .order('created_at', { ascending: false }).limit(2)
    expect(res.data.map(r => r.entry.ts)).toEqual(['2026-01-03', '2026-01-02'])
  })

  it('single() returns the row when exactly one matches, and an error when none do', async () => {
    const none = await client.from('user_state')
      .select('state, state_version, updated_at').eq('user_id', USER.id).single()
    expect(none.data).toBeNull()
    expect(none.error).toBeTruthy() // PostgREST errors on 0 rows with .single()

    await client.from('user_state').upsert(
      { user_id: USER.id, state: { xp: 5 }, state_version: 30, updated_at: '2026-06-12T00:00:00.000Z' },
      { onConflict: 'user_id' }
    )
    const one = await client.from('user_state')
      .select('state, state_version, updated_at').eq('user_id', USER.id).single()
    expect(one.error).toBeNull()
    expect(one.data.state.xp).toBe(5)
    expect(one.data.updated_at).toBe('2026-06-12T00:00:00.000Z')
  })

  it('JSONB round-trip: stored payloads are deep-cloned and functions are dropped', async () => {
    const state = { xp: 1, action: () => 'i am a zustand action', nested: { theme: 'dark' } }
    await client.from('user_state').upsert(
      { user_id: USER.id, state, state_version: 30, updated_at: '2026-06-12T00:00:00.000Z' },
      { onConflict: 'user_id' }
    )
    state.nested.theme = 'MUTATED-AFTER-WRITE'

    const res = await client.from('user_state').select('state').eq('user_id', USER.id).single()
    expect(res.data.state.action).toBeUndefined()        // functions never reach Postgres
    expect(res.data.state.nested.theme).toBe('dark')     // deep clone, not a live reference
  })

  it('insert appends rows (telemetry_events) without conflict handling', async () => {
    await client.from('telemetry_events').insert({ event_type: 'x', payload: {} })
    await client.from('telemetry_events').insert({ event_type: 'y', payload: {} })
    expect(backend.rows('telemetry_events')).toHaveLength(2)
  })

  it('awaits hooks.beforeUpsert before applying the write (mid-flush injection point)', async () => {
    const seen = []
    backend.hooks.beforeUpsert = async (table, rows) => {
      seen.push([table, backend.rows('user_cards').length, rows.length])
    }
    await client.from('user_cards').upsert(
      { user_id: USER.id, card_key: 'x::', card: { m: 'x' }, deleted: false, updated_at: '2026-01-01T00:00:00.000Z' },
      { onConflict: 'user_id,card_key' }
    )
    // Hook ran BEFORE the row landed (length was still 0 at hook time).
    expect(seen).toEqual([['user_cards', 0, 1]])
    expect(backend.rows('user_cards')).toHaveLength(1)
  })

  it('auth surface: getUser / getSession / onAuthStateChange match supabase-js shapes', async () => {
    const { data: { user } } = await client.auth.getUser()
    expect(user).toEqual(USER)
    const { data: { session } } = await client.auth.getSession()
    expect(session.user).toEqual(USER)
    const { data } = client.auth.onAuthStateChange(() => {})
    expect(typeof data.subscription.unsubscribe).toBe('function')
  })
})
