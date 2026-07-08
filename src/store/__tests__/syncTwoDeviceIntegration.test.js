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

  it('#10 — sign-in hydrate keeps speakingHistory ASC (newest LAST) so `.at(-1)` is the latest attempt', async () => {
    // Device A logs two attempts — an old one and a newer one — and syncs them.
    const A = await device()
    A.state().logSpeakingSession({ ts: '2026-01-01T00:00:00.000Z', topicId: 'intro', band: 3, wordCount: 40 })
    A.state().logSpeakingSession({ ts: '2026-03-01T00:00:00.000Z', topicId: 'intro', band: 5, wordCount: 90 })
    expect(await A.flush()).toBe(true)

    // Device B logs an attempt whose ts falls BETWEEN A's two, then signs in and
    // pulls the cloud speaking history. The merge must re-sort chronologically.
    const B = await device()
    B.state().logSpeakingSession({ ts: '2026-02-01T00:00:00.000Z', topicId: 'intro', band: 4, wordCount: 60 })
    await B.hydrate()

    const hist = B.state().speakingHistory
    expect(hist).toHaveLength(3)
    // Newest-LAST, matching writingHistory's ASC order — so `.at(-1)` is the
    // latest band (the bug: hydrate sorted speaking DESC, inverting dailyPlan #9).
    expect(hist.at(-1).ts).toBe('2026-03-01T00:00:00.000Z')
    expect(hist[0].ts).toBe('2026-01-01T00:00:00.000Z')

    // writingHistory (the reference order) sorts the same way after hydrate.
    const wHist = B.state().writingHistory
    for (let i = 1; i < wHist.length; i++) {
      expect(new Date(wHist[i].ts) >= new Date(wHist[i - 1].ts)).toBe(true)
    }
  })

  it('#11 — importData (backup restore) stamps lastMutationAt forward AND triggers a cloud push, so the newer-wins tie-break keeps the restore', async () => {
    const A = await device()
    // A stale mutation stamp: nothing has changed locally since the last cloud
    // push, so the cloud blob would read as "newer" on the next sign-in.
    A.useStore.setState({ lastMutationAt: '2020-01-01T00:00:00.000Z' })
    const before = new Date(A.state().lastMutationAt).getTime()
    // Spy the push trigger (importData must schedule the blob push, or the
    // stamped-forward local state never reaches the cloud). Overriding it is
    // safe: triggerCloudSync is not a BACKUP_KEY, so importData won't clobber it.
    let pushed = false
    A.useStore.setState({ triggerCloudSync: () => { pushed = true } })

    // The user restores a backup file (re-imports an export). The restore IS a
    // fresh mutation: it must stamp lastMutationAt forward (so AuthGuard's
    // newer-wins tie-break keeps it) AND push the restored blob to the cloud.
    A.state().importData({ ...A.state().exportData(), examDate: '2026-12-01' })

    const after = new Date(A.state().lastMutationAt).getTime()
    expect(after).toBeGreaterThan(before) // stamped forward
    expect(pushed).toBe(true)             // cloud push triggered
    expect(A.state().examDate).toBe('2026-12-01') // restore applied
  })

  it('PLAUSIBLE-1 — sign-in hydrate must not push a STALE local card over a fresher cloud review', async () => {
    // Device A creates "makan" and syncs it up (never reviewed → reps 0).
    const A = await device()
    A.state().addCard(card('makan', 'eat', 'Food'))
    expect(await A.flush()).toBe(true)

    // Device B picks it up, then goes idle — its copy stays reps 0 (STALE).
    const B = await device()
    await B.hydrate()
    expect(B.state().cards.find(c => c.m === 'makan').reps).toBe(0)

    // Device A reviews "makan" (reps 0 → 1) and syncs the fresher copy up.
    A.state().reviewCardAction('makan', 'Food', 3) // Rating.Good
    expect(await A.flush()).toBe(true)
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'makan', 'Food')).card.reps).toBe(1)

    // Device B signs in AGAIN, still holding its stale reps-0 copy. The bug:
    // the key-union kept B's stale local copy on the collision (local always
    // won) AND the snapshot push re-upserted reps 0 over the cloud's reps 1 —
    // silently discarding the review A made. Fix: reconcile by freshness
    // (last_review, then reps) so the fresher copy wins on either side.
    await B.hydrate()

    // B adopts the fresher review…
    expect(B.state().cards.find(c => c.m === 'makan').reps).toBe(1)
    // …and the cloud's fresher review SURVIVES B's snapshot push.
    expect(backend.row('user_cards', cardKeyOf(TEST_USER, 'makan', 'Food')).card.reps).toBe(1)
  })

  it('v34 — a same-word MS/EN pair does not collide into one cloud row (data loss)', async () => {
    // A bilingual learner holds the loanword "hotel" in BOTH decks — same (m,t),
    // different lang — which addCards keeps distinct on (m,t,lang). The bug:
    // card_key = m::t collapsed them to ONE user_cards row, so one language's
    // card silently overwrote the other on sync. Fix: en cards get a `::en`
    // card_key suffix (ms keys stay byte-identical → no cloud backfill).
    const A = await device()
    A.state().addCards([
      card('hotel', 'hotel', 'Travel'),                            // Malay (lang absent → ms)
      { ...card('hotel', 'a place to stay', 'Travel'), lang: 'en' }, // English
    ])
    expect(await A.flush()).toBe(true)

    // Both language copies survive as DISTINCT cloud rows.
    const msRow = backend.row('user_cards', cardKeyOf(TEST_USER, 'hotel', 'Travel'))
    const enRow = backend.row('user_cards', `${cardKeyOf(TEST_USER, 'hotel', 'Travel')}::en`)
    expect(msRow?.card?.e).toBe('hotel')
    expect(msRow.deleted).toBe(false)
    expect(enRow?.card?.lang).toBe('en')
    expect(enRow.deleted).toBe(false)

    // Device B pulls them down as two separate cards (no cloud collapse).
    const B = await device()
    await B.hydrate()
    const hotels = B.state().cards.filter(c => c.m === 'hotel' && c.t === 'Travel')
    expect(hotels).toHaveLength(2)
    expect(hotels.map(c => c.lang || 'ms').sort()).toEqual(['en', 'ms'])
  })
})
