/**
 * Local-calendar day keys (P2-C3).
 *
 * `new Date().toISOString().split('T')[0]` gives the day in **UTC**, so for a
 * learner in UTC+8 (Malaysia — our primary audience) the "day" rolls over at
 * 08:00 local, not midnight. That silently mis-buckets the heatmap, the daily
 * challenge, the AI quota, the For-You shelf window, and the study-history
 * sparkline. This is the single shared helper every functional day-key site
 * uses so all of them roll over at the same (local) midnight.
 *
 * Streaks already use `toDateString()` (local) — keep them as-is; this only
 * replaces the UTC `toISOString` day-keys.
 */

// Local YYYY-MM-DD for an arbitrary Date (defaults to now). Uses the LOCAL
// getFullYear/getMonth/getDate fields, so it never shifts across the UTC line.
export function toLocalISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Today's local day key — the local replacement for the old getTodayISO().
export const getTodayISO = () => toLocalISO()

// Whole LOCAL-calendar days from `now` until `dateStr` (the exam countdown).
//
// `dateStr` is the YYYY-MM-DD value an <input type="date"> produces. The naive
// `Math.ceil((new Date(dateStr) - new Date()) / 86400000)` is wrong because
// `new Date('2026-06-20')` parses as UTC midnight, then gets subtracted from a
// LOCAL `now` — so for the UTC+8 audience the countdown reads one day too high
// during the 00:00–08:00 local window (the same P2-C3 UTC-vs-local day bug the
// rest of this module fixes for day-keys). Here we parse the date as a LOCAL
// calendar date and diff two local midnights, so the count rolls over at local
// midnight. Returns a SIGNED integer (negative once the exam has passed; null
// for empty/unparseable input); callers apply their own Math.max(0, …) / < 0.
export function daysUntilLocalDate(dateStr, now = new Date()) {
  if (!dateStr) return null
  let y, m, d
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr) // date-only OR the date part of a timestamp
  if (iso && dateStr.length === 10) {
    // Pure YYYY-MM-DD → take its digits as a LOCAL calendar date (never UTC).
    y = +iso[1]; m = +iso[2]; d = +iso[3]
  } else {
    // A full timestamp (or other parseable form) → use its LOCAL calendar date.
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return null
    y = parsed.getFullYear(); m = parsed.getMonth() + 1; d = parsed.getDate()
  }
  const examMid = new Date(y, m - 1, d)              // local midnight of the exam day
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Round the diff of two local midnights → exact calendar-day count, DST-robust.
  return Math.round((examMid.getTime() - todayMid.getTime()) / 86400000)
}
