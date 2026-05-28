# 2026-05-28 — Mid-session handoff: First-Run Tour shipped, P1 sync loop next

**Slug:** settings-sync-loop · **Captured:** 2026-05-28 17:18

## 1. Where we are

- **Branch:** `main`, clean working tree, up to date with `origin/main`.
- **HEAD:** `af15ee5` — docs(first-run-tour): session note + RESUME_HERE refresh + screenshots.
- **All First-Run Tour work merged.** Five commits from `b1d4753` →
  `af15ee5` on top of `228dde1` (plan). Auto-push hook landed every
  commit.

## 2. What's in flight

### Just shipped (closed, not in-flight)
First-Run Tour activation card on Dashboard. See
`docs/sessions/2026-05-27-first-run-tour-session.md` for the
post-mortem. Verified 0 lint errors / 214 vitest / 14 Playwright /
build clean (`index-*.js` 410.65 KB raw / 131.74 KB gz, Δ +1.52 KB
raw vs `228dde1`).

### True in-flight: none
This session also completed a telemetry audit. No code was written
for it — findings only. The Option A fix (inject `user_id` +
`session_id` into telemetry payload) is **queued, not started**. No
mid-air files, no half-applied diffs.

### Decisions made this session
1. **Telemetry audit conclusion.** The independent reviewer's
   flagged "event vs event_type" bug is NOT a bug — the renaming
   inside `sendTelemetryEvent` (`src/config/supabase.js:84`) is
   correct. localStorage key `event` and SQL column `event_type`
   are intentional schema differences.
2. **Real telemetry gap surfaced:** `telemetry_events` schema has
   `(id, event_type, payload, created_at)` only. **No `user_id`,
   no `session_id`.** RLS allows guest inserts. Every other cloud
   table is keyed by `user_id`; telemetry is the lone anonymous
   exception. This means the First-Run Tour funnel metric the spec
   promised ("show-rate, click-rate, conversion to first review")
   cannot be computed per-user from cloud SQL. 25+ existing
   `trackEvent` callers share this limitation.
3. **Recommended fix is Option A** — inject `user_id` +
   `session_id` into `payload` for authed users in
   `src/lib/telemetry.js` and/or `src/config/supabase.js:79-91`.
   ~10 lines, no schema migration, anonymous semantics preserved
   for guests. Query path becomes
   `SELECT payload->>'user_id', COUNT(*) GROUP BY 1`.
4. **Why we're handing off instead of doing the telemetry fix:**
   The user prioritised "the fix that improves the website's
   quality the most". The P1 settings sync loop is a user-facing
   bug breaking authed users' Settings flow (mobile hangs
   indefinitely). The telemetry fix is internal-facing data
   quality. P1 wins on user impact.

### Verification snapshots at handoff time
- `npm run lint` — 0 errors, **3 pre-existing warnings** in
  `RoleplayScorecard.jsx`, `Comprehension.jsx`, `Roleplay.jsx`.
- `npm run test:run` — **214/214 tests across 16 files** pass in
  ~0.9 s.
- `npm run test:e2e` — 14/14 Playwright pass (verified earlier
  this session, not re-run at handoff).

## 3. What's blocked / open questions

### Primary next-session task: P1 Settings sync loop
- **Symptom:** logged-in users on `/settings` see "syncing your
  data" fire repeatedly; mobile gets stuck in syncing forever.
- **Memory:** `project_bug_settings_sync_loop.md` (auto-loaded
  via MEMORY.md).
- **Suspected root cause** (from memory): a `useEffect` in
  Settings or a sync hook whose deps include a value the sync
  handler mutates → infinite re-trigger. Mobile compounds with
  slower network so in-flight sync never resolves.
- **Where to look first:**
  - `src/pages/Settings.jsx` — any `useEffect` calling sync
    actions.
  - `src/lib/syncEngine.js` / `src/lib/cloudSync.js` — sync
    status mutations.
  - `src/store/useStore.js` — `sync.syncStatus`, `sync.queue`,
    anything touching `sync.*` in setters (lines ~200-290 are
    where I saw sync events fire during the audit).
- **Approach:** `superpowers:systematic-debugging` — form
  hypothesis, build minimal repro, isolate root cause, then fix.
  Requires a signed-in account in dev (or a deployed environment
  with `?devauth` if such a thing exists — confirm with user).
- **Don't bundle with First-Run Tour cleanup** — it's a different
  surface, different system. Separate ticket.

### Secondary queued task: telemetry Option A fix
- **What:** Inject `user_id` (from `getCurrentUser()`) and a
  session-scoped `session_id` (one `crypto.randomUUID()` per page
  load, stored on `window`) into the `payload` arg passed to
  `sendTelemetryEvent`. Edit point: `src/lib/telemetry.js:25-47`
  and/or `src/config/supabase.js:79-91`.
- **Why:** Make the activation funnel actually queryable per-user
  for the feature we just shipped + every other `trackEvent`
  caller.
- **Size:** ~10 lines + 1 vitest case.
- **Urgency:** Low — funnel is anonymous and aggregate-only
  today; data isn't wrong, it's just coarse. Can slot in any time.

### Open questions for the user (none mandatory)
- Do you want the telemetry Option A fix done before or after the
  sync loop fix? My read: after — sync loop is higher impact.
- Should the sync loop investigation prefer a deployed-environment
  repro (real Supabase, real network) or a localhost repro (dev
  server, faked sync)? Either works; deployed is closer to the
  failure mode but slower to iterate on.

## 4. Verify before resuming

```bash
# Confirm HEAD is still af15ee5 — if it's not, a commit landed
# in-between; check git log and update mental model.
git log --oneline -5

# Lint / test baselines from this snapshot.
npm run lint     # expect 0 errors, 3 pre-existing warnings
npm run test:run # expect 16 files / 214 tests pass
# Don't re-run e2e unless touching test infra — it costs ~36s.
```

At handoff time: HEAD `af15ee5`, 214 vitest pass, 0 lint errors + 3
warnings. If those differ now, review `git log` to understand what
landed, then proceed without stopping.

## 5. Hard rules still in force

Auto-memory loads these via `MEMORY.md`. Listing by name so they're
not overlooked:

- `[[feedback_no_auto_commit]]` — VS Code session: autonomous git /
  npm / playwright execution OK. Destructive ops still need
  confirmation. Antigravity: paste-block only.
- `[[project_git_autopush]]` — `.githooks/post-commit` auto-pushes.
  `git push` returning "Everything up-to-date" right after a
  commit is normal.
- `[[project_invariants]]` — no paywall, invite-only, individual
  revision only, no native apps, Malay + English learning quality
  first.
- `[[feedback_handoff_docs]]` — refresh `RESUME_HERE.md` in the
  same commit as behaviour changes.
- `[[project_skills_triage]]` — green/yellow/red classification of
  every installed skill; consult before invoking anything.

## ⚠ Inventory mismatch (step 1b drift check)

`claude mcp list` shows MCPs connected that aren't in
`project_skills_inventory.md` § "MCPs currently connected":

- `claude.ai Supabase` — **important, newly connected; relevant
  for the next-session sync-loop investigation.**
- `claude.ai Vercel`
- `claude.ai Zoom for Claude`
- `claude.ai Google Calendar` (inventory lists under "Auth-required"
  but is now Connected)
- `plugin:figma:figma`

`plugin:github:github` is listed in `claude mcp list` but failed to
connect. Inventory mentions `github` only in the auth-required list.

Don't auto-correct — user decides whether to refresh the inventory
memory entry. Surfacing for awareness.

## 6. Next-session prompt

PASTE THIS to start the next session:

````
You are continuing work on the IGCSE Malay Master project — a
React 19 + Zustand 5 + Supabase + ts-fsrs SPA for IGCSE Malay AND
English language learning. Live at
https://upg-igcse-malay-master.vercel.app (open signup,
invite-only by allowlist). Repo:
`/Users/kheshav/Kheshav/kheshav code/og igcse malay master`.

## Capability self-audit (do FIRST, before any tool call)

1. Read auto-memory `project_skills_triage` — green-light skills
   are your toolset; red are off-limits for this project. **This
   is the decision tool.**
2. Only if the triage doesn't cover a capability you need, read
   `project_skills_inventory` as a fallback lookup.
3. Run `claude mcp list 2>&1 | head -20` once and confirm active
   MCPs match what triage assumes. There's a known inventory
   drift documented in this session's handoff doc — Supabase,
   Vercel, Zoom, Google Calendar, plugin:figma are newly
   connected vs the inventory snapshot.

## Hard project rules from auto-memory

These auto-load via `MEMORY.md` — listing so they're not skipped:
- `[[feedback_no_auto_commit]]` — VS Code session, autonomous git
  / npm / playwright execution OK. Destructive ops still need
  confirmation.
- `[[project_git_autopush]]` — `.githooks/post-commit` auto-pushes.
  `git push` returning "Everything up-to-date" right after a
  commit is normal. `.githooks/pre-commit` runs `git add -A` —
  always `git status` first; stage explicit files by name, NOT
  `git add -A` directly.
- `[[project_invariants]]` — no paywall, invite-only, individual
  revision, no native apps, Malay + English quality first.
- `[[feedback_handoff_docs]]` — refresh `RESUME_HERE.md` in the
  same commit as behaviour changes.
- `[[project_bug_settings_sync_loop]]` — the bug you're about to
  investigate; load it.

## Read order

1. `docs/sessions/2026-05-28-mid-settings-sync-loop.md` (this
   handoff — written 2026-05-28).
2. `RESUME_HERE.md` § "LATEST SESSION (2026-05-27, First-Run
   Tour)" for the context of what just shipped.
3. `memory/project_bug_settings_sync_loop.md` (auto-loads via
   MEMORY.md) for the bug's symptoms + suspected root cause.
4. Don't read anything else until you've formed a hypothesis.

## Verify state hasn't drifted since handoff

```bash
git log --oneline -5   # expected HEAD: af15ee5 (compare; new commits since are fine, just understand them)
npm run lint           # expected: 0 errors, 3 pre-existing warnings (Roleplay/RoleplayScorecard/Comprehension)
npm run test:run       # expected: 16 files / 214 tests pass
```

If counts differ, a commit landed in-between — read `git log` to
understand, then proceed. Don't stop and ask.

## Your task

Investigate and fix the **P1 settings sync loop bug**:
- **Symptom:** logged-in users on `/settings` see "syncing your
  data" fire repeatedly; mobile gets stuck indefinitely.
- **Suspected root cause:** a `useEffect` whose deps include a
  value the sync handler mutates → infinite re-trigger.
- **Start by invoking `superpowers:systematic-debugging`.**
  Hypothesis → minimal repro → root cause → fix → verify.
- **First files to read:** `src/pages/Settings.jsx`,
  `src/lib/syncEngine.js`, `src/lib/cloudSync.js`,
  `src/store/useStore.js` (look at `sync.*` setters around lines
  200-290 where sync events fire).
- **Repro path:** needs a signed-in account in dev (or deployed).
  Ask the user how they'd like to set up the repro before writing
  any code — they may have a quick path you don't know about.

## What NOT to bundle in

- The telemetry Option A fix (inject user_id + session_id into
  payload). It's queued in this handoff but is a separate ticket;
  don't bundle. Lower impact, can wait.
- First-Run Tour cleanup. Closed work; don't reopen.

## Mindset

Quality over speed. The user is on Opus 4.7 for max judgment.
Surgical diffs only — find the minimal change that fixes the root
cause, not a wider refactor. Use `superpowers:systematic-debugging`
to keep yourself honest. Verify before claiming done — re-run the
repro and confirm the loop is broken.

Auto-push is on (`.githooks/post-commit`) — every commit lands on
`origin/main` immediately. Treat the bar accordingly: lint clean,
tests green, and the bug visibly gone before you commit.
````

Also saved to disk in this file's §6 — re-read if your conversation
gets cut by a usage limit before you've started.
