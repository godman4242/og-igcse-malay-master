import { SUPABASE_CONFIG } from '../config/supabase'

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

export async function processSyncQueue({ queue, isOnline, processEvent }) {
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
  if (!SUPABASE_CONFIG.enabled) {
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
  let processedCount = 0
  let lastError = null

  for (const event of queue) {
    try {
      await processEvent(event)
      processedCount += 1
    } catch (err) {
      const attempts = (event.attempts ?? 0) + 1
      lastError = err?.message || 'sync_failed'
      if (attempts < MAX_ATTEMPTS) {
        remainingQueue.push({
          ...event,
          attempts,
          updatedAt: new Date().toISOString(),
          nextRetryAt: new Date(Date.now() + nextRetryDelayMs(attempts)).toISOString(),
        })
      }
    }
  }

  return {
    processedCount,
    remainingQueue,
    status: remainingQueue.length > 0 ? 'error' : 'synced',
    lastError,
  }
}
