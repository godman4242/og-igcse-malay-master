import { SUPABASE_CONFIG } from '../config/supabaseConfig'

const MAX_ATTEMPTS = 5

export function createSyncEvent(type, payload = {}) {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  return {
    id,
    idempotencyKey: `sync:${id}`,
    type,
    payload,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  }
}

export function enqueueSyncEvent(queue, event) {
  return [...queue, event]
}

export function nextRetryDelayMs(attempts) {
  const base = 1000
  const capped = Math.min(attempts, 6)
  return base * (2 ** capped)
}

const DEFAULT_RETRY_DELAY_MS = 5000
const MIN_RETRY_DELAY_MS = 1000

/**
 * Given a queue of re-queued (failed) events, return the milliseconds from
 * `now` until the earliest event's `nextRetryAt` becomes due. Floors at
 * MIN_RETRY_DELAY_MS so the caller can't tight-loop on a queue whose
 * nextRetryAt has already passed. Returns null for an empty queue, and
 * DEFAULT_RETRY_DELAY_MS if no event has a parseable nextRetryAt.
 *
 * Used by the store to schedule a single setTimeout-driven retry after a
 * failed flush, instead of letting React effects fire flush calls back-to-
 * back on every sync.status oscillation (which was the mobile sync loop).
 */
export function nextScheduledRetryMs(remainingQueue, now = Date.now()) {
  if (!remainingQueue?.length) return null
  let earliest = Infinity
  for (const ev of remainingQueue) {
    const raw = ev?.nextRetryAt
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (Number.isFinite(t) && t < earliest) earliest = t
  }
  if (!Number.isFinite(earliest)) return DEFAULT_RETRY_DELAY_MS
  return Math.max(MIN_RETRY_DELAY_MS, earliest - now)
}

export async function processSyncQueue({ queue, isOnline, processEvent, cloudSyncEnabled = SUPABASE_CONFIG.enabled }) {
  if (!isOnline) {
    return {
      processedCount: 0,
      remainingQueue: queue,
      status: 'pending',
      lastError: null,
    }
  }

  // Phase 0 fallback: if cloud sync is not configured, local-first mode can safely
  // acknowledge queued items without remote persistence.
  if (!cloudSyncEnabled) {
    return {
      processedCount: queue.length,
      remainingQueue: [],
      status: 'synced',
      lastError: null,
    }
  }

  // If cloud sync is enabled but no remote handler is wired yet, do not drop data.
  if (typeof processEvent !== 'function') {
    return {
      processedCount: 0,
      remainingQueue: queue,
      status: 'error',
      lastError: 'sync_handler_not_configured',
    }
  }

  const remainingQueue = []
  const deadLetter = []
  let processedCount = 0
  let lastError = null

  for (const event of queue) {
    try {
      await processEvent(event)
      processedCount += 1
    } catch (err) {
      const attempts = (event.attempts ?? 0) + 1
      const errMessage = err?.message || 'sync_failed'
      lastError = errMessage
      if (attempts < MAX_ATTEMPTS) {
        remainingQueue.push({
          ...event,
          attempts,
          updatedAt: new Date().toISOString(),
          nextRetryAt: new Date(Date.now() + nextRetryDelayMs(attempts)).toISOString(),
        })
      } else {
        // Exhausted retries. Surface for forensic visibility instead of
        // silently dropping — pre-2026-05-29, this branch was a no-op and the
        // event vanished. Caller decides what to do with the dead letters
        // (console.warn, telemetry, archive to sync_events, etc.).
        deadLetter.push({
          ...event,
          attempts,
          lastError: errMessage,
          deadLetteredAt: new Date().toISOString(),
        })
      }
    }
  }

  return {
    processedCount,
    remainingQueue,
    deadLetter,
    status: remainingQueue.length > 0 ? 'error' : 'synced',
    lastError,
  }
}
