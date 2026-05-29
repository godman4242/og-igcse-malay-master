// src/lib/telemetry.js
// Dual write: localStorage always, Supabase for enhanced+ users (fire-and-forget)
// supabase.js is dynamic-imported so this hot-path module stays out of the
// cold-load chunk that pulls @supabase/supabase-js.

const TELEMETRY_KEY = 'igcse-malay-telemetry'
const MAX_EVENTS = 500

let cloudEnabled = false
// Authenticated user id, set on enable. Lets server-side telemetry attribute
// events to a user without a separate join.
let cloudUserId = null

// One stable id per page load / tab — turns the cloud telemetry stream into
// queryable funnels (group by session_id to follow a single visit). Injected
// into cloud payloads only; the local copy stays lean.
function makeSessionId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* fall through to the cheap fallback */ }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
const SESSION_ID = makeSessionId()

/**
 * Enable cloud telemetry (called when user authenticates as enhanced/admin/owner).
 * @param {string} [userId] authenticated user id, attached to cloud events.
 */
export function enableCloudTelemetry(userId = null) {
  cloudEnabled = true
  if (userId) cloudUserId = userId
}

/**
 * Disable cloud telemetry (called on sign out or if user is static).
 */
export function disableCloudTelemetry() {
  cloudEnabled = false
  cloudUserId = null
}

export function trackEvent(event, payload = {}) {
  const entry = {
    event,
    payload,
    ts: new Date().toISOString(),
  }

  // Always write to localStorage
  try {
    const prev = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]')
    const next = [...prev, entry].slice(-MAX_EVENTS)
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next))
  } catch {
    // Telemetry must never break app flow.
  }

  // Fire-and-forget to Supabase for enhanced+ users. Vite/browser caches the
  // import after first resolve, so repeated calls don't re-fetch the chunk.
  if (cloudEnabled) {
    // Enrich cloud events with session + user so the funnel is queryable.
    // telemetry_events.payload is JSONB — additive, no schema change.
    const cloudPayload = { ...payload, session_id: SESSION_ID }
    if (cloudUserId) cloudPayload.user_id = cloudUserId
    import('../config/supabase')
      .then(({ sendTelemetryEvent }) => sendTelemetryEvent(event, cloudPayload))
      .catch(() => { /* never break app flow */ })
  }
}

export function getTelemetryEvents() {
  try {
    return JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]')
  } catch {
    return []
  }
}
