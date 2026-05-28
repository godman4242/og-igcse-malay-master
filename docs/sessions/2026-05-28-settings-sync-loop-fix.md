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
