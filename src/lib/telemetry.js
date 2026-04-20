// src/lib/telemetry.js
// Dual write: localStorage always, Supabase for enhanced+ users (fire-and-forget)

import { sendTelemetryEvent } from '../config/supabase'

const TELEMETRY_KEY = 'igcse-malay-telemetry'
const MAX_EVENTS = 500

let cloudEnabled = false

/**
 * Enable cloud telemetry (called when user authenticates as enhanced/admin/owner).
 */
export function enableCloudTelemetry() {
  cloudEnabled = true
}

/**
 * Disable cloud telemetry (called on sign out or if user is static).
 */
export function disableCloudTelemetry() {
  cloudEnabled = false
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

  // Fire-and-forget to Supabase for enhanced+ users
  if (cloudEnabled) {
    try { sendTelemetryEvent(event, payload) } catch { /* silent */ }
  }
}

export function getTelemetryEvents() {
  try {
    return JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]')
  } catch {
    return []
  }
}
