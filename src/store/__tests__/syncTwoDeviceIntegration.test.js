// Cross-device cloud-sync INTEGRATION tests (quality-debt ledger Q-1).
//
// Why these exist: four sync bugs shipped and recurred — settings-revert
// (P1-1), queue-clobber (P1-2), review-scope (P2-C1), card-resurrection
// (P2-C2) — and every fix was verified only by unit tests that FAKED the
// cloud boundary. These tests drive the REAL merge: two independent store
// instances (real useStore + real cloudSync.js + real syncEngine.js + real
// supabase.js) sharing ONE in-memory fake Supabase backend, faked only at
// the `@supabase/supabase-js` createClient seam.
//
// P1-1 needs the real AuthGuard.handleSignIn closure and lives in
// src/components/__tests__/authGuardSignInMergeIntegration.test.js (jsdom).

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createFakeSupabaseBackend,
  createDevice,
  cardKeyOf,
  TEST_USER,
} from '../../test-utils/twoDeviceSync'

const card = (m, e, t) => ({ m, e, t, p: 'n', ex: `${m} (${e}).`, mn: '' })
const keysOf = (cards) => (cards || []).map(c => `${c.m}::${c.t || ''}`)

describe('two-device cloud sync — real merge over a shared fake backend', () => {
  let backend
  const devices = []

  async function device() {
    const d = await createDevice(backend, TEST_USER)
    d.signIn()
    devices.push(d)
    return d
  }

  beforeEach(() => {
    backend = createFakeSupabaseBackend()
    devices.length = 0
  })

  afterEach(() => {
    // Detach auth so any still-pending 5s debounced blob push from this test
    // bails instead of writing into a later test's backend window.
    devices.forEach(d => d.dispose())
  })

  it('P2-C2 — a card deleted on device A does not resurrect when device B signs in', async () => {
    // Device A creates the card and syncs it live to the cloud.
    const A = await device()
    A.state().addCard(card('rumah', 'house', 'Mistakes'))
    expect(await A.flush()).toBe(true)
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'rumah', 'Mistakes')).deleted).toBe(false)

    // Device B signs in and picks the card up — both devices now hold it.
    const B = await device()
    B.state().addCard(card('buku', 'book', '')) // B-only card: union must keep it
    await B.hydrate()
    expect(keysOf(B.state().cards)).toContain('rumah::Mistakes')

    // Device A deletes the card → cloud tombstone (deleted:true).
    A.state().removeCard('rumah', 'Mistakes')
    expect(await A.flush()).toBe(true)
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'rumah', 'Mistakes')).deleted).toBe(true)

    // Device B signs in again, still holding its stale local copy. The
    // resurrection bug: B's sign-in snapshot push re-upserted the copy as
    // deleted:false, undeleting it everywhere.
    await B.hydrate()

    // B drops the tombstoned card locally…
    expect(keysOf(B.state().cards)).not.toContain('rumah::Mistakes')
    // …the cloud tombstone SURVIVES B's snapshot push (the actual P2-C2 lock)…
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'rumah', 'Mistakes')).deleted).toBe(true)
    // …and the union still preserved B's own card (no false deletion).
    expect(keysOf(B.state().cards)).toContain('buku::')
  })

  it('P2-C1 — reviewing a word in one deck does not clobber the sibling deck copy another device reviewed', async () => {
    // The same word saved in two decks, synced to the cloud by device A.
    const A = await device()
    A.state().addCards([card('rumah', 'house', 'DeckA'), card('rumah', 'house', 'DeckB')])
    expect(await A.flush()).toBe(true)

    // Device B picks both up, then reviews the DeckB copy and syncs.
    const B = await device()
    await B.hydrate()
    B.state().reviewCardAction('rumah', 'DeckB', 3) // Rating.Good
    expect(await B.flush()).toBe(true)
    const bDeckB = B.state().cards.find(c => c.m === 'rumah' && c.t === 'DeckB')
    expect(bDeckB.reps).toBe(1) // sanity: B really reviewed it
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'rumah', 'DeckB')).card.reps).toBe(1)

    // Device A (whose DeckB copy is STALE — reps 0) reviews only its DeckA
    // copy. The P2-C1 bug: the synced review filtered by word alone, so A
    // pushed BOTH copies and its stale DeckB overwrote B's review in the cloud.
    A.state().reviewCardAction('rumah', 'DeckA', 3)
    expect(await A.flush()).toBe(true)

    // A's review reached the cloud for DeckA…
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'rumah', 'DeckA')).card.reps).toBe(1)
    // …and B's DeckB review SURVIVED — A's stale copy never re-pushed.
    const cloudDeckB = backend.row('user_cards', cardKeyOf(TEST_USER, 'rumah', 'DeckB')).card
    expect(cloudDeckB.reps).toBe(1)
    expect(cloudDeckB.last_review).toBeTruthy()
  })

  it('P1-2 — a delete enqueued DURING an in-flight flush still reaches the cloud', async () => {
    // Device A has one card synced live, and a second add queued up.
    const A = await device()
    A.state().addCard(card('lama', 'old', 'Deck'))
    expect(await A.flush()).toBe(true)
    A.state().addCard(card('baru', 'new', 'Deck'))

    // While the flush is processing card_added(baru) — i.e. during the awaited
    // backend write — the user deletes `lama`. The P1-2 bug: the flush then
    // REPLACED the whole queue with its own snapshot's remainder, clobbering
    // the mid-flight card_removed; a delete lost that way never reached the
    // cloud (and deletes don't heal via the sign-in union).
    backend.hooks.beforeUpsert = (table) => {
      if (table === 'user_cards') {
        backend.hooks.beforeUpsert = null // fire once
        A.state().removeCard('lama', 'Deck')
      }
    }
    expect(await A.flush()).toBe(true)

    // The mid-flush delete reached the cloud as a tombstone…
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'lama', 'Deck')).deleted).toBe(true)
    // …the queued add landed too, and nothing is stuck in the queue.
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'baru', 'Deck')).deleted).toBe(false)
    expect(A.state().sync.queue).toHaveLength(0)
    expect(A.state().sync.syncStatus).toBe('synced')
  })
})
