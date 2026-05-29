# IGCSE Malay Master — Daily Plan Spine ("What should I do today?")

**Status:** DRAFT — awaiting user review
**Date:** 2026-05-29
**Builds on:** `docs/superpowers/specs/2026-04-15-learning-first-redesign.md` (APPROVED)
**Author:** brainstorming session (Claude), grounded in a full read of `useStore.js`, `Dashboard.jsx`, `interleave.js`, `learnerProfile.js`

---

## 1. Problem Statement

The app is feature-complete and the infrastructure war is over (cloud sync fully
hardened, 262 tests green, all 5 Zero-Waste phases shipped). The remaining gap is
**not a missing feature — it is missing direction.**

A student who opens the app lands on a Dashboard that already renders **eight
independent signals**, each as its own widget:

- current streak (`getStreak`)
- exam study plan + recommendation (`getStudyPlan`)
- daily challenge progress (`getChallengeStats`)
- top unfixed mistakes (`getFixUpQueue`)
- due-now card count (`getDueCards`)
- exam readiness % (`getExamReadiness`)
- next exam rehearsal due (`getNextExamDue`)
- recent performance / worst turn (`RecentPerformance`, `WorstTurnWidget`)

All the *intelligence* exists. What's missing is **synthesis**: the student still
has to scan eight widgets and decide for themselves what to do in their 10–20
minutes. For an anxious 16-year-old the night before Paper 3, that cognitive
load is exactly the friction we should remove.

**This spec adds one thing: a single, ordered, time-budgeted action queue at the
top of the Dashboard that answers "what should I do right now?" and routes the
student straight into it.** It is an *orchestration layer over existing signals*,
not a new feature surface.

## 2. Design Principles (inherited + specific)

Inherited from the Learning-First Redesign (binding):

1. **Learning science first.** The plan's ordering is justified by evidence
   (see §4.2), not by gamification convenience.
2. **Static-first / cannot crash.** The engine is a pure client-side function
   with zero server dependency. It must work for an offline Static-tier user.
3. **Tiered access, not tiered learning.** The plan must render and be useful
   for **Static-tier** users who have **no `dailyChallenge`** and no telemetry.
   Enhanced-tier perks (XP on challenge completion) ride on top, never gate it.

Specific to this spec:

4. **Synthesis, not duplication.** Read existing getters; do **not** invent a
   parallel daily-counter that competes with `dailyChallenge`.
5. **Zero new persisted state.** Completion is *derived* from existing history
   timestamps. No new store field, **no `STORE_VERSION` bump**, no migration —
   the lowest-risk path in the most regression-prone file.
6. **Additive UI.** A new component mounted at the top of the Dashboard. No
   existing widget is removed or rewritten (the eight signals remain as
   "details below").

## 3. Architecture Overview

```
                 ┌─────────────────────────────────────────────┐
                 │  Dashboard.jsx (already holds all inputs in   │
                 │  scope: cards, studyPlan, challenge,          │
                 │  fixUpQueue, examReadiness, examDue,          │
                 │  speakingHistory, writingHistory, examAttempts)│
                 └───────────────────────┬───────────────────────┘
                                         │ assembles a plain inputs object
                                         ▼
        ┌────────────────────────────────────────────────────────────┐
        │  src/lib/dailyPlan.js  (NEW — pure, no React, no store)      │
        │                                                              │
        │  buildDailyPlan(inputs, now) → { tasks[], budgetMin,         │
        │                                  readiness, phase }          │
        │  deriveTaskDone(task, inputs, now) → boolean                 │
        └───────────────────────────────┬──────────────────────────────┘
                                         │ ordered task list
                                         ▼
        ┌────────────────────────────────────────────────────────────┐
        │  src/components/dashboard/DailyPlan.jsx  (NEW — presentation) │
        │  renders ordered step cards, readiness bar, routes via        │
        │  navigate(task.route); shows ✓ for derived-complete steps.    │
        └────────────────────────────────────────────────────────────┘
```

**Why a pure function taking an inputs object (not a store getter):** the
Dashboard already extracts every needed getter and calls it in the component
body (the documented safe pattern — getters allocate, never call them inside a
selector). `buildDailyPlan` receives those already-computed values as a plain
object, so it is trivially unit-testable with fixtures and adds **no new store
getter** (avoids the "allocate inside selector" pitfall entirely).

## 4. The Engine — `src/lib/dailyPlan.js`

### 4.1 Inputs contract

`buildDailyPlan(inputs, now = Date.now())` where `inputs` is:

```js
{
  cards,            // full deck (for due + weak derivation)
  grammarCards,     // {} keyed by drill id
  studyPlan,        // getStudyPlan() result OR null (no examDate)
  challenge,        // getChallengeStats() result OR null (Static tier / not generated)
  fixUpQueue,       // getFixUpQueue(n) array (may be [])
  examReadiness,    // getExamReadiness() OR null (no attempts)
  examDue,          // getNextExamDue() result
  speakingHistory,  // [{ ts, band, ... }]
  writingHistory,   // [{ ts, score|band, ... }]
  examAttempts,     // [{ ts, ... }]
  dailyGoalLevel,   // 'casual' | 'standard' | 'intensive'
  isComeback,       // boolean (>=7 days idle)
}
```

All fields are optional/nullable; the engine must never throw on missing data.
It returns a stable, JSON-serialisable result (easy to snapshot-test).

### 4.2 Task taxonomy & prioritisation

The engine emits an **ordered** list of task objects:

```js
{
  id,            // stable string, e.g. 'review' | 'fixups' | 'speaking' | ...
  kind,          // category for icon/colour
  label,         // "Review due cards"
  sublabel,      // "12 cards · ~6 min"
  route,         // existing route, e.g. '/study' | '/smart-study' | '/speaking'
  estMinutes,    // integer estimate
  reason,        // one-line "why this matters now" (elaborative)
  priority,      // numeric (higher = earlier); for stable sort + tests
  done,          // filled by deriveTaskDone at render
}
```

**Priority order (evidence-anchored):**

1. **Overdue spaced review** (`/smart-study` if interleaving available, else
   `/study`). *Highest* — spaced repetition is time-sensitive; a lapsed card
   loses its scheduling value. Skipped only if 0 due. (Roediger & Karpicke,
   testing effect; FSRS scheduling.)
2. **Top weakness fix-ups** (`getFixUpQueue` non-empty → `/mistakes` or
   Mistakes deck in `/study`). Targeted error correction beats undirected
   practice. Capped at the single highest-priority cluster to avoid overload.
3. **Skill rotation focus** — exactly **one** of speaking / writing / grammar,
   chosen by *weakest recent band* and *interleaving novelty* (don't repeat
   yesterday's skill if data shows it). Routes to `/speaking`, `/writing`, or
   `/grammar`. (Interleaving: Rohrer & Taylor.)
4. **Exam rehearsal** when `examDue.dueNow` (or `daysLeft <= 1`) → `/exam-rehearsal`.
5. **Foundation/new vocab** when the deck is thin or far from exam → `/word-families`.

**Phase modulation** (mirrors `getStudyPlan.phase` / `ensureDailyChallenge.mode`
so the spine and the existing challenge agree):
- `> 30 days` (build): weight toward foundation + vocab.
- `14–30` (strengthen): weight toward fix-ups + weak skills.
- `3–14` (review): weight toward exam rehearsal + full review.
- `<= 3` (final): light review only; demote heavy tasks; surface a "rest well"
  reassurance line (matches `getStudyPlan` "final" copy).

**Comeback modulation:** if `isComeback`, front-load a short, high-success
review and soften copy ("Welcome back — let's ease in") to lower re-entry
friction (desirable-difficulty / anxiety reduction).

### 4.3 Time budget

`budgetMin` derived from `dailyGoalLevel`: casual ≈ 10, standard ≈ 20,
intensive ≈ 40 minutes. The engine fills tasks in priority order, accumulating
`estMinutes`, and stops adding once budget is reached — but **always** includes
overdue review if any exist (never let the budget hide time-sensitive work).
Target: **3–4 tasks**, never more than 5 (overload guard).

### 4.4 Readiness surface (graceful degradation — explicit)

The plan header shows ONE readiness figure, chosen in this order:

1. `examReadiness.smoothed` (band-based, most exam-meaningful) **if** exam
   attempts exist.
2. else `studyPlan.readinessPct` (card-maturity) **if** `examDate` is set.
3. else **no number** — a neutral prompt: "Do an exam rehearsal to unlock your
   readiness score" linking `/exam-rehearsal`.

The header also shows days-to-exam (`studyPlan.daysLeft`) when available.

### 4.5 Completion derivation — `deriveTaskDone(task, inputs, now)`

No new persisted state. "Done today" is derived from existing signals, where
`today` = local ISO date of `now`:

| Task kind   | "done today" signal |
|-------------|--------------------|
| review      | `challenge.reviewDone >= challenge.reviewTarget` (Enhanced) **OR** any card with `last_review` dated today (Static fallback) |
| grammar     | `challenge.grammarDone >= challenge.grammarTarget` (Enhanced) **OR** any `grammarCards[id].last_review` today (Static) |
| fixups      | a mistake with `lastReviewedAt` dated today |
| speaking    | a `speakingHistory` entry with `ts` today |
| writing     | a `writingHistory` entry with `ts` today |
| exam        | an `examAttempts` entry with `ts` today |
| foundation  | any card with `last_review` today (proxy) |

Completed steps render with a ✓ and de-emphasised styling but remain tappable
(a student can re-do them). When **all** budgeted tasks are done, the header
flips to a celebratory "You've done today's plan 🎉" state (re-using existing
confetti only at the Enhanced tier, consistent with the tier table).

> **Verify before build:** confirm the exact field names `last_review` (cards),
> `last_review`/`due` (grammarCards), `lastReviewedAt` (mistakes), and `ts`
> (speaking/writing/examAttempts) against the live store at implementation time.
> The card field is `last_review` per `FirstRunCard`'s gate; grammar/mistake
> fields to be re-grepped in the plan step.

## 5. UI — `src/components/dashboard/DailyPlan.jsx`

- Mounted in `Dashboard.jsx` **at the top of the activated-user view**, directly
  below the existing `<FirstRunCard />` slot. **Self-hides** when the deck is
  empty / brand-new (the empty-deck `FirstRunCard` owns that moment — no
  conflict, no double-CTA). Gate: render only when `cards.length > 0`.
- Header: title "Your plan for today", `~N min` budget chip, readiness bar
  (per §4.4), days-to-exam pill when known.
- Body: 3–4 ordered step rows. Each row: index number, icon (lucide, reuse
  Dashboard's set), label + sublabel, `reason` as muted helper text, chevron.
  Whole row is the tap target (≥44px), `onClick={() => navigate(task.route)}`.
- Done rows: ✓ badge, reduced opacity, still tappable.
- "All done" state: collapses rows into the celebratory header; offers a single
  "Keep going →" link to `/smart-study` for over-achievers.
- Styling: `var(--color-*)` only, dark + light, honours `theaterMode` (hidden in
  Theater Mode like other dashboard chrome). No new dependency. No framer-motion
  (CSS only — same rule as the page-transition + toast work).
- Telemetry (Enhanced only, fire-and-forget via existing `trackEvent`):
  `daily_plan_shown` (taskCount, budgetMin, doneCount), `daily_plan_task_clicked`
  (kind, index), `daily_plan_completed` (when all done). Guard so `_shown`
  fires once per mount.

## 6. What is explicitly OUT of scope (YAGNI)

- No new store slice, getter, action, or `STORE_VERSION` bump.
- No change to `dailyChallenge` semantics or XP rules.
- No redesign / removal of the eight existing widgets (they stay as detail).
- No AI calls (the plan is pure local logic — works offline, Static tier).
- No multi-day plan / calendar view. Today only.
- No reordering by drag, no user customisation of the plan. (Revisit later if
  requested.)

## 7. Testing

**Unit — `src/lib/__tests__/dailyPlan.test.js`** (the bulk; pure fn = exhaustive):
- empty deck → returns empty/foundation-only, never throws
- many due cards → review is task #1
- 0 due, fix-ups present → fix-ups lead
- near-exam (`daysLeft <= 3`) → demotes heavy tasks, surfaces final-push copy
- far-from-exam → foundation/vocab weighted
- weak speaking band vs weak writing band → correct single skill chosen
- budget fill: casual vs intensive yields fewer/more tasks; overdue review
  always included even past budget
- readiness degradation: attempts→smoothed; no attempts+examDate→maturity;
  neither→null prompt
- comeback flag → soft copy + front-loaded review
- `deriveTaskDone`: each kind's signal true/false across today vs yesterday
  timestamps; Static (no challenge) vs Enhanced paths
- Static tier (challenge=null, examReadiness=null, examDate=null) → still
  returns a coherent plan

**E2E — `tests/e2e/daily-plan.spec.js`** (follows the `bindStore` `?t=` trap
convention documented in CLAUDE.md):
- plan renders at top of Dashboard for an activated deck
- a task row navigates to its route
- empty deck → DailyPlan hidden, FirstRunCard shown (no conflict)
- after reviewing cards, the review row shows ✓ on return to Dashboard

## 8. Verification gates (CLAUDE.md "AI Agent Mindset")

After each logical change: `npm run lint` (0 errors; only the 3 known
exhaustive-deps warnings). After the engine + completion logic:
`npm run test:run` (all green, including the new suite). Before "done":
`npm run build` (zero errors; `index-*.js` stays ~420 KB / ~128 KB gz — this is
additive client code, watch it doesn't balloon). Manual: all 15 routes still
render, dark + light both correct, no infinite-render warning, persistence
survives reload. Then update `RESUME_HERE.md` (same commit discipline as memory
`[[feedback_handoff_docs]]`).

## 9. Open decisions (defaulted; flag if you disagree on review)

1. **Completion = derived-only, no persisted field.** Default chosen for zero
   migration risk. Trade-off: a task with no history signal can't show ✓; we
   only track the kinds in §4.5 (covers all current task kinds). *(Alternative
   if you want bulletproof completion: a tiny `dailyPlanDone: { date, ids[] }`
   slice + STORE_VERSION 21→22. Not chosen — higher risk, marginal gain.)*
2. **Combined review routes to `/smart-study`** (interleaved) when a deck has
   mixed due content, else `/study`. Interleaving is the pedagogically stronger
   default per the Learning-First spec.
3. **One skill task per day**, not all three — avoids the exact overload the
   spine exists to remove.
4. **DailyPlan placement:** top of activated view, below FirstRunCard slot,
   above streak/stat widgets.

## 10. File-level change summary

| File | Change | Risk |
|------|--------|------|
| `src/lib/dailyPlan.js` | NEW — pure engine + `deriveTaskDone` | low (pure, tested) |
| `src/components/dashboard/DailyPlan.jsx` | NEW — presentation | low (additive) |
| `src/pages/Dashboard.jsx` | mount `<DailyPlan/>`, assemble inputs object | medium (read full file first; surgical insert; the inputs are already in scope) |
| `src/lib/__tests__/dailyPlan.test.js` | NEW — unit suite | none |
| `tests/e2e/daily-plan.spec.js` | NEW — e2e | none |
| `RESUME_HERE.md` | session entry | none |

**No** change to `useStore.js`, no `STORE_VERSION` bump, no schema/Supabase
change.

---

## Next step

Per the brainstorming workflow, the terminal step is the `writing-plans` skill
to turn this into a step-by-step implementation plan. **Held at the user-review
gate:** the user asked to perfect the plan; this spec is presented for their
review before any implementation begins.
