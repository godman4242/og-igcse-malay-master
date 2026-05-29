// Pins nextScheduledRetryMs — the backoff math that broke the mobile sync
// loop (commit follows). Loop history: Layout's effect re-fired on every
// `sync.syncStatus` change, calling flushSyncQueue back-to-back without
// honouring `nextRetryAt`. Mobile networks fail more often than desktop,
// so the loop only showed there. Fix: the store schedules ONE setTimeout
// retry at the earliest queued nextRetryAt, using this helper for the math.

import { describe, it, expect } from 'vitest'
import { classifySyncError, nextScheduledRetryMs, processSyncQueue } from '../syncEngine.js'

describe('nextScheduledRetryMs', () => {
  it('returns null for an empty queue (nothing to retry)', () => {
    expect(nextScheduledRetryMs([], 0)).toBeNull()
    expect(nextScheduledRetryMs(undefined, 0)).toBeNull()
    expect(nextScheduledRetryMs(null, 0)).toBeNull()
  })

  it('returns the default delay when no event has a parseable nextRetryAt', () => {
    const queue = [{ id: 'a' }, { id: 'b', nextRetryAt: 'not-a-date' }]
    expect(nextScheduledRetryMs(queue, 0)).toBe(5000)
  })

  it('returns the delta to the earliest nextRetryAt in the queue', () => {
    const now = Date.parse('2026-05-28T12:00:00Z')
    const queue = [
      { id: 'a', nextRetryAt: '2026-05-28T12:00:10Z' }, // +10s
      { id: 'b', nextRetryAt: '2026-05-28T12:00:03Z' }, // +3s — earliest
      { id: 'c', nextRetryAt: '2026-05-28T12:00:30Z' }, // +30s
    ]
    expect(nextScheduledRetryMs(queue, now)).toBe(3000)
  })

  it('floors at MIN_RETRY_DELAY_MS even if nextRetryAt has already passed', () => {
    // Critical: this is the property that breaks the tight-loop. If we
    // returned `earliest - now` directly, a queue full of past-due events
    // would produce 0 or negative delays and the setTimeout would fire
    // immediately — same hammer as before, just one layer down.
    const now = Date.parse('2026-05-28T12:00:00Z')
    const queue = [{ id: 'a', nextRetryAt: '2026-05-28T11:59:00Z' }] // -60s
    expect(nextScheduledRetryMs(queue, now)).toBe(1000)
  })

  it('ignores events with missing nextRetryAt when others have one', () => {
    const now = Date.parse('2026-05-28T12:00:00Z')
    const queue = [
      { id: 'a' }, // no nextRetryAt — skipped
      { id: 'b', nextRetryAt: '2026-05-28T12:00:07Z' }, // +7s
    ]
    expect(nextScheduledRetryMs(queue, now)).toBe(7000)
  })
})

// Dead-letter visibility (2026-05-29).
//
// Pre-fix, processSyncQueue's retry loop did `if (attempts < MAX_ATTEMPTS) requeue`
// and silently dropped events that hit the limit. That's why user_cards stayed
// empty even though the queue flushed cleanly — failed upserts burned 5 retries,
// then vanished with no log, no archive, no telemetry. Direct Supabase query
// on 2026-05-29 confirmed user_cards = 0 rows while the blob held 264 cards.
//
// Fix: events that exhaust retries land in a new `deadLetter` array on the
// result so the caller can log / archive / telemetry them. This test pins
// that behavior so future refactors can't reintroduce the silent drop.

describe('processSyncQueue — dead-letter for exhausted retries', () => {
  const okEvent = (overrides = {}) => ({
    id: 'ok-1', type: 'card_reviewed', payload: { malay: 'air' }, attempts: 0, ...overrides,
  })

  it('keeps successful events out of remainingQueue and deadLetter', async () => {
    const result = await processSyncQueue({
      queue: [okEvent()],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async () => true,
    })

    expect(result.processedCount).toBe(1)
    expect(result.remainingQueue).toEqual([])
    expect(result.deadLetter).toEqual([])
    expect(result.status).toBe('synced')
  })

  it('re-queues failing events with attempts < MAX_ATTEMPTS', async () => {
    const result = await processSyncQueue({
      queue: [okEvent({ attempts: 2 })],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async () => { throw new Error('boom') },
    })

    expect(result.processedCount).toBe(0)
    expect(result.remainingQueue).toHaveLength(1)
    expect(result.remainingQueue[0].attempts).toBe(3)
    expect(result.deadLetter).toEqual([])
    expect(result.status).toBe('error')
    expect(result.lastError).toBe('boom')
  })

  it('moves events to deadLetter when attempts reach MAX_ATTEMPTS', async () => {
    // attempts: 4 on entry, the 5th failure pushes it to MAX_ATTEMPTS = 5 → dead-letter.
    const result = await processSyncQueue({
      queue: [okEvent({ attempts: 4 })],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async () => { throw new Error('rls_denied') },
    })

    expect(result.processedCount).toBe(0)
    expect(result.remainingQueue).toEqual([])
    expect(result.deadLetter).toHaveLength(1)
    expect(result.deadLetter[0].type).toBe('card_reviewed')
    expect(result.deadLetter[0].attempts).toBe(5)
    expect(result.deadLetter[0].lastError).toBe('rls_denied')
    expect(result.deadLetter[0].deadLetteredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // Status is 'synced' because remainingQueue is empty — dead-letter is a
    // terminal state, not a pending retry. Callers handle the deadLetter
    // array separately from the synced/error signal.
    expect(result.status).toBe('synced')
  })

  it('handles a mixed queue (success + retry + dead-letter) in one pass', async () => {
    let calls = 0
    const result = await processSyncQueue({
      queue: [
        okEvent({ id: 'ok' }),                                 // succeeds
        okEvent({ id: 'mid', attempts: 1 }),                   // re-queue
        okEvent({ id: 'doomed', attempts: 4 }),                // dead-letter
      ],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async (event) => {
        calls += 1
        if (event.id === 'ok') return true
        throw new Error(`${event.id}_failed`)
      },
    })

    expect(calls).toBe(3)
    expect(result.processedCount).toBe(1)
    expect(result.remainingQueue).toHaveLength(1)
    expect(result.remainingQueue[0].id).toBe('mid')
    expect(result.deadLetter).toHaveLength(1)
    expect(result.deadLetter[0].id).toBe('doomed')
    expect(result.deadLetter[0].lastError).toBe('doomed_failed')
  })

  it('returns an empty deadLetter array on the offline path (no work attempted)', async () => {
    const result = await processSyncQueue({
      queue: [okEvent()],
      isOnline: false,
      cloudSyncEnabled: true,
      processEvent: async () => true,
    })

    expect(result.deadLetter ?? []).toEqual([])
    expect(result.remainingQueue).toHaveLength(1)
    expect(result.status).toBe('pending')
  })
})

// classifySyncError (2026-05-29) — fail-fast classification.
//
// Motivated by the user_cards outage: a missing-column error (Postgres
// SQLSTATE 42703) is NON-retryable — it will never succeed until the schema
// is fixed — yet it burned all 5 retries with exponential backoff before the
// dead-letter signal fired. Classifying such errors as 'fatal' lets the queue
// dead-letter them on attempt 1, surfacing the operator signal immediately.
// Conservative by design: anything unrecognised is 'transient', so a genuine
// network blip is never fast-dropped.

describe('classifySyncError', () => {
  it('flags Postgres class 42 (schema / access rule) SQLSTATE codes as fatal', () => {
    expect(classifySyncError({ code: '42703' })).toBe('fatal') // undefined_column (the outage)
    expect(classifySyncError({ code: '42P01' })).toBe('fatal') // undefined_table (alphanumeric SQLSTATE)
    expect(classifySyncError({ code: '42501' })).toBe('fatal') // insufficient_privilege (RLS)
  })

  it('flags Postgres class 23 (integrity violation) SQLSTATE codes as fatal', () => {
    expect(classifySyncError({ code: '23502' })).toBe('fatal') // not_null_violation
    expect(classifySyncError({ code: '23503' })).toBe('fatal') // foreign_key_violation
  })

  it('flags PostgREST schema-cache codes as fatal', () => {
    expect(classifySyncError({ code: 'PGRST204' })).toBe('fatal') // column not in schema cache
    expect(classifySyncError({ code: 'PGRST205' })).toBe('fatal') // table not in schema cache
  })

  it('flags fatal error MESSAGES even when no code is present', () => {
    expect(classifySyncError({ message: 'column user_cards.deleted does not exist' })).toBe('fatal')
    expect(classifySyncError({ message: 'new row violates row-level security policy for table "user_cards"' })).toBe('fatal')
    expect(classifySyncError({ message: 'permission denied for table profiles' })).toBe('fatal')
  })

  it('treats network / server / auth-not-ready errors as transient (worth retrying)', () => {
    expect(classifySyncError({ message: 'Failed to fetch' })).toBe('transient')
    expect(classifySyncError({ message: 'NetworkError when attempting to fetch resource' })).toBe('transient')
    expect(classifySyncError({ code: '53300' })).toBe('transient') // too_many_connections (server-side)
    expect(classifySyncError({ message: 'cloud_auth_required' })).toBe('transient') // session not ready yet
  })

  it('defaults to transient for null / undefined / unrecognised errors', () => {
    expect(classifySyncError(null)).toBe('transient')
    expect(classifySyncError(undefined)).toBe('transient')
    expect(classifySyncError({})).toBe('transient')
    expect(classifySyncError({ message: 'something weird happened' })).toBe('transient')
  })
})

// processSyncQueue — fail-fast on fatal errors (2026-05-29).
//
// A fatal (non-retryable) error must dead-letter on attempt 1 instead of
// cycling through MAX_ATTEMPTS retries. Transient errors keep the existing
// backoff-and-retry behavior. Pins the regression so a refactor can't make
// schema/permission errors hide behind 5 slow retries again.

describe('processSyncQueue — fail-fast on fatal errors', () => {
  const fatalEvent = (overrides = {}) => ({
    id: 'f-1', type: 'card_reviewed', payload: { malay: 'air' }, attempts: 0, ...overrides,
  })

  it('dead-letters a fatal error on attempt 1 (no retries burned)', async () => {
    const result = await processSyncQueue({
      queue: [fatalEvent()],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async () => { throw Object.assign(new Error('column user_cards.deleted does not exist'), { code: '42703' }) },
    })

    expect(result.remainingQueue).toEqual([]) // NOT re-queued for backoff
    expect(result.deadLetter).toHaveLength(1)
    expect(result.deadLetter[0].attempts).toBe(1) // surfaced immediately
    expect(result.deadLetter[0].fatal).toBe(true)
    expect(result.deadLetter[0].lastError).toMatch(/does not exist/)
  })

  it('still re-queues a TRANSIENT error (does not fast-drop a recoverable blip)', async () => {
    const result = await processSyncQueue({
      queue: [fatalEvent({ attempts: 0 })],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async () => { throw new Error('Failed to fetch') },
    })

    expect(result.deadLetter).toEqual([])
    expect(result.remainingQueue).toHaveLength(1)
    expect(result.remainingQueue[0].attempts).toBe(1)
    expect(result.status).toBe('error')
  })

  it('marks exhausted transient retries as fatal:false in the dead-letter record', async () => {
    const result = await processSyncQueue({
      queue: [fatalEvent({ attempts: 4 })],
      isOnline: true,
      cloudSyncEnabled: true,
      processEvent: async () => { throw new Error('Failed to fetch') },
    })

    expect(result.deadLetter).toHaveLength(1)
    expect(result.deadLetter[0].attempts).toBe(5)
    expect(result.deadLetter[0].fatal).toBe(false)
  })
})
