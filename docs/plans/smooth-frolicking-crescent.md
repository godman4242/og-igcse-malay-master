# IGCSE Malay Master — Phase 1: Supabase Auth + Cloud Sync

## Context

The app is **feature-rich but data-fragile**. Students' entire learning progress — 500+ flashcards with FSRS scheduling, grammar drill mastery, streak history, roleplay scores, mistake journal — lives exclusively in browser localStorage. One cleared cache, one switched device, one broken phone = all progress lost. This is the #1 risk to student retention and trust.

Phase 1 solves this by adding **Supabase authentication (email magic link) and cloud sync** so student data is safe, cross-device, and recoverable. No learning features change. We add a safety layer underneath everything.

**Key constraints:**
- Budget: zero (Supabase free tier only: 500MB DB, 50K auth users, 500K edge fn/mo)
- Auth: email magic link (no passwords, no OAuth — simplest for 14-16yr old students)
- Sync model: sync-on-load + push-after-changes (not real-time WebSocket)
- Guest migration: auto-merge localStorage → cloud on signup (zero data loss)
- Architecture: JSONB state blob (one row per user, entire Zustand state as JSON)

**Why JSONB blob, not normalized tables?**
The existing Zustand store IS the data model. Serializing it as one JSONB column maps 1:1 to what already exists. One API call per sync (not 500 per-card calls). Stays well within free tier. Natural upgrade to normalized tables in Phase 2 if needed for leaderboards/analytics. Based on Supabase Postgres docs, JSONB supports indexing and operators (`->`, `->>`, `@>`) so server-side queries are possible later without schema migration.

---

## Architecture Decision: Single Codebase (Free/Pro Toggle)

Historically, the project maintained two separate repositories (`og` for free users, `upg` for premium/sync users). This creates "Maintenance Hell" where features built for premium users must be manually backported to free users.

**The new strategy is a Single Codebase (`upg-igcse-malay-master`) with a Feature Gate:**
- **Free Tier (Guest Mode)**: All students have access to the core pedagogical engine. Data is stored purely in `localStorage`.
- **Pro Tier (Authenticated Mode)**: Students with approved emails (or who sign up) get access to Supabase Cloud Sync and premium features.

By maintaining one codebase, every improvement to the core learning logic automatically benefits all users, and the `og` repository can be safely archived.

---

## Architecture Decision: JSONB State Blob

### Schema

```sql
-- Table 1: User profile (extends Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Full app state as JSONB blob
CREATE TABLE user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  state_version INTEGER NOT NULL DEFAULT 5,
  byte_size INTEGER GENERATED ALWAYS AS (octet_length(state::text)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security: users can only access their own data
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users read own state"
  ON user_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users write own state"
  ON user_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own state"
  ON user_state FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own state"
  ON user_state FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_state_updated ON user_state(updated_at);
```

### Size Budget (Free Tier: 500MB)

| Users | Avg state size | Total DB usage | % of free tier |
|-------|---------------|----------------|----------------|
| 100   | 150KB         | ~15MB          | 3%             |
| 500   | 200KB         | ~100MB         | 20%            |
| 1000  | 200KB         | ~200MB         | 40%            |

Conclusion: free tier handles up to ~2000 active users comfortably.

---

## Auth Flow

Based on Supabase Auth docs (2026): use `supabase.auth.signInWithOtp({ email })` for magic link. Session managed via `supabase.auth.onAuthStateChange()`.

```
GUEST MODE (unchanged from today):
  App loads → no auth session → localStorage only → all features work

SIGN UP (new user):
  1. Student taps "Save Progress" CTA
  2. AuthModal opens → student enters email
  3. supabase.auth.signInWithOtp({ email }) → magic link sent
  4. Student clicks link → redirect back to app
  5. onAuthStateChange('SIGNED_IN') fires
  6. App checks: user_state row exists?
     NO → upload localStorage as initial user_state (guest migration)
     YES → compare timestamps, take newer state
  7. Create user_profiles row
  8. Show "Progress saved! ✅" toast

SIGN IN (returning user):
  1. Student taps "Sign In" → enters email → magic link
  2. On auth → fetch user_state from Supabase
  3. Compare updated_at: cloud vs localStorage
  4. Cloud newer → replace localStorage with cloud state
  5. Local newer → push local state to cloud
  6. Continue as normal

SIGN OUT:
  1. supabase.auth.signOut()
  2. Clear auth session → revert to guest mode
  3. localStorage retains last-synced state (offline safety)
```

---

## Sync Layer

### Push (local → cloud)

Triggered after state changes, debounced 5 seconds:

```javascript
// Pseudocode
function pushState() {
  if (!isAuthenticated) return;
  const state = serializableState(get()); // exclude transient fields
  await supabase.from('user_state').upsert({
    user_id: authUser.id,
    state,
    state_version: STORE_VERSION,
    updated_at: new Date().toISOString(),
  });
}
```

**Excluded from sync** (transient, device-specific):
- `sync.networkStatus` (derived from browser)
- `sync.syncStatus` (local UI state)
- `sync.queue` (local buffer)
- `installPrompt` (device-specific)

### Pull (cloud → local)

Triggered on app load when authenticated:

```javascript
// Pseudocode
async function pullState() {
  if (!isAuthenticated) return;
  const { data } = await supabase
    .from('user_state')
    .select('state, state_version, updated_at')
    .eq('user_id', authUser.id)
    .single();

  if (!data) return; // new user, no cloud state yet

  const cloudTime = new Date(data.updated_at).getTime();
  const localTime = new Date(localState._lastSyncAt).getTime();

  if (cloudTime > localTime) {
    // Cloud is newer — apply it
    const migratedState = migrateIfNeeded(data.state, data.state_version);
    replaceLocalState(migratedState);
  } else if (localTime > cloudTime) {
    // Local is newer — push to cloud
    pushState();
  }
}
```

### Conflict Resolution

- **Strategy**: Last-write-wins by `updated_at` timestamp
- **Edge case** (same timestamp): cloud wins
- **Why this works**: Students rarely have two devices open simultaneously. The sync-on-load + push-after-changes pattern naturally serializes access.

---

## Guest-to-Account Migration

The critical UX moment:

```
1. Student has been studying as guest (localStorage only)
2. Student taps "Save Progress" → enters email → magic link
3. Auth completes → onAuthStateChange('SIGNED_IN')
4. Check: does user_state row exist for this user_id?

   CASE A: No row (brand new account)
   → Upload entire localStorage state as user_state.state
   → Set state_version = STORE_VERSION
   → Set _lastSyncAt in local state
   → Toast: "Progress saved! Your data is now backed up."

   CASE B: Row exists (returning user, different device)
   → Compare timestamps
   → If cloud is significantly newer (>1 hour difference):
       → Apply cloud state, toast: "Welcome back! Loaded your progress."
   → If local is significantly newer:
       → Push local state, toast: "Updated your cloud backup."
   → If close (within 1 hour) AND both have cards:
       → Show simple modal:
         "You have progress saved in the cloud. Which do you want to keep?"
         [Keep this device] [Load cloud progress]
```

---

## Rollback Strategy (4 layers)

### Layer 1: Git Branch Safety
- All work on `supabase-phase-1` branch
- main remains untouched
- Revert: `git checkout main`

### Layer 2: localStorage Backup
- Before any cloud sync overwrites localStorage:
  - Snapshot current state to `igcse-malay-backup` key
- Restore: one-tap button in Settings ("Restore from backup")

### Layer 3: State Version Tracking
- `user_state.state_version` records which STORE_VERSION wrote the blob
- If a migration corrupts data, old blobs are still interpretable
- The existing `persist.migrate` callback handles version upgrades

### Layer 4: Manual Export
- Existing `exportData()` function already works
- Before first sync: prompt "Download a backup before we sync?"
- Student keeps a local JSON file they can always reimport via Settings

---

## 7-Phase Implementation Plan

### Phase 1: Safety Branch + Supabase Project Setup
**Goal**: Create an isolated workspace and deploy the database schema.

**What happens**:
- Create git branch `supabase-phase-1` from main
- Verify Supabase project exists and credentials are in `.env.local`
- Configure Supabase dashboard:
  - Authentication > URL Configuration > Site URL = your app URL (e.g., `http://localhost:5173` for dev)
  - Authentication > Email Templates > verify magic link template is enabled
  - Authentication > Providers > ensure Email provider is enabled (it is by default)
- Deploy migration SQL via Supabase SQL editor: create `user_profiles` + `user_state` tables
- Set up RLS policies (included in migration SQL)
- Verify schema via Supabase dashboard > Table Editor
- Disable auto-sync git hook temporarily (`git config core.hooksPath /dev/null`) — we commit manually per phase

**Files**:
- `supabase/migrations/001_auth_and_state.sql` (NEW)
- `.env.example` (MODIFY — document required vars)

**Risks**: Supabase project may not exist yet
**Mitigation**: User creates project at supabase.com (free, 2 minutes)
**Rollback**: Drop tables in Supabase SQL editor
**Approval**: "I've created the branch and tables. Verify them in your Supabase dashboard."

---

### Phase 2: Auth Flow (Magic Link)
**Goal**: Students can sign up and sign in via email magic link.

**What happens**:
- Build `AuthModal.jsx` — email input + magic link send + loading states
- Build `AuthGuard.jsx` — `onAuthStateChange` listener, session state management
- Wire Supabase client with real credentials
- Add auth state to Zustand store (`auth: { user, session, loading }`)
- Create `user_profiles` row on first sign-in (via Supabase trigger or client-side)

**Files**:
- `src/components/AuthModal.jsx` (NEW)
- `src/components/AuthGuard.jsx` (NEW)
- `src/config/supabase.js` (MODIFY — real auth functions)
- `src/store/useStore.js` (MODIFY — add auth slice)
- `src/App.jsx` (MODIFY — wrap in AuthGuard)

**Risks**: Magic link emails may land in spam
**Mitigation**: Supabase handles email delivery; we add "Check spam folder" messaging
**Rollback**: Remove AuthGuard wrapper, app reverts to guest-only
**Approval**: "Auth works — sign up with your email and verify the magic link flow."

---

### Phase 3: Sync Layer (Push/Pull State Blob)
**Goal**: Authenticated users' state syncs to Supabase after changes and on load.

**What happens**:
- Implement `pushState()` — debounced 5s, upserts JSONB blob
- Implement `pullState()` — on app load, fetch and compare timestamps
- Wire `processEvent` in syncEngine.js to trigger `pushState`
- Add `_lastSyncAt` field to Zustand store
- Add sync status indicator to header (already exists, just wire to real status)
- Bump STORE_VERSION to 6 (add `_lastSyncAt`, auth fields)

**Files**:
- `src/config/supabase.js` (MODIFY — add syncState/fetchState functions)
- `src/lib/syncEngine.js` (MODIFY — wire processEvent to pushState)
- `src/store/useStore.js` (MODIFY — add sync-on-load, _lastSyncAt, version bump 5→6)

**Risks**: Network errors during sync could lose in-flight state
**Mitigation**: Sync engine already has retry + queue; pushState only fires after debounce
**Rollback**: Set `SUPABASE_CONFIG.enabled = false` → sync disabled, app runs locally
**Approval**: "Sign in, review a card, reload the page. Your progress should persist from cloud."

---

### Phase 4: Guest-to-Account Migration
**Goal**: When a guest creates an account, their localStorage progress auto-uploads.

**What happens**:
- On first sign-in: check if `user_state` row exists
- If not: upload current localStorage as initial cloud state
- If yes: compare timestamps, show conflict resolution modal if needed
- Snapshot localStorage to `igcse-malay-backup` before any overwrites

**Files**:
- `src/components/AuthGuard.jsx` (MODIFY — add migration logic)
- `src/components/ConflictModal.jsx` (NEW — "Keep this device or load cloud?")
- `src/store/useStore.js` (MODIFY — add backupState/restoreBackup actions)

**Risks**: Edge case where student has different cards on phone vs laptop
**Mitigation**: Conflict modal lets student choose; backup exists either way
**Rollback**: Restore from `igcse-malay-backup` localStorage key
**Approval**: "Study as guest, add some cards, then sign up. Verify all progress transferred."

---

### Phase 5: Auth UI in Layout, Dashboard, Settings
**Goal**: The app visually communicates auth status and encourages guests to sign up.

**What happens**:
- Layout header: show user email/avatar when signed in, "Save Progress" CTA when guest
- Dashboard: "Your progress is backed up ✅" or "Save your progress — sign up free" banner
- Settings: account section (email display, sign out button, delete account)
- Delete account: removes `user_state` + `user_profiles` rows + signs out

**Files**:
- `src/components/Layout.jsx` (MODIFY — auth indicator in header)
- `src/pages/Dashboard.jsx` (MODIFY — guest/signed-in banner)
- `src/pages/Settings.jsx` (MODIFY — account management section)

**Risks**: UI clutter on small screens
**Mitigation**: Minimal additions — one banner, one header element, one settings section
**Rollback**: Revert Layout/Dashboard/Settings edits
**Approval**: "As a guest, you see 'Save Progress'. Signed in, you see your email. Sign out works."

---

### Phase 6: Offline Resilience + Error Handling
**Goal**: App works perfectly offline and recovers gracefully.

**What happens**:
- If Supabase unreachable: queue changes locally, sync when back online
- If auth token expired: auto-refresh (Supabase handles this) or prompt re-login
- If push fails: retry with exponential backoff (existing sync engine logic)
- If pull fails on load: use localStorage, show "Couldn't reach server" banner
- Network status indicator (already exists in Layout) wired to real sync status

**Files**:
- `src/lib/syncEngine.js` (MODIFY — handle auth token refresh, better error states)
- `src/components/Layout.jsx` (MODIFY — accurate sync status messages)
- `src/store/useStore.js` (MODIFY — offline queue handling improvements)

**Risks**: Stale auth tokens causing 401 errors
**Mitigation**: Supabase JS client auto-refreshes tokens; we handle refresh failures gracefully
**Rollback**: Sync disabled → app runs on localStorage (always the fallback)
**Approval**: "Turn off wifi, study some cards, turn wifi back on. Verify progress syncs."

---

### Phase 7: Integration Testing + Merge Readiness
**Goal**: Full end-to-end verification before merging to main.

**What happens**:
- Test all 12 routes render without errors
- Test guest mode (everything works without auth)
- Test sign-up flow (magic link → account created → state uploaded)
- Test sign-in on a different browser (state pulled correctly)
- Test offline → online sync recovery
- Test conflict resolution (two devices, different states)
- Test delete account (data removed from Supabase)
- Test dark/light themes on all new components
- `npm run build` — zero errors
- Verify Zustand persistence migration v5→v6 preserves all data
- Performance check: sync operations don't block UI
- Manual export/import still works alongside cloud sync
- Verify free tier usage is minimal

**Files**: None modified — testing only
**Risks**: Edge cases in migration or sync
**Mitigation**: Each previous phase already tested individually
**Rollback**: Don't merge to main — stay on branch
**Approval**: "All tests pass. Ready to merge to main? Reply APPROVED to merge."

---

## Git Workflow

- **Branch**: `supabase-phase-1` (created from main)
- **Commit frequency**: After each phase completes successfully
- **Commit style**:
  ```
  phase-1: deploy user_state schema and RLS policies
  phase-2: implement magic link auth flow
  phase-3: wire sync layer (push/pull state blob)
  phase-4: auto-migrate guest localStorage to cloud
  phase-5: add auth UI to layout, dashboard, settings
  phase-6: offline resilience and error recovery
  phase-7: integration testing verified
  ```
- **Merge to main**: Only after Phase 7 approval
- **No force pushes**: ever
- **Auto-sync hooks**: Disabled during this work (we commit manually per phase)

---

## Critical Files Summary

| File | Action | Phase |
|------|--------|-------|
| `supabase/migrations/001_auth_and_state.sql` | NEW | 1 |
| `src/components/AuthModal.jsx` | NEW | 2 |
| `src/components/AuthGuard.jsx` | NEW | 2, 4 |
| `src/components/ConflictModal.jsx` | NEW | 4 |
| `src/config/supabase.js` | MODIFY | 2, 3 |
| `src/lib/syncEngine.js` | MODIFY | 3, 6 |
| `src/store/useStore.js` | MODIFY | 2, 3, 4 |
| `src/App.jsx` | MODIFY | 2 |
| `src/components/Layout.jsx` | MODIFY | 5, 6 |
| `src/pages/Dashboard.jsx` | MODIFY | 5 |
| `src/pages/Settings.jsx` | MODIFY | 5 |
| `.env.example` | MODIFY | 1 |

**NOT TOUCHED** (learning features remain identical):
Study.jsx, Grammar.jsx, Roleplay.jsx, CikguBot.jsx, Comprehension.jsx, Writing.jsx, Import.jsx, WordFamilies.jsx, MistakeJournal.jsx

---

## Verification Checklist (End-to-End)

1. `npm run build` — zero errors
2. All 12 routes render without console errors
3. Guest mode: all features work without auth (no regressions)
4. Sign-up: magic link → account → localStorage auto-uploaded
5. Sign-in (new device): cloud state pulled correctly
6. Sync: review a card → state pushed to Supabase within 5s
7. Offline: study offline → reconnect → state syncs
8. Conflict: two devices → conflict modal → resolution works
9. Delete account: data removed from Supabase, reverts to guest
10. Dark/light themes work on all new components (AuthModal, ConflictModal)
11. Zustand migration v5→v6 preserves all existing data
12. Settings export/import still works alongside cloud sync
13. Supabase dashboard: verify rows exist with correct JSONB structure
14. Free tier usage: <5% of limits after testing
