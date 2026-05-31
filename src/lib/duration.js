// Clamp a session duration (seconds) into a sane range before it reaches
// telemetry / history. The Exam Rehearsal and Speaking timers are deliberately
// "soft" (they go red but never lock out — an ADHD-friendly choice), so a
// distracted student can rack up a huge durationSec. Capping at 1h keeps the
// analytics honest: a value past the cap is an abandoned session, not a very
// slow student. See docs/improvements.md §B.
export function capDuration(sec, max = 3600) {
  if (!Number.isFinite(sec) || sec < 0) return 0
  return Math.min(Math.floor(sec), max)
}
