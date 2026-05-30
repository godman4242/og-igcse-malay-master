# Session handoff — 2026-05-30 11:13 — clean checkpoint, Speaking is next

This is NOT a mid-task rescue. Everything is committed, pushed, and verified
green. This snapshot exists so the next session resumes cheaply (this
conversation's context grew large) and to tee up the Speaking brainstorm.

## 1. Where we are

- **HEAD:** `9a7ccc8` on `main`, in sync with `origin/main`.
- **Working tree:** clean (nothing uncommitted).
- **Gates (captured 2026-05-30 ~11:07):** lint **0 errors / 3 pre-existing
  warnings**; **284 vitest pass**; build clean (index ~421.6 KB / ~135 KB gz).

## 2. What shipped this run (git log has the detail — don't re-recap)

- `305450f` Daily Plan spine — ordered "what should I do today?" queue on the
  Dashboard (pure `src/lib/dailyPlan.js` + `src/components/dashboard/DailyPlan.jsx`;
  +22 unit, +3 e2e; no STORE_VERSION bump).
- `80d34fb` Telemetry Option A — `session_id` + `user_id` on cloud events; also
  removed the inert `isHydratingCloud` field + CLAUDE.md size note.
- `9a7ccc8` PWA `registerType: 'autoUpdate'`, EN-roleplay quota fallback now
  links to `/grammar`, and a SELF-GUARDING `user_profiles` drop migration
  (`supabase/migrations/20260529_drop_vestigial_user_profiles.sql`) — written,
  NOT run.

Specs live in `docs/superpowers/specs/2026-05-29-daily-plan-spine-design.md`
and `…-speaking-pillar-opportunity-brief.md`.

## 3. What's open / needs a decision (NOT blocked — just not started)

- **Speaking pillar (the next real feature).** User chose to brainstorm it
  TOGETHER rather than have it built solo. Decisions to make live in the
  opportunity brief §3: which outcome — **progression** ("am I getting better?":
  band trend + recurring-weakness; my recommendation) vs **exam-realism** (full
  timed Paper 3 mock) vs **pronunciation precision**. Speaking is already MATURE
  (turn-based roleplay, heuristic+AI grader, word-level pronunciation diff) — so
  scope a bounded, additive v1, don't rebuild.
- **AuthGuard `cardDelta` tiebreaker redesign** — parked; needs its own
  brainstorm. Not urgent.
- **`/understand` re-run** — repeatedly deferred. It does NOT improve Claude's
  code quality (live source + CLAUDE.md + RESUME_HERE are a better, current
  context layer); it's a shareable visual for non-coders and is token-heavy.
  Only run on explicit request when budget is comfortable.

### Action items that are the USER's, not Claude's
- Run the `user_profiles` drop migration in the Supabase SQL editor when ready
  (self-guarding: refuses if the table has rows). Pure housekeeping.
- Be aware: PWA now auto-reloads on new deploys — could interrupt a student
  mid-essay (rare). Refinement noted in RESUME_HERE if it ever bites.
- 30-second visual eyeball of the Daily Plan card (dark + light) — the one thing
  e2e can't cover. Behaviour (render/route/hide) is already pinned by e2e.

## 4. Verify before resuming

```bash
git log --oneline -5      # newest should be 9a7ccc8 (or later if a commit landed)
git status --short        # expect clean
npm run test:run          # baseline 284 pass at handoff
npm run lint              # 0 errors; 3 pre-existing warnings at handoff
```
At handoff: HEAD `9a7ccc8`, 284 tests pass, lint 0 errors + 3 warnings. If
counts differ, a commit landed in between — read `git log` to understand, then
proceed. Don't treat a difference as an error.

## 5. Hard rules still in force (auto-loaded via MEMORY.md)

`[[feedback_no_auto_commit]]` (VS Code → run git directly; destructive ops still
confirm), `[[project_git_autopush]]` ("Everything up-to-date" after commit is
normal — postinstall hook pushes; also stages all changes), `[[project_invariants]]`
(no paywall, invite-only, individual-revision only, no native apps, learning
quality first), `[[feedback_handoff_docs]]` (update RESUME_HERE in the same
commit as behaviour changes), `[[feedback_overnight_longest_task.md]]` (pick the
highest-value bounded build, not the literally-longest sprawling one).

## ⚠ Inventory check (surface, don't fix)

Crude grep of plugin cache (`claude-plugins-official`, `openai-codex`,
`understand-anything`) + a few MCPs against `project_skills_inventory.md` showed
apparent misses for `claude-plugins-official`, `openai-codex`, `vercel`. These
are almost certainly **naming-format artifacts** (cache-dir repo names vs the
inventory's namespace names like `codex`/`superpowers`), not true drift. Worth a
proper reconcile sometime; not blocking. MCP health at handoff: Vercel, Zoom,
Google Drive, Figma, Granola, Google Calendar, Gamma, GoDaddy, context7 all
Connected; Supabase/Linear/Owkin/Gmail/Canva need auth; `plugin:github` failed.

## 6. Next-session prompt

```
You are continuing work on IGCSE Malay Master — a React SPA for IGCSE Malay AND
English revision (FSRS spaced repetition, AI roleplay, grammar tutor, writing
analysis, speaking practice, exam rehearsal). Live: https://upg-igcse-malay-master.vercel.app.
We're at a CLEAN, fully-committed checkpoint (HEAD 9a7ccc8) — nothing is broken
or half-done. The goal this session is to BRAINSTORM the Speaking pillar, then
spec it.

Before doing anything:
1. Read `project_skills_triage.md` from auto-memory FIRST — green skills are your
   toolset, red skills are off-limits for this project. Read
   `project_skills_inventory.md` only if the triage doesn't cover a capability
   you need. Run `claude mcp list 2>&1 | head -20` once to confirm active MCPs.
2. Hard rules (auto-loaded via MEMORY.md, but don't overlook them):
   [[feedback_no_auto_commit]], [[project_git_autopush]], [[project_invariants]],
   [[feedback_handoff_docs]], [[feedback_overnight_longest_task]].

Read order:
- `docs/superpowers/specs/2026-05-29-speaking-pillar-opportunity-brief.md` (the
  state-map + the §3 decisions to make) — THIS is the starting point.
- `docs/sessions/2026-05-30-mid-clean-checkpoint-speaking-next.md` (this handoff).
- `RESUME_HERE.md` for historical context (top blocks first).

Verify state hasn't drifted:
  git log --oneline -5      # newest should be 9a7ccc8 (or later)
  git status --short        # expect clean
  npm run test:run          # baseline was 284 pass at handoff
  npm run lint              # 0 errors + 3 pre-existing warnings at handoff
If counts differ, a commit landed since handoff — read git log, then proceed.

The specific request: invoke the brainstorming skill and walk me through the
Speaking pillar §3 decisions — which student outcome to build (progression vs
exam-realism vs pronunciation), then depth and AI-budget. Speaking is ALREADY
mature (turn-based roleplay, heuristic+AI grader, word-level pronunciation diff)
— so the goal is a bounded, additive v1 that does NOT rebuild what exists. End
the brainstorm by writing a real implementation spec; don't start coding until I
approve it.

Mindset: quality over speed; I'm budget-conscious, so don't run /understand or
other token-heavy tooling unless I ask. Surgical diffs only. Verify before
claiming done.
```
