# 2026-05-28 — Mid-session handoff: wire triggerCloudSync (streak/XP/settings sync)

**Slug:** `wire-triggercloudsync` · **Captured:** 2026-05-28 21:51

## 1. Where we are

- **Branch:** `main`, **clean working tree**, up to date with `origin/main`.
- **HEAD:** `e9b205a` — fix(sync): restore cross-device cloud hydration on every sign-in.
- **Three commits shipped today** chasing the sync-loop bug, in order:
  1. `8381ceb` — fix(settings): break sync loop by consolidating auth side effects in AuthGuard.
  2. `63eaab5` — fix(sync): stop mobile retry-storm by removing syncStatus from Layout deps + scheduled backoff.
  3. `e9b205a` — fix(sync): restore cross-device cloud hydration on every sign-in.
- **State at snapshot:** 0 lint errors / 3 pre-existing warnings (RoleplayScorecard / Comprehension / Roleplay), 18 files / 223 vitest tests pass.

## 2. What's in flight

### Just shipped (closed)
- Sync loop chain — three rounds in one day. Full write-up in
  `docs/sessions/2026-05-28-settings-sync-loop-fix.md`. Cards / writing /
  speaking now sync both ways across devices via `hydrateCloudData` from
  AuthGuard on every sign-in.

### True in-flight: queued, no code written
The user explicitly asked for this as the next-session task. **One ticket.**

**Wire `triggerCloudSync()` into `enqueueSyncEventAction` so the
`user_state` cloud blob stays fresh.** This closes the last remaining
sync gap: streak / XP / dailyChallenge / engagementXP / identity /
settings / theme / userInterests / etc. live in the blob, but the blob
is only ever pushed ONCE at first sign-in (at `AuthGuard.handleSignIn`
when `isNewLogin === true`). After that, nothing keeps it fresh →
cross-device sees stale data for everything that isn't in the per-table
tables (`user_cards`, `writing_history`, `speaking_history`).

**Why this isn't already done:** `triggerCloudSync` is defined at
`src/store/useStore.js:882` and has **zero callers anywhere in the
codebase**. It's been dead code since it was introduced. The Round-3
commit (`e9b205a`) restored per-table sync via `hydrateCloudData` but
deliberately did NOT touch the blob path — surgical scope, separate
ticket.

### The exact change

In `src/store/useStore.js`, find `enqueueSyncEventAction` (currently
~line 211, may have drifted). Today's shape:

```js
enqueueSyncEventAction: (type, payload = {}) => set(state => {
  const event = createSyncEvent(type, payload);
  const queue = enqueueSyncEvent(state.sync.queue, event);
  trackEvent('sync_queue_enqueued', { eventType: type, queueLength: queue.length });
  return {
    sync: {
      ...state.sync,
      queue,
      syncStatus: 'pending',
      lastError: null,
    }
  };
}),
```

Convert to two-step (set state, then call action). Cannot call
`get().triggerCloudSync()` inside the `set` callback because the
state isn't committed yet:

```js
enqueueSyncEventAction: (type, payload = {}) => {
  set(state => {
    const event = createSyncEvent(type, payload);
    const queue = enqueueSyncEvent(state.sync.queue, event);
    trackEvent('sync_queue_enqueued', { eventType: type, queueLength: queue.length });
    return {
      sync: {
        ...state.sync,
        queue,
        syncStatus: 'pending',
        lastError: null,
      }
    };
  });
  // Also push the full state blob (debounced 5s in triggerCloudSync)
  // so cross-device restore via pullStateBlob sees fresh streak / XP /
  // settings / identity data. Per-table data (cards / writing /
  // speaking) is handled by hydrateCloudData on the read side.
  get().triggerCloudSync();
},
```

~6 lines of structural change + 1 call. **That is the entire fix.**

### Concerns to think through (not blockers)

- **Bandwidth.** `pushStateBlob` uploads the entire Zustand store as
  one JSON blob. For a power user ~50-100 KB per push (uncompressed —
  Supabase gzips on the wire). The 5s debounce coalesces a burst of
  reviews into one push. Worst case during active study: 12 pushes/min
  → ~720/hour → ~70 MB/hour for the heaviest user. Acceptable but
  watch the Supabase egress dashboard for a week after shipping.
- **Telemetry events also trigger the blob push.** `trackEvent` calls
  → many of those (telemetry, AI events) flow through paths that
  `enqueueSyncEventAction` doesn't touch, so this is fine. But verify
  by grepping callers of `enqueueSyncEventAction` (~20 sites) and
  confirm each one is a state mutation worth syncing.
- **First-mutation latency.** The user has to wait 5s after their
  last action for the blob to push. If they close the tab in <5s,
  the timer never fires. Trade-off accepted because the per-table
  sync covers cards already. Worst case the user loses 5s of
  streak/XP updates on tab-close — recoverable on next session.
- **Initial migration.** Existing users have a STALE blob from their
  first sign-in. After this ships, the blob updates on next mutation.
  Until that first mutation, second-device sees stale streak/XP.
  Acceptable — first mutation typically happens within minutes of
  resuming work.

### Testing approach options (pick one)

- **A. Ship without a test.** The change is trivial, the function is
  well-named, and observable behavior (second-device sees fresh
  streak) is easier to verify by the user than to test in node-only
  vitest. Lint + build + e2e are sufficient gates.
- **B. Structural test.** New file `src/store/__tests__/syncEnqueue.test.js`
  that reads `useStore.js` and asserts `enqueueSyncEventAction`'s
  body contains `triggerCloudSync()`. Cheap, pins the regression.
  Same pattern as `src/components/__tests__/authUnlock.test.js`.
- **C. Full unit test.** Set up jsdom + render hook in vitest, mock
  `pushStateBlob`, verify debounce + call. Higher cost, returns the
  same signal as B.

Recommended: B. ~15 lines, deterministic, doesn't require infra.

### Decision needed from user before shipping

None — the user already approved in conversation: *"yes i want it
next"*. The fix is mechanical; no design choices remain.

## 3. What's blocked / open questions

### Nothing currently blocked. Open for the next session:

1. **PWA service-worker cache friction.** Users on installed PWAs need
   to swipe-kill + reopen Chrome to pick up new deploys. The
   `vite-plugin-pwa` config uses `registerType: 'prompt'` with a
   60-min recheck interval. If this becomes a recurring user complaint,
   switching to `registerType: 'autoUpdate'` would silently activate
   new SWs on next page load — at the cost of losing the toast
   confirmation flow. Currently NOT a queued task; surface if it bites.

2. **Dead code cleanup.** `hydrateCloudData` is now load-bearing again
   (Round 3), so don't delete that. But the following are still
   confirmed dead after today's commits and could be removed:
   - `isHydratingCloud` field in the store (set / read by nothing now
     that Layout's spinner branch is gone).
   - The state-blob-restore logic in AuthGuard's `handleSignIn`
     (lines ~53-94 of post-commit `AuthGuard.jsx`) IS still reachable
     on fresh login, but once we wire `triggerCloudSync` and the
     blob is fresh, that logic could be simplified / merged with
     `hydrateCloudData`. Not urgent.

3. **Telemetry Option A** (still queued from this morning). Inject
   `user_id` + `session_id` into the telemetry payload so the
   First-Run Tour funnel becomes per-user queryable. ~10 lines, low
   urgency. Independent of this ticket.

## 4. Verify before resuming

```bash
git log --oneline -5      # confirm e9b205a is still on top (or understand what landed since)
git status --short        # working tree should be clean
npm run test:run          # baseline pass count; compare to step-1 in this doc
npm run lint              # baseline error/warning count
```

**At snapshot time:** HEAD `e9b205a`, working tree clean, 18 files /
223 vitest pass, lint 0 errors + 3 pre-existing warnings
(`RoleplayScorecard.jsx`, `Comprehension.jsx`, `Roleplay.jsx`). If
counts differ now, a commit landed in-between — review `git log` to
understand, then proceed without stopping to ask.

**Skip e2e on resume.** This ticket doesn't touch routes, components,
or Layout — only the store. The 18 vitest + structural test (option B)
are enough. Re-run e2e only if option C is taken or Layout gets touched
incidentally.

## 5. Hard rules still in force

Auto-memory loads these via `MEMORY.md`. Listing by name so they're
not overlooked:

- `[[feedback_no_auto_commit]]` — VS Code session: autonomous git /
  npm / playwright execution OK. Destructive ops still need
  confirmation.
- `[[project_git_autopush]]` — `.githooks/post-commit` auto-pushes;
  `.githooks/pre-commit` runs `git add -A`. Always `git status` first;
  stage explicit files by name.
- `[[project_invariants]]` — no paywall, invite-only, individual
  revision, no native apps, Malay + English learning quality first.
- `[[feedback_handoff_docs]]` — refresh `RESUME_HERE.md` in the same
  commit as behaviour changes.
- `[[project_skills_triage]]` — green / yellow / red classification of
  every installed skill; consult before invoking anything.

## ⚠ Inventory mismatch

Same drift as the prior 2026-05-28 mid-session doc — already surfaced,
not re-flagging in detail. `claude mcp list` shows Supabase / Vercel /
Zoom / Google Calendar / plugin:figma connected but not in
`project_skills_inventory.md`. `plugin:github:github` continues to
fail to connect. No new drift since this morning. User to decide
whether to refresh the inventory.

## 6. Next-session prompt

PASTE THIS to start next session:

````
You are continuing work on the IGCSE Malay Master project — a React 19
+ Zustand 5 + Supabase + ts-fsrs SPA for IGCSE Malay AND English
language learning. Live at https://upg-igcse-malay-master.vercel.app
(open signup, invite-only by allowlist). Repo:
`/Users/kheshav/Kheshav/kheshav code/og igcse malay master`.

## Capability self-audit (do FIRST, before any tool call)

1. Read auto-memory `project_skills_triage` — green-light skills are
   your toolset; red are off-limits for this project. **This is the
   decision tool.**
2. Only if the triage doesn't cover a capability you need, read
   `project_skills_inventory` as a fallback lookup.
3. Run `claude mcp list 2>&1 | head -20` once and confirm active MCPs
   match what triage assumes. There's known inventory drift (Supabase,
   Vercel, Zoom, Google Calendar, plugin:figma newly connected vs the
   inventory snapshot). Don't auto-correct.

## Hard project rules from auto-memory

These auto-load via `MEMORY.md` — listing so they're not skipped:
- `[[feedback_no_auto_commit]]` — VS Code session, autonomous git /
  npm / playwright execution OK. Destructive ops need confirmation.
- `[[project_git_autopush]]` — `.githooks/post-commit` auto-pushes;
  `.githooks/pre-commit` runs `git add -A`. Always `git status` first;
  stage explicit files by name, NOT `git add -A` directly.
- `[[project_invariants]]` — no paywall, invite-only, individual
  revision, no native apps, Malay + English quality first.
- `[[feedback_handoff_docs]]` — refresh `RESUME_HERE.md` in the same
  commit as behaviour changes.

## Read order

1. `docs/sessions/2026-05-28-mid-wire-triggercloudsync.md` (this
   handoff — written 2026-05-28).
2. `docs/sessions/2026-05-28-settings-sync-loop-fix.md` § Round 3 for
   the context of the sync work this builds on.
3. `RESUME_HERE.md` § "LATEST SESSION (2026-05-28)" for the sync-loop
   chain summary.
4. Don't read anything else until you've located
   `enqueueSyncEventAction` in `src/store/useStore.js`.

## Verify state hasn't drifted since handoff

```bash
git log --oneline -5      # expected HEAD: e9b205a (new commits since are fine, just understand them)
git status --short        # expected: clean
npm run lint              # expected: 0 errors, 3 pre-existing warnings
npm run test:run          # expected: 18 files / 223 tests pass
```

If counts differ, a commit landed in-between — read `git log` to
understand, then proceed. Don't stop and ask.

## Your task

Wire `triggerCloudSync()` into `enqueueSyncEventAction` so the
`user_state` cloud blob stays fresh after every mutation. This closes
the last remaining cross-device sync gap (streak / XP / settings /
identity / dailyChallenge / etc. live in the blob, not the per-table
tables).

**The exact change** is in the handoff doc § 2 — a ~6-line structural
rewrite of `enqueueSyncEventAction` from `(args) => set(...)` to
`(args) => { set(...); get().triggerCloudSync(); }`. Cannot call
`get().triggerCloudSync()` inside the `set` callback because state
isn't committed yet — the two-step shape is required.

**Then** add a structural regression test at
`src/store/__tests__/syncEnqueue.test.js` (same pattern as
`src/components/__tests__/authUnlock.test.js`) that reads
`useStore.js` and asserts `enqueueSyncEventAction`'s body contains
`triggerCloudSync()`. Strip line comments before matching so a
historical reference in a comment can't pass the check trivially.

**Verification gates:** lint clean, vitest pass count goes from
223 → 224 (or +N if you add more cases), build clean. Skip e2e —
this doesn't touch routes / Layout.

**After shipping**, tell the user to (a) hard-refresh PC, (b) make any
small mutation (review a card / change a setting), wait 5+ seconds, and
(c) sign in on a second device (incognito works) — streak / XP /
identity should now match. Per-table data (cards) already syncs from
the Round-3 fix.

## What NOT to bundle in

- PWA registerType change (prompt → autoUpdate). Separate decision.
- Dead-code cleanup (`isHydratingCloud` field, etc.). Surface if you
  notice them while in the area; don't proactively delete.
- Telemetry Option A. Still queued; separate ticket.
- AuthGuard simplification. Once the blob is fresh, the cardDelta /
  timestamp tiebreaker logic in `handleSignIn` could be simplified to
  always-restore-from-cloud-when-newer — but that's its own ticket
  and needs design thought.

## Mindset

Quality over speed. The user is on Opus 4.7 for max judgment.
Surgical diffs only — find the minimal change that fixes the root
cause, not a wider refactor. Verify before claiming done — re-run the
gates and confirm green before committing.

Auto-push is on (`.githooks/post-commit`) — every commit lands on
`origin/main` immediately. Treat the bar accordingly: lint clean,
tests green, structural regression test in place before you commit.
````

Also saved to disk in this file's §6 — re-read if your conversation
gets cut by a usage limit before you've started.
