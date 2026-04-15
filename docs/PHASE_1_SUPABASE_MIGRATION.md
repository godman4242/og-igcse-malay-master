# IGCSE Malay Master — Phase 1: Supabase Auth + Cloud Sync

**Status:** APPROVED  
**Date:** 2026-04-14  
**Branch:** `supabase-phase-1` (do NOT merge to main until Phase 7 approval)

---

## Why This Matters

The app is **feature-rich but data-fragile**. Students' entire learning progress — 500+ flashcards with FSRS scheduling, grammar drill mastery, streak history, roleplay scores, mistake journal — lives exclusively in browser localStorage. One cleared cache, one switched device, one broken phone = all progress lost.

**Learning science context:** Research on spaced repetition (Ebbinghaus, Pimsleur, Wozniak) shows that the value of SRS compounds over time — a student who loses 3 months of scheduling data loses exponentially more than 3 months of effort, because the algorithm's calibration to their personal forgetting curve is destroyed. Data safety is a **prerequisite** to effective learning.

Phase 1 adds **Supabase authentication (email magic link) and cloud sync** so student data is safe, cross-device, and recoverable. No learning features change — we add a safety layer underneath everything.

---

## Key Constraints

| Constraint | Decision | Reason |
|-----------|----------|--------|
| Budget | Zero (Supabase free tier) | 500MB DB, 50K auth users, 500K edge fn/mo |
| Auth | Email magic link | No passwords for 14-16yr olds = lowest friction |
| Sync | On-load + push-after-changes | Not real-time WebSocket — overkill for study app |
| Guest migration | Auto-merge localStorage to cloud | Zero data loss on signup |
| Architecture | JSONB state blob | One row per user = one API call per sync |

---

## Architecture: JSONB State Blob

**Why not normalized tables?** The existing Zustand store IS the data model. Serializing it as one JSONB column:
- Maps 1:1 to what already exists
- One API call per sync (not 500 per-card calls)
- Stays within free tier
- JSONB supports indexing (`->`, `->>`, `@>`) for future server-side queries
- Upgrade to normalized tables in Phase 2 if leaderboards/analytics are needed

### Database Schema

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  state_version INTEGER NOT NULL DEFAULT 5,
  byte_size INTEGER GENERATED ALWAYS AS (octet_length(state::text)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: users can only access their own data
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users read own state" ON user_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users write own state" ON user_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own state" ON user_state FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own state" ON user_state FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_state_updated ON user_state(updated_at);
```

### Free Tier Budget

| Users | Avg state | Total | % of 500MB |
|-------|-----------|-------|------------|
| 100   | 150KB     | 15MB  | 3%         |
| 500   | 200KB     | 100MB | 20%        |
| 1000  | 200KB     | 200MB | 40%        |

---

## Auth Flow

Uses `supabase.auth.signInWithOtp({ email })` + `supabase.auth.onAuthStateChange()`.

**Guest mode** (unchanged): App loads -> no auth -> localStorage only -> all features work.

**Sign up**: Student taps "Save Progress" -> enters email -> magic link sent -> clicks link -> redirect back -> localStorage auto-uploaded to cloud.

**Sign in** (returning): Email -> magic link -> cloud state pulled -> compared with local timestamps -> newer state wins.

**Sign out**: Auth session cleared -> reverts to guest mode -> localStorage keeps last-synced state.

---

## Sync Layer

**Push** (local -> cloud): Triggered after state changes, debounced 5 seconds. Upserts entire JSONB blob.

**Pull** (cloud -> local): Triggered on app load when authenticated. Compares `updated_at` timestamps.

**Conflict resolution**: Last-write-wins by timestamp. Cloud wins on tie. Works because students rarely have two devices open simultaneously.

**Excluded from sync** (transient): `sync.networkStatus`, `sync.syncStatus`, `sync.queue`, `installPrompt`.

---

## Guest-to-Account Migration

**Case A** (new account): Upload entire localStorage as initial cloud state. Toast: "Progress saved!"

**Case B** (returning user, different device): Compare timestamps. If close and both have cards, show modal: "Keep this device or load cloud progress?"

---

## Rollback Strategy (4 layers)

1. **Git branch**: All work on `supabase-phase-1`. Main untouched. Revert: `git checkout main`.
2. **localStorage backup**: Snapshot to `igcse-malay-backup` key before any cloud overwrite.
3. **State versioning**: `user_state.state_version` tracks STORE_VERSION. Old blobs are interpretable.
4. **Manual export**: Existing `exportData()` function. Prompt backup download before first sync.

---

## 7-Phase Implementation Plan

### Phase 1: Safety Branch + Supabase Setup

**Goal**: Isolated workspace + database schema deployed.

| Action | Detail |
|--------|--------|
| Create branch | `supabase-phase-1` from main |
| Supabase config | Set Site URL, verify magic link email template, enable Email provider |
| Deploy schema | Run migration SQL in Supabase SQL editor |
| Disable auto-sync hooks | `git config core.hooksPath /dev/null` |

**Files**: `supabase/migrations/001_auth_and_state.sql` (NEW), `.env.example` (MODIFY)  
**Risk**: Supabase project may not exist -> user creates it (free, 2 min)  
**Rollback**: Drop tables in SQL editor  
**Checkpoint**: "Verify tables in Supabase dashboard."

---

### Phase 2: Auth Flow (Magic Link)

**Goal**: Students can sign up and sign in via email.

**Files**:
- `src/components/AuthModal.jsx` (NEW)
- `src/components/AuthGuard.jsx` (NEW)
- `src/config/supabase.js` (MODIFY)
- `src/store/useStore.js` (MODIFY — add auth slice)
- `src/App.jsx` (MODIFY — wrap in AuthGuard)

**Risk**: Magic link emails in spam -> add "Check spam folder" messaging  
**Rollback**: Remove AuthGuard wrapper -> guest-only  
**Checkpoint**: "Sign up with your email. Verify the magic link flow."

---

### Phase 3: Sync Layer (Push/Pull)

**Goal**: Authenticated users' state syncs to Supabase.

**Files**:
- `src/config/supabase.js` (MODIFY — syncState/fetchState)
- `src/lib/syncEngine.js` (MODIFY — wire processEvent)
- `src/store/useStore.js` (MODIFY — _lastSyncAt, STORE_VERSION 5->6)

**Risk**: Network errors during sync -> existing retry + queue handles this  
**Rollback**: `SUPABASE_CONFIG.enabled = false`  
**Checkpoint**: "Review a card, reload. Progress persists from cloud."

---

### Phase 4: Guest-to-Account Migration

**Goal**: Guest signup auto-uploads localStorage.

**Files**:
- `src/components/AuthGuard.jsx` (MODIFY — migration logic)
- `src/components/ConflictModal.jsx` (NEW)
- `src/store/useStore.js` (MODIFY — backupState/restoreBackup)

**Risk**: Different cards on different devices -> conflict modal  
**Rollback**: Restore from `igcse-malay-backup` localStorage key  
**Checkpoint**: "Study as guest, add cards, sign up. All progress transfers."

---

### Phase 5: Auth UI

**Goal**: Visible auth status + "Save Progress" CTA for guests.

**Files**:
- `src/components/Layout.jsx` (MODIFY — auth indicator)
- `src/pages/Dashboard.jsx` (MODIFY — guest/signed-in banner)
- `src/pages/Settings.jsx` (MODIFY — account section, delete account)

**Risk**: UI clutter -> minimal additions only  
**Rollback**: Revert 3 file edits  
**Checkpoint**: "Guest sees 'Save Progress'. Signed in sees email. Sign out works."

---

### Phase 6: Offline Resilience

**Goal**: App works offline and recovers.

**Files**:
- `src/lib/syncEngine.js` (MODIFY — auth token refresh, error states)
- `src/components/Layout.jsx` (MODIFY — sync status messages)
- `src/store/useStore.js` (MODIFY — offline queue improvements)

**Risk**: Stale auth tokens -> Supabase auto-refreshes; handle failures gracefully  
**Rollback**: Sync disabled -> localStorage fallback  
**Checkpoint**: "Turn off wifi, study, turn wifi on. Progress syncs."

---

### Phase 7: Integration Testing + Merge

**Goal**: Full verification before merging to main.

**Test checklist**:
- [ ] `npm run build` — zero errors
- [ ] All 12 routes render
- [ ] Guest mode works (no regressions)
- [ ] Sign-up: magic link -> account -> state uploaded
- [ ] Sign-in on different browser: state pulled
- [ ] Offline -> online sync recovery
- [ ] Conflict resolution modal works
- [ ] Delete account removes data
- [ ] Dark/light themes on new components
- [ ] Zustand migration v5->v6 preserves data
- [ ] Export/import still works alongside cloud sync
- [ ] Supabase dashboard shows correct JSONB structure
- [ ] Free tier usage < 5%

**Checkpoint**: "All tests pass. Reply APPROVED to merge to main."

---

## Git Workflow

```
Branch:   supabase-phase-1
Commits:  After each phase, manually
Messages: "phase-N: description" (e.g., "phase-2: implement magic link auth flow")
Merge:    Only after Phase 7 approval
No force pushes. Auto-sync hooks disabled during this work.
```

---

## Files Summary

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

**NOT TOUCHED** (learning features identical): Study.jsx, Grammar.jsx, Roleplay.jsx, CikguBot.jsx, Comprehension.jsx, Writing.jsx, Import.jsx, WordFamilies.jsx, MistakeJournal.jsx

---

## Future Phases (After Phase 1)

### Learning Effectiveness Roadmap

Based on learning science research (Bjork desirable difficulties, Karpicke retrieval practice, Kornell interleaving) and the Manus AI analysis:

**Phase 2: Learning Science Upgrades** (post-sync)
- FSRS is already implemented (38% more efficient than SM-2) -- no change needed
- Add **interleaved practice**: mix vocabulary + grammar + comprehension in single sessions (Kornell & Bjork, 2008 — interleaving improves long-term retention by 43%)
- Add **retrieval practice scoring**: track which study modes produce best retention per student
- Add **difficulty calibration**: auto-adjust daily goals based on FSRS stability trends

**Phase 3: Engagement That Drives Learning** (not just dopamine)
- PostHog analytics (free tier) to track actual learning outcomes, not just engagement
- Streak mechanics already built -- add **streak quality** (reviews done correctly, not just reviews done)
- Daily challenges already exist -- weight them toward weak topics identified by FSRS

**Phase 4: Monitoring + Error Tracking**
- Sentry (free tier: 5K errors/mo) for production error tracking
- Vitest for critical path testing (FSRS algorithm, sync layer, auth flow)

**Phase 5: CI/CD Automation**
- GitHub Actions: lint + build on PR, deploy to Vercel on main
- Auto-format workflow (already partially configured)

### Plugins Assessment (from Manus AI Recommendations)

| Plugin | Verdict | Reason |
|--------|---------|--------|
| ts-fsrs | Already installed | Using FSRS-4.5 via `ts-fsrs ^5.3.2` |
| Anthropic SDK | Not needed client-side | Claude calls go through Supabase Edge Function (CORS) |
| Trophy (gamification) | Skip | Custom gamification already built (XP, streaks, freezes, challenges) |
| Vitest | Phase 4 | Add testing after sync is stable |
| Sentry | Phase 4 | Add error tracking after core features ship |
| PostHog | Phase 3 | Add analytics after engagement layer is refined |
| LangChain | Skip | Overkill — direct API calls are sufficient |
| Deepgram | Skip | Web Speech API works for ms-MY; reassess if accuracy is poor |
| i18next | Skip | UI is already bilingual via data files |
| Workbox (PWA) | Phase 5+ | Nice to have, not critical |

---

## Prerequisites (User Action Required)

Before starting Phase 1:

1. **Create Supabase project** at [supabase.com](https://supabase.com) (free)
2. **Get credentials** from Settings > API: Project URL + Anon Key
3. **Create `.env.local`**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_KEY=your-anon-key
   ```
4. Reply **"Start Phase 1"** to begin implementation
