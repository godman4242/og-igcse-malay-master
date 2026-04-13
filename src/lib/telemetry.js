const TELEMETRY_KEY = 'igcse-malay-telemetry'
const MAX_EVENTS = 500

export function trackEvent(event, payload = {}) {
  const entry = {
    event,
    payload,
    ts: new Date().toISOString(),
  }

  try {
    const prev = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]')
    const next = [...prev, entry].slice(-MAX_EVENTS)
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next))
  } catch {
    // Telemetry must never break app flow.
  }
}

export function getTelemetryEvents() {
  try {
    return JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]')
  } catch {
    return []
  }
}
