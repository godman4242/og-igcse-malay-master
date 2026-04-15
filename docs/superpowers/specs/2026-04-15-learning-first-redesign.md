# IGCSE Malay Master — Learning-First Redesign

**Status:** APPROVED  
**Date:** 2026-04-15  
**Replaces:** `docs/PHASE_1_SUPABASE_MIGRATION.md` (Supabase auth + cloud sync plan)

---

## 1. Problem Statement

The app is feature-rich (12 routes, 495 dictionary entries, FSRS-4.5, 6 study modes, 9 roleplay scenarios, grammar drills, Cikgu Maya AI, writing analysis) but has two gaps:

1. **Weak pedagogy:** Study modes are siloed (no interleaving), feedback is binary (correct/incorrect with no explanation), there is no metacognitive prompting, and mistakes are tracked as a flat list rather than clustered by underlying rule. The *content* is good but the *learning loop* doesn't use evidence-based techniques.

2. **Fragile deployment model:** The previous plan invested weeks in Supabase auth + cloud sync infrastructure before any learning improvements. This served data safety but not learning quality, and introduced crash risk for large-scale use (1000+ students at a school).

## 2. Design Principles

1. **Learning science first.** Every feature must be justified by evidence-based learning research. Fun and engagement are welcome *because* they keep students practicing, but they are means, not ends.

2. **Static-first.** The default experience is a pure client-side app with zero server dependencies. It cannot crash, cannot be rate-limited, and works offline. A CDN serves files to unlimited concurrent users.

3. **Supabase is invisible infrastructure.** It exists to collect anonymous telemetry that improves the static site for everyone. It is never required for learning. If Supabase disappears, 100% of users are unaffected.

4. **Tiered access, not tiered learning.** Every student gets the same learning science features. The tier system controls gamification perks and telemetry, not educational quality.

5. **Earn complexity.** No infrastructure is added until the learning product demands it. Cloud sync, teacher dashboards, and analytics are deferred until evidence justifies them.

## 3. Access Control — 4-Tier System

### Tiers

| Tier | Who | How assigned | Capabilities |
|------|-----|-------------|-------------|
| **Static** | Everyone (default) | Open the site | Full learning experience, localStorage only, zero server calls |
| **Enhanced** | Invited individuals | Owner types their email | Static + anonymous telemetry + gamification perks (XP, streak freezes, full challenges, PWA install prompt) + future cloud sync |
| **Admin** | Promoted individuals | Owner sets role to admin | Everything Enhanced + admin panel (view telemetry aggregates, view content analytics). Cannot invite others. |
| **Owner** | Kheshav only | Hardcoded via `kheshav0@gmail.com` | Everything Admin + invite system (add/remove/promote users). Only person who can grant access. |

### Feature Distribution

| Feature | Static | Enhanced | Admin | Owner |
|---------|--------|----------|-------|-------|
| FSRS spaced repetition | Yes | Yes | Yes | Yes |
| All 6 study modes | Yes | Yes | Yes | Yes |
| Interleaved mixed practice | Yes | Yes | Yes | Yes |
| Elaborative feedback ("here's why") | Yes | Yes | Yes | Yes |
| Metacognitive confidence tracking | Yes | Yes | Yes | Yes |
| Mistake pattern clustering | Yes | Yes | Yes | Yes |
| Desirable difficulty / adaptive variants | Yes | Yes | Yes | Yes |
| Enhanced roleplay feedback | Yes | Yes | Yes | Yes |
| Streaks (basic count) | Yes | Yes | Yes | Yes |
| Streak freezes + milestones + confetti | No | Yes | Yes | Yes |
| Engagement XP | No | Yes | Yes | Yes |
| Full daily challenges | No | Yes | Yes | Yes |
| PWA install prompt | No | Yes | Yes | Yes |
| Anonymous telemetry (send) | No | Yes | Yes | Yes |
| Telemetry dashboard (read) | No | No | Yes | Yes |
| Invite system | No | No | No | Yes |

### Technical Implementation

**Supabase schema (2 tables only):**

```sql
CREATE TABLE allowed_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('enhanced', 'admin')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT NOT NULL
);

CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: anyone can insert telemetry (anonymous), only admin/owner can read
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
-- Anonymous inserts allowed; client-side code only sends from enhanced+ users.
-- If spam becomes an issue, add a Supabase rate-limiting Edge Function in front of inserts.
CREATE POLICY "Anyone can insert telemetry" ON telemetry_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Only authenticated can read telemetry" ON telemetry_events FOR SELECT USING (auth.role() = 'authenticated');

-- RLS: only authenticated users can read allowed_users
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read allowlist" ON allowed_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owner can manage allowlist" ON allowed_users FOR ALL USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');
```

**Auth flow (enhanced/admin users only):**

1. User navigates to Settings > "Unlock Enhanced Mode"
2. Enters email > app calls `supabase.auth.signInWithOtp({ email })`
3. User clicks magic link in email > redirected back to app
4. App queries `allowed_users` for that email
5. If found: `userRole` set to their role, features unlock
6. If not found: "Your email isn't on the list. Contact Kheshav." > stays static
7. Owner email (`kheshav0@gmail.com`) bypasses the allowlist check, always gets owner role

**Static users never see a login prompt.** The "Unlock" link is a small, unobtrusive element in Settings.

### Telemetry Events

Events sent by enhanced/admin/owner users only. Fire-and-forget (no retry, no queue):

```js
{ event_type: 'drill_result', payload: { drill_id: 'imbuhan-3', correct: false } }
{ event_type: 'card_reviewed', payload: { topic: 'Makanan', rating: 1 } }
{ event_type: 'session_completed', payload: { duration_min: 8, cards: 14, accuracy: 0.71 } }
{ event_type: 'roleplay_completed', payload: { scenario: 'kapal-terbang', score: 72 } }
```

**Not sent:** email, name, device ID, individual card content, precise timestamps, browsing behavior. Fully anonymous.

**Failure mode:** `try { fetch(...) } catch {}` — silent drop. No impact on student experience.

## 4. Learning Science Framework

### Evidence-Based Principles Applied

| Principle | Research Basis | Current State | Target State |
|-----------|---------------|---------------|-------------|
| **Spaced repetition** | Ebbinghaus (1885), Wozniak (1990) | FSRS-4.5 implemented, working well | No change — already excellent |
| **Interleaving** | Kornell & Bjork (2008): 43% retention improvement | Not implemented — modes are siloed | Mixed sessions combining vocab + grammar + comprehension |
| **Elaborative feedback** | Butler et al. (2013): 2x retention vs binary feedback | Binary correct/incorrect only | "Here's why" explanations linking to underlying rules with examples |
| **Desirable difficulty** | Bjork (1994): appropriately challenging retrieval improves retention | All cards presented same way regardless of mastery | Mature cards get harder variants (sentence context, reverse mode); weak cards get scaffolding |
| **Metacognition** | Dunlosky & Rawson (2012): calibration predicts exam performance | Not implemented | Confidence prompt before reveal; calibration tracking over time |
| **Error clustering** | Chi et al. (1989): structural knowledge from pattern recognition | Flat mistake list | Mistakes grouped by underlying rule (e.g., "meN- + s-initial") |
| **Concrete examples** | Atkinson et al. (2003): examples before rules | Grammar drills already do this | Expand pattern: feedback always includes 3 related examples |

### The Learning Loop (redesigned)

```
Student opens app
  → Dashboard shows: due cards, weak patterns, confidence calibration
  → "Start Review" launches MIXED session (interleaved by default)
    → Item 1: Vocab flashcard (FSRS-scheduled)
      → Confidence prompt: "How sure are you?" (unsure/think so/certain)
      → Reveal answer
      → If wrong: Elaborative feedback ("Here's why + similar examples")
      → Rate: Again/Hard/Good/Easy (FSRS)
    → Item 2: Grammar drill (imbuhan, FSRS-scheduled)
      → Same confidence → attempt → feedback loop
    → Item 3: Vocab flashcard (different topic — interleaving)
    → Item 4: Cloze sentence (comprehension)
    → ... (session continues until daily target met)
  → Session summary:
    → Accuracy by category
    → Weakest pattern identified
    → Confidence calibration ("You said 'certain' 5 times, got 3 wrong")
    → Specific recommendation ("Practice meN- + s-initial — scheduled tomorrow")
```

**Single-mode practice remains available** for students who want to focus on one area. The mixed session is the default, not the only option.

### Adaptive Difficulty (Desirable Difficulty)

Cards/drills are presented at different difficulty levels based on FSRS state:

| FSRS State | Stability | Presentation |
|-----------|-----------|-------------|
| New | 0 | Standard flashcard: Malay → English |
| Learning | < 7 days | Standard flashcard with hint available |
| Review (weak) | 7-21 days | Standard flashcard, no hint |
| Review (strong) | > 21 days | Harder variant: sentence cloze, English → Malay (reverse), or audio-only |
| Review (mature) | > 90 days | Hardest: produce in sentence context, no visual cue |

This ensures mature cards aren't wasted on trivially easy reviews.

## 5. Architecture

### Stack (unchanged)

React 19 + React Router v7 + Zustand 5 (persisted) + Tailwind CSS 4 + Vite 8 + ts-fsrs

### Store Evolution

**STORE_VERSION 5 → 6:**

New fields:
- `userRole`: `'static' | 'enhanced' | 'admin' | 'owner'` (default: `'static'`)
- `confidenceLog`: `Array<{ cardId, confidence, correct, timestamp }>` (capped at 500)
- `interleaveSettings`: `{ enabled: true, vocabRatio: 0.5, grammarRatio: 0.3, comprehensionRatio: 0.2 }`

Preserved (no changes): `cards`, `grammarCards`, `mistakes`, `streak`, `studyHistory`, `ai`, `examDate`, `dailyGoal`, `theme`

Conditionally active (based on `userRole !== 'static'`): `streakFreezes`, `streakFreezeLog`, `engagementXP`, `dailyChallenge`, `challengeHistory`, `installPrompt`

Migration: additive only — new fields get defaults, nothing removed, zero data loss.

### Data Flow

```
Static users:
  Browser ←→ localStorage (Zustand + FSRS)
  No network calls. Ever.

Enhanced/Admin users:
  Browser ←→ localStorage (same as static)
  Browser  → Supabase telemetry_events (fire-and-forget, anonymous)

Owner:
  Browser ←→ localStorage (same as static)
  Browser  → Supabase telemetry_events (fire-and-forget)
  Browser ←→ Supabase allowed_users (read/write for invites)
  Browser ←→ Supabase telemetry_events (read for dashboard)
```

### File Changes

**New files:**

| File | Purpose | Phase |
|------|---------|-------|
| `src/data/feedbackRules.js` | "Why wrong" explanations per grammar rule + common vocab errors | 1 |
| `src/lib/feedback.js` | Select correct feedback rule based on error type | 1 |
| `src/components/ElaborativeFeedback.jsx` | "Here's why" panel UI | 1 |
| `src/lib/interleave.js` | Mixed practice session builder | 2 |
| `src/components/MixedSession.jsx` | Unified interleaved session UI | 2 |
| `src/components/ConfidencePrompt.jsx` | "How sure are you?" pre-reveal prompt | 3 |
| `src/lib/confidence.js` | Confidence-vs-accuracy tracking logic | 3 |
| `src/lib/patterns.js` | Mistake clustering by underlying rule | 4 |
| `src/components/AuthUnlock.jsx` | Magic link auth flow for Settings | 5 |
| `src/components/AdminPanel.jsx` | Invite system + telemetry dashboard | 5 |
| `src/data/drillVariants.js` | Harder/easier drill variants | 6 |

**Modified files:**

| File | Changes | Phase |
|------|---------|-------|
| `src/store/useStore.js` | v5→v6 migration, `userRole`, `confidenceLog`, `interleaveSettings`, conditional gamification | 1-5 |
| `src/pages/Grammar.jsx` | Integrate elaborative feedback after drill attempts | 1 |
| `src/pages/Study.jsx` | Integrate feedback, confidence prompts, adaptive difficulty | 1, 2, 3, 6 |
| `src/pages/Dashboard.jsx` | Mixed session launch, calibration insights, learning-focused layout | 2, 3 |
| `src/pages/MistakeJournal.jsx` | Pattern clustering view, "Practice Weak Patterns" button | 4 |
| `src/pages/Settings.jsx` | "Unlock Enhanced Mode" section, admin panel | 5 |
| `src/config/supabase.js` | Rewrite for 2-table schema, remove old per-card sync functions | 5 |
| `src/lib/telemetry.js` | Wire to Supabase for enhanced users, no-op for static | 5 |
| `src/lib/interleave.js` | Adaptive difficulty based on FSRS stability | 6 |
| `src/components/RoleplaySession.jsx` | Per-turn vocabulary + grammar highlighting | 7 |
| `src/components/RoleplayScorecard.jsx` | Side-by-side student vs model answer comparison | 7 |

**Untouched** (content/data stable): `dictionary.js`, `scenarios.js`, `grammar.js`, `topics.js`, `writing.js`, `wordFamilies.js`, `comprehensionPassages.js`, `cikguKnowledge.js`, `aiMocks.js`, `systemPrompts.js`

## 6. Phased Roadmap

### Phase 1: Elaborative Feedback Engine (Week 1)

**Goal:** When a student gets something wrong, tell them *why* and connect it to the underlying rule.

**Key files:** `src/data/feedbackRules.js` (NEW), `src/lib/feedback.js` (NEW), `src/components/ElaborativeFeedback.jsx` (NEW), `Grammar.jsx` (MODIFY), `Study.jsx` (MODIFY)

**Learning benefit:** Elaborative feedback produces 2x retention vs binary correct/incorrect (Butler et al., 2013).

**Infra impact:** Zero. Pure client-side.

**Done when:** Student gets imbuhan drill wrong → sees explanation with rule + 3 related examples.

---

### Phase 2: Interleaved Practice Sessions (Week 1-2)

**Goal:** Mix vocab, grammar, and comprehension in single sessions.

**Key files:** `src/lib/interleave.js` (NEW), `src/components/MixedSession.jsx` (NEW), `Dashboard.jsx` (MODIFY), `useStore.js` (MODIFY)

**Learning benefit:** Interleaving improves long-term retention by 43% vs blocked practice (Kornell & Bjork, 2008).

**Infra impact:** Zero. Pure client-side.

**Done when:** "Start Review" on Dashboard produces a mixed session of vocab + grammar + comprehension items.

---

### Phase 3: Metacognitive Confidence Tracking (Week 2)

**Goal:** "How confident are you?" prompt before answer reveal, with calibration tracking.

**Key files:** `src/components/ConfidencePrompt.jsx` (NEW), `src/lib/confidence.js` (NEW), `Study.jsx` (MODIFY), `Dashboard.jsx` (MODIFY), `useStore.js` (MODIFY)

**Learning benefit:** Metacognitive monitoring is one of the strongest predictors of exam performance (Dunlosky & Rawson, 2012).

**Infra impact:** Zero. Pure client-side.

**Done when:** Confidence prompt appears before card reveal; Dashboard shows calibration accuracy.

---

### Phase 4: Mistake Pattern Clustering (Week 2-3)

**Goal:** Group mistakes by underlying rule, not individual errors.

**Key files:** `src/lib/patterns.js` (NEW), `MistakeJournal.jsx` (MODIFY), `useStore.js` (MODIFY)

**Learning benefit:** Pattern recognition builds structural knowledge of Malay morphology (Chi et al., 1989).

**Infra impact:** Zero. Pure client-side.

**Done when:** Mistake Journal shows error patterns with "Practice Weak Patterns" button.

---

### Phase 5: Access Control & Telemetry (Week 3)

**Goal:** 4-tier system + anonymous telemetry to Supabase.

**Key files:** `src/components/AuthUnlock.jsx` (NEW), `src/components/AdminPanel.jsx` (NEW), `supabase.js` (MODIFY), `telemetry.js` (MODIFY), `useStore.js` (MODIFY), `Settings.jsx` (MODIFY)

**Learning benefit:** Telemetry data drives content improvements for all users.

**Infra impact:** First Supabase dependency. Static users unaffected. Failure invisible.

**Prerequisites:** Kheshav creates Supabase project, provides URL + anon key in `.env.local`.

**Done when:** Owner logs in, invites an email, that person authenticates, telemetry events appear in admin panel.

---

### Phase 6: Desirable Difficulty & Adaptive Variants (Week 3-4)

**Goal:** Mature cards get harder presentation; weak cards get more scaffolding.

**Key files:** `src/data/drillVariants.js` (NEW), `interleave.js` (MODIFY), `Study.jsx` (MODIFY)

**Learning benefit:** Appropriately challenging retrieval increases long-term retention (Bjork, 1994).

**Infra impact:** Zero. Pure client-side.

**Done when:** Card with stability > 21 days appears as sentence cloze instead of simple flashcard.

---

### Phase 7: Enhanced Roleplay Feedback (Week 4)

**Goal:** Per-turn vocabulary + grammar highlighting in roleplay sessions.

**Key files:** `RoleplaySession.jsx` (MODIFY), `RoleplayScorecard.jsx` (MODIFY)

**Learning benefit:** Specific immediate feedback on production tasks is more effective than holistic scores (Schmidt, 1990).

**Infra impact:** Zero. Pure client-side.

**Done when:** Roleplay scorecard shows per-turn student vs model answer comparison with grammar annotations.

---

### Phase 8: Content Expansion & Polish (Week 4-5)

**Goal:** More content driven by telemetry data, plus UI polish.

**Key changes:** Expand dictionary to 800+, add roleplay scenarios to 15, add grammar drills, PWA manifest + basic service worker, UI transitions, mobile touch target improvements.

**Infra impact:** Content only. No architecture changes.

**Done when:** 800+ dictionary entries, 15 scenarios, PWA installs on mobile.

---

### Future (unscoped)

- Cloud sync for enhanced users (JSONB blob, only for invitees)
- Teacher aggregate view for admin-role users
- More study modes (sentence construction, paragraph writing)
- Anki export improvements

## 7. Changes to Existing Docs

### PHASE_1_SUPABASE_MIGRATION.md
- Mark as **SUPERSEDED** by this document
- The 7-phase auth + sync plan is replaced by Phase 5 of this roadmap (scoped to 2 tables, not the full auth/sync infrastructure)
- Keep the file for historical reference

### CLAUDE.md Updates Needed
- Update Architecture section to reflect STORE_VERSION 6
- Add Learning Science section documenting the principles and the interleave/feedback/confidence/patterns modules
- Add Access Control section documenting the 4-tier system
- Update Verification section: add "interleaved session renders correctly" and "elaborative feedback appears on wrong answers"
- Note: gamification features (XP, streak freezes, full challenges) are conditional on `userRole`
- Note: telemetry is fire-and-forget for non-static users, no-op for static users

### New Docs Recommended
- `docs/LEARNING_MODEL.md` — standalone document explaining the learning science principles, the interleaving strategy, the feedback rules taxonomy, and the adaptive difficulty system. This helps future contributors understand *why* the app works the way it does.

## 8. Next Actions

### For Kheshav (human)
1. Review this spec and confirm approval
2. When Phase 5 approaches: create Supabase project at supabase.com (free), get Project URL + Anon Key, create `.env.local`
3. No action needed for Phases 1-4 (pure client-side, no external dependencies)

### For coding sessions
1. Invoke `writing-plans` skill to create detailed implementation plan from this spec
2. Start with Phase 1 (Elaborative Feedback) — highest learning impact, zero infrastructure
3. Each phase is independently deployable — ship after each one
4. After Phase 5 is live, check telemetry monthly to inform Phase 8 content decisions
