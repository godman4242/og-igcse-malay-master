# 2026-05-28 — P1 Settings sync loop fix

**Branch:** `main` · **Base:** `af15ee5` (prior session handoff)

## TL;DR

Killed the infinite "Syncing your progress..." loop that hit logged-in
users on `/settings` (and hung mobile indefinitely). Root cause was a
duplicate auth listener inside `<AuthUnlock/>` whose mount-effect
triggered `hydrateCloudData()` → `isHydratingCloud: true` → `<Layout/>`
swapped children for a spinner → `<Settings/>` (and `<AuthUnlock/>`)
unmounted → hydration resolved → children remounted → loop.

Fixed by making `<AuthUnlock/>` purely presentational and consolidating
all sign-in side effects (role check, telemetry toggle) into
`<AuthGuard/>`, which sits at the App root and never unmounts.

## Diagnosis

`Layout.jsx:239-247` gates the entire children tree on `isHydratingCloud`:

```jsx
{isHydratingCloud ? <Spinner/> : children}
```

This is the conditional-render-of-children-that-drive-parent-conditional
anti-pattern. The child triggering hydration sits inside `children`, so
flipping the flag unmounts the trigger. The trigger's IIFE keeps running
(stale-mount race — `mounted` checked only at the top, not between
`await`s), the promise resolves, the flag flips back, the child remounts
fresh, the effect re-runs.

Why mobile compounded: each cycle fired 3 cloud reads + 1
`syncCloudSnapshot` upsert. Slow networks queued the next remount before
the previous cycle's promises settled — spinner never cleared.

Architectural smell behind the loop: `AuthGuard` (already at App root)
and `AuthUnlock` (inside Settings) ran parallel "on sign-in do X"
listeners. `AuthGuard` used the modern `pullStateBlob`/`pushStateBlob`
JSONB sync model; `AuthUnlock` used the legacy per-table
`hydrateCloudData` flow. Duplicate listeners on the same auth event are
a code smell on their own; one of them being inside a conditionally-
rendered subtree turned the smell into a hang.

## Fix

Surgical: 3 files touched, ~70 LOC net.

1. **`src/components/AuthGuard.jsx`** — owns all sign-in side effects:
   - Adds `checkUserRole(email)` → `setUserRole(role)` for admin/owner
     elevation (was previously only happening from AuthUnlock).
   - Adds `enableCloudTelemetry()` on sign-in,
     `disableCloudTelemetry()` on sign-out.
   - Comment block documents why this consolidation matters.

2. **`src/components/AuthUnlock.jsx`** — rewritten as presentational:
   - Removed the mount `useEffect` entirely (cold-load restore + auth-
     state-change listener both gone).
   - Removed local `user` React state. Reads `auth.user` from the store
     instead (`AuthGuard` populates it).
   - Removed imports for `useEffect`, `hydrateCloudData`,
     `flushSyncQueue`, `setUserRole`, `enableCloudTelemetry`,
     `disableCloudTelemetry` — all moved or no longer needed.
   - Kept: magic-link `handleSendLink`, sign-out cleanup of the
     `translation.cacheToCloud` toggle (AuthGuard handles auth-state
     itself via `onAuthStateChange`).

3. **`src/components/__tests__/authUnlock.test.js`** (new) — structural
   regression test. Pins:
   - No `hydrateCloudData(…)` call / `.hydrateCloudData` selector.
   - No `flushSyncQueue(…)` call / `.flushSyncQueue` selector.
   - No `getCurrentUser(…)` or `auth.getUser(…)` call.
   - No `onAuthStateChange(…)` subscription.

   Comments are stripped before matching, so the explanatory header in
   `AuthUnlock.jsx` (which names the forbidden symbols) doesn't trip
   the test. Picked structural assertions because vitest is `node`-only
   here — no jsdom / React Testing Library. Adding that infra was out
   of scope.

## Verification

| Gate | Before | After |
|---|---|---|
| `npm run lint` | 0 errors, 3 warnings | **0 errors, 3 warnings** (unchanged — the 3 pre-existing warnings in Roleplay/Comprehension/RoleplayScorecard stay) |
| `npm run test:run` | 16 files / 214 tests | **17 files / 218 tests** (+1 file, +4 tests, all new) |
| `npm run test:e2e` | 14/14 | **14/14** |
| `npm run build` | `index-*.js` 410.65 KB / 131.74 KB gz | **410.78 KB / 131.80 KB gz** (Δ +0.13 KB raw / +0.06 KB gz — just the new role-check + telemetry lines) |

Live repro not run — the user couldn't easily share a signed-in session.
The structural test + green build + green e2e suite + the unambiguous
diagnosis carry the verification load here.

## Dead code surfaced (not deleted in this commit)

- `hydrateCloudData` in `useStore.js:636-694` now has zero callers.
  Kept around for now; deleting it is a separate cleanup (would unlock
  the dead `isHydratingCloud` field + the dead Layout spinner branch
  too). Not in the surgical scope.
- The "Syncing your progress..." spinner branch in `Layout.jsx:239-247`
  is unreachable. Same — flagged, not touched.

If you want either deleted, ping me and I'll do it in a follow-up
commit so the diff stays attributable.

## Notes for next session

- The telemetry Option A fix (inject `user_id` + `session_id` into
  payload) is still queued. With AuthGuard now firing
  `enableCloudTelemetry()` on sign-in, the user identity is available
  earlier in the auth lifecycle — if you wire that fix, hook into
  AuthGuard's `handleSignIn` for the session-scoped session_id seed.
- Consider deleting `hydrateCloudData` + `isHydratingCloud` + Layout's
  spinner branch in a small follow-up. They're a tripwire for the next
  person who reads the auth flow.

---

## Round 2 — mobile loop (same day)

Desktop verified clean. Mobile still cycling. Second loop diagnosed:

`Layout.jsx:118-122` had `sync.syncStatus` in its useEffect dep array.
On mobile, sync requests fail intermittently → `flushSyncQueue` resolves
with `syncStatus: 'error'` → the effect's `syncStatus` dep changes
(`'syncing'` → `'error'`) → effect re-fires → guard (`status !== 'syncing'`)
allows the call → `flushSyncQueue` runs again → fails again → loop with
zero backoff, hammering the API on every flaky-network failure. Desktop
never showed it because desktop requests succeeded first try, queue
drained, effect didn't re-fire (queue.length went to 0).

### Fix

1. **`Layout.jsx`** — dropped `sync.syncStatus` from the effect deps.
   Status oscillation must NOT re-trigger the flush. Only "queue gained
   an item" or "network came back online" should. Inline comment + ESLint
   disable so the missing dep is intentional, not an oversight.
2. **`src/lib/syncEngine.js`** — new pure helper
   `nextScheduledRetryMs(remainingQueue, now)`. Returns the ms-from-now
   until the earliest event's `nextRetryAt` becomes due. Floors at
   `MIN_RETRY_DELAY_MS (1s)` so a queue of past-due events can't cause a
   tight-loop one layer down. Returns null for empty queue,
   `DEFAULT_RETRY_DELAY_MS (5s)` if no event has a parseable nextRetryAt.
3. **`src/store/useStore.js`** — module-level `_syncRetryTimer` +
   `scheduleRetry(remainingQueue)` inside `flushSyncQueue`. On failure
   (either via `result.status !== 'synced'` or the outer `catch`),
   schedules ONE `setTimeout` at `nextScheduledRetryMs(...)` that calls
   `flushSyncQueue` again. Cleared on entry (so the next user-action-
   driven flush supersedes a pending retry) and on success. On the next
   firing it re-checks `networkStatus === 'online'` and queue length
   before retrying.
4. **`src/lib/__tests__/syncEngine.test.js`** (new) — 5 cases pinning the
   helper:
   - empty / null / undefined queue → null
   - no parseable nextRetryAt → 5000ms default
   - earliest nextRetryAt wins
   - past-due events floor at 1000ms (the critical anti-tight-loop case)
   - missing nextRetryAt on some events is skipped when others have one

### Verification gates

| Gate | Result |
|---|---|
| `npm run lint` | 0 errors, 3 pre-existing warnings (unchanged) |
| `npm run test:run` | 18 files / 223 tests (was 17 / 218; +1 file +5 tests for syncEngine) |
| `npm run test:e2e` | 14/14 Playwright pass (39.1s) |
| `npm run build` | clean |

### Why this matters beyond the visible loop

Even with `nextRetryAt` set by the engine, the OLD code retried on every
status transition regardless of the field. The field was effectively
documentation — exponential backoff existed in name only. After this
change, `nextRetryAt` is load-bearing: the store's retry timer reads it,
the engine sets it, and Layout's effect no longer races with either.

---

## Round 3 — cross-device sync was broken (same day)

User report after Round 2: incognito loads clean (so the code fix is
proven correct), but their PC's 20 reviewed cards don't show up on the
phone or in a fresh incognito sign-in.

### Diagnosis

`triggerCloudSync` (the debounced full-blob push to `user_state`) is
defined in the store at `useStore.js:882` but has **zero callers in
the entire codebase**. The `user_state` blob is only ever pushed in
one place — `AuthGuard.handleSignIn` on a fresh sign-in.

So the actual sync topology was:

- PC signs in fresh → blob = whatever local state was (often 0 cards).
- PC studies 20 cards → 20 `card_reviewed` events queue → `flushSyncQueue`
  writes them to the `user_cards` table. **Blob never updated.**
- Phone signs in fresh → AuthGuard pulls blob (stale, 0 cards) →
  cardDelta = 0 → push local → phone shows 0 cards. The 20 cards sit
  orphaned in `user_cards` with no reader.

The Round 1 fix made it worse: removing AuthUnlock's mount-effect
killed the *only* code path that ever called `hydrateCloudData()` —
the per-table fetch that DID read `user_cards`. Pre-Round-1, a user
visiting `/settings` on the second device would trigger that fetch
and pull their cards. Post-Round-1, nothing fetched per-table data.

### Fix

1. **`AuthGuard.jsx`** — added a fire-and-forget `pullCloudData()`
   helper that calls `useStore.getState().hydrateCloudData()` after
   sign-in (both fresh login AND session restore). hydrateCloudData
   does a key-based merge of cards/writing/speaking — never destructive,
   safe to run on every reload. AuthGuard sits at the App root and
   does not conditionally render children based on hydration state,
   so the Round-1 unmount loop class cannot recur from here.
2. **`Layout.jsx`** — deleted the `{isHydratingCloud ? <Spinner/> :
   children}` swap. Children always render; cloud hydration happens
   in the background. This was the structural anti-pattern that
   started everything; killing it prevents future tripwires. The
   `isHydratingCloud` field in the store is now read by nothing
   but isn't actively harmful, so left in place.

### Verification

| Gate | Result |
|---|---|
| `npm run lint` | 0 errors, 3 pre-existing warnings |
| `npm run test:run` | 18 files / 223 tests |
| `npm run test:e2e` | 14/14 Playwright |
| `npm run build` | clean |

### What this does NOT fix

- The `user_state` blob is still stale because `triggerCloudSync`
  still has no callers. Per-table data (cards, writing, speaking)
  now syncs both ways. Streak / XP / settings / identity / etc. do
  not. If the user reports "my streak is different on each device",
  that's the next ticket — wire `triggerCloudSync()` into
  `enqueueSyncEventAction` so the blob gets pushed within 5s of any
  mutation.
- PWA service-worker cache. The site is on `registerType: 'prompt'`,
  so the in-app `PWAUpdateToast` shows after the next 60-min check
  detects a new SW waiting. For an installed PWA on phone, the
  fastest forced update is: swipe the PWA fully out of the recent-
  apps switcher, then reopen.

### Dead code now actually dead (still NOT deleted)

- `hydrateCloudData`'s `set({ isHydratingCloud: true })` /
  `false` flips are no longer observed by any UI. The flag persists
  in the store object and the persist layer for compatibility.
- The "Syncing your progress…" copy is no longer rendered anywhere.
