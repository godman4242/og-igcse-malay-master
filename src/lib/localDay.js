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
