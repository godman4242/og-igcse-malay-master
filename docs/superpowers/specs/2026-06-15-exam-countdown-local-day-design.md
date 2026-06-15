# Exam countdown — local-calendar day count (kill the UTC off-by-one)

**Date:** 2026-06-15 · **Loop cycle** (self-sourced, queue empty → GOAL-driven assessment).
**Axis:** 1 — Correctness & content truth (HIGHEST). **Status:** design → build this cycle.

## Problem (Real — reproducible)

`examDate` is stored as a date-only `YYYY-MM-DD` string (from `<input type="date">`,
`Settings.jsx:534`). Four places compute "days until exam" with
`Math.ceil((new Date(examDate) - new Date()) / 86400000)`.

`new Date("2026-06-20")` is parsed as **UTC midnight** (ECMAScript date-only rule), but it is
subtracted from a **local** `new Date()` — conflating UTC and local day. For any learner EAST of
UTC (the entire **UTC+8 Malaysian primary audience**), the countdown is **over by one** during the
early-morning local hours (a window equal to the UTC offset, ~08:00 for KL).

**Proven** (`TZ=Asia/Kuala_Lumpur node`):
- KL local **June 20 04:00**, exam `2026-06-20` → buggy `daysLeft = 1` (should be **0 — exam is today**).
- KL local **June 15 03:00**, exam `2026-06-20` → buggy `daysLeft = 6` (should be **5**).

This is the SAME bug class the repo already fixed for day-keys in `src/lib/localDay.js` (P2-C3,
"day rolls over at 08:00 local not midnight") — the `examDate` countdown was never brought under
that fix. Streaks/`reviewedToday` correctly use `toDateString()` (local) and are NOT affected.

### Blast radius (4 consumers — all share the broken expression)
1. `src/store/useStore.js:589` — `ensureDailyChallenge` → `daysLeft` → exam `mode`
   (`final_sprint`/`exam_week`/`normal`) → challenge intensity multipliers. Off-by-one can flip the
   mode at a boundary (e.g. 11 vs 10 → `normal` vs `exam_week`).
2. `src/store/useStore.js:1810` — `getStudyPlan` → `daysLeft`, rendered in Dashboard + DailyPlan UI.
3. `src/lib/feedback.js:58` — `daysToExam` → the Feed-Up coaching goal line ("N days to exam").
4. `src/pages/Settings.jsx:547` — the literal "N days until exam" label under the date picker.
   (`useStore.js:1146` uses an FSRS *timestamp*, not the date string — NOT affected.)

## Fix (surgical — one pure helper, 4 one-line call-site swaps)

Add to `src/lib/localDay.js` (it already owns local-day logic):

```js
export function daysUntilLocalDate(dateStr, now = new Date()) { … }
```
- Parse a `YYYY-MM-DD` string as a **LOCAL** calendar date (`new Date(y, m-1, d)`), not UTC.
- A full ISO timestamp is also accepted (its LOCAL calendar date is used) — keeps the existing
  `feedback.test.js` (which passes synthetic full-ISO examDates) green.
- Compute `now`'s local midnight the same way; return the **signed** rounded calendar-day diff
  (`Math.round` of two local midnights → DST-robust). Callers keep their own `Math.max(0, …)` /
  `< 0` clamps.

## Measurable Done (observable pass/fail)
- New unit tests in `src/lib/__tests__/localDay.test.js` (red-proofed): for a positive-TZ `now`,
  `daysUntilLocalDate('2026-06-20', <June 20 local morning>) === 0` (was 1);
  `… '2026-06-20', <June 15 local morning> === 5` (was 6); same-day → 0; past → negative; full-ISO
  input still yields the whole-day count.
- Existing `feedback.test.js` exam-date band tests stay GREEN (verified: both exam + now shift by
  the same TZ offset, so the calendar diff is preserved).
- `npm run build && npm run test:run && npm run lint` all green.

## What NOT to break
- `examDate` stored format unchanged (`YYYY-MM-DD`) → **no STORE_VERSION bump / no migration**.
- No schema / free-path / `instruct.js` change; no feature deleted. No content authored (pure date
  logic — the only thing to "verify" is the ECMAScript parse rule, proven above).
- The "N days to exam" wording, the mode thresholds, and the `< 0 → null` past-exam guard all keep
  their current semantics; only the day NUMBER is corrected.

## Decide-and-flag
- *Decision:* one shared `daysUntilLocalDate` helper in `localDay.js`; all 4 sites call it.
  *Why:* a single source of truth prevents the 4 copies drifting again (the exact failure that left
  this site behind when P2-C3 fixed the others). *Veto (inline-fix each site):* rejected — 4 copies
  is what caused the miss.
- *Decision:* accept full-ISO timestamps in the helper. *Why:* keeps the existing synthetic-input
  feedback tests green without rewriting them; harmless for real `YYYY-MM-DD` data. *Veto:* none.
- *Decision:* `Math.round` of two local midnights (not `ceil` of fractional ms). *Why:* exact
  calendar-day count + DST-robust. *Veto (keep `ceil`):* rejected — `ceil` of a fractional UTC diff
  is the bug.
