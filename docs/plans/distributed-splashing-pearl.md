# IGCSE Malay Master — State-of-the-Art Upgrade Plan

## Context

The app is a **fully working** React SPA with 7 pages, 6 study modes, SM-2 spaced repetition, Web Speech pronunciation, 9 IGCSE roleplay scenarios, grammar drills, and regex-based writing analysis. All data lives in localStorage via Zustand. Supabase is installed but completely unused. The user wants to transform this into a cloud-synced, AI-powered learning platform following the PRD.

**Current state:** ~2,200 lines across 16 source files. Every existing feature works. Zero cloud integration.

---

## Phase 0: Foundation (Before Any Features)

**Why:** Every later phase needs consistent error handling, environment config, and a store that won't collapse when we add auth/sync/gamification state.

| Task | Files | What |
|------|-------|------|
| API layer | Create `src/lib/api.js` | Thin fetch wrapper with error handling + timeout for all external calls |
| Env config | Create `.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Error boundary | Create `src/components/ErrorBoundary.jsx` | Catch render crashes gracefully |
| Loading spinner | Create `src/components/LoadingSpinner.jsx` | Reusable for async operations |
| Store slices | Split `src/store/useStore.js` into slices: `cardsSlice.js`, `settingsSlice.js`, `streakSlice.js`, `authSlice.js` (empty) | Keep same exported API so zero page changes needed |

**Verify:** `npm run build` passes, all 7 routes render, localStorage persistence intact.

---

## Phase 1: Supabase Auth + Cloud Sync

**Why:** Backbone for everything. LLM features need authenticated users. Cloud sync prevents data loss.

| Task | Files | What |
|------|-------|------|
| Supabase client | Create `src/lib/supabase.js` | Initialize client from env vars |
| Auth page | Create `src/pages/Auth.jsx` | Email + Google OAuth + "Continue as Guest" |
| Auth guard | Create `src/components/AuthGuard.jsx` | Route protection, guest mode passthrough |
| Auth state | Populate `src/store/slices/authSlice.js` | `user`, `session`, `isGuest`, `login()`, `logout()` |
| Cloud sync | Create `src/lib/sync.js` | `syncToCloud()`, `syncFromCloud()`, last-write-wins by `updated_at` |
| Wire up | Modify `src/App.jsx`, `Layout.jsx`, `Settings.jsx` | Auth route, user avatar in header, guest banner, sync button |
| Guest migration | On first sign-up, push all localStorage cards to Supabase | One-time operation |

**Supabase tables:** `profiles`, `cards` (with RLS `user_id = auth.uid()`), `study_sessions`, `streaks`, `settings`

**Verify:** Sign up/in works, guest mode works, cards sync between devices, offline still works.

---

## Phase 2: LLM API Proxy

**Why:** AI Roleplay and Writing Feedback both need server-side LLM calls. Build once, use everywhere.

| Task | Files | What |
|------|-------|------|
| Edge Function | `supabase/functions/llm-proxy/index.ts` | Validates JWT, forwards to GPT-4o-mini, rate-limits 50 req/day/user |
| Client helper | Create `src/lib/llm.js` | `callLLM({ messages, maxTokens })` — calls Edge Function with auth token |

**Cost:** GPT-4o-mini at ~2K tokens/call × 50 calls/day ≈ **$0.03/day**. Alternatively use Gemini Flash (free tier) or Groq (free Llama). Proxy is model-agnostic.

**Verify:** Authenticated calls return LLM responses. Unauthenticated → 401. Rate limit → 429. Guests see "Sign in for AI features."

---

## Phase 3: Interactive AI Roleplay

**Why:** Highest-impact feature. Transforms static 5-turn scripts into dynamic Paper 3 exam simulation.

| Task | Files | What |
|------|-------|------|
| Dual mode | Modify `src/pages/Roleplay.jsx` | Add toggle: "Practice (Offline)" keeps existing code, "AI Examiner" adds LLM mode |
| Roleplay engine | Create `src/lib/roleplayEngine.js` | System prompt as IGCSE examiner, per-turn scoring (grammar/vocab/fluency 1-5), corrections |
| AI UI | Modify `src/pages/Roleplay.jsx` | Chat bubbles, per-turn feedback panel, TTS for examiner, speech input for student, final scorecard |
| History | Modify `src/store/useStore.js` | Store completed AI roleplay sessions for Dashboard |

**System prompt approach:** "You are an IGCSE Malay oral examiner. Scenario: {context}. Respond in Malaysian Malay. After each student response, provide: next question + assessment (grammar/vocab/fluency scores 1-5 + specific corrections). 5-7 turns then wrap up."

**Verify:** Static roleplay unchanged. AI mode flows naturally. Per-turn feedback appears. Speech input + TTS work. Scorecard shows breakdown.

---

## Phase 4: LLM Writing Feedback

**Why:** Upgrades from regex pattern-counting to actual IGCSE rubric grading.

| Task | Files | What |
|------|-------|------|
| Grader | Create `src/lib/writingGrader.js` | `gradeEssay({ text, language, paper })` — prompts LLM with IGCSE rubric for Content + Language bands |
| UI | Modify `src/pages/Writing.jsx` | Keep regex as instant "Quick Check", add "Get AI Feedback" button with band scores, corrections, improvement tips |

**Key:** English uses Cambridge 0500/0510 rubric. Malay uses 0546 rubric. Both grade Content + Language on 1-6 scale with specific justifications.

**Verify:** Regex analysis still instant. AI feedback in 3-10s. Both English + Malay graded. Guests see "Sign in" CTA.

---

## Phase 5: FSRS Algorithm

**Why:** FSRS produces ~20-30% better retention than SM-2 with the same study time. Used by Anki v23+.

| Task | Files | What |
|------|-------|------|
| Install | `npm install ts-fsrs` | Well-maintained FSRS package (~15KB) |
| Wrapper | Create `src/lib/fsrs.js` | Same interface as sm2.js: `reviewCard()`, `isDue()`, `getDueCards()`, `sortByPriority()` |
| Migration | Modify `src/store/useStore.js` | One-time migration: `box >= 4` → FSRS "Review" state, `box <= 2` → "Learning" |
| Update consumers | Modify `Study.jsx`, `Dashboard.jsx`, `Settings.jsx` | 4 rating buttons (Again/Hard/Good/Easy) instead of 3 |
| Keep SM-2 | Keep `src/lib/sm2.js` as reference | Don't delete |

**Verify:** Existing cards migrate without data loss. Due counts reasonable. Ratings update stability/difficulty.

---

## Phase 6: Enhanced Dashboard

| Task | Files | What |
|------|-------|------|
| Study history | Modify store | Add `studyHistory: { [date]: { cardsReviewed, minutes } }` |
| 12-week heatmap | Modify `Dashboard.jsx` | GitHub-style contribution grid replacing 7-day placeholder |
| Weak topics bars | Modify `Dashboard.jsx` | Visual bar chart for topic weakness |
| Recommended study | Modify `Dashboard.jsx` | Suggest which deck based on FSRS retrievability |

---

## Phase 7: Enhanced Pronunciation

| Task | Files | What |
|------|-------|------|
| Sentence drill component | Create `src/components/SentenceDrill.jsx` | Full sentence TTS → user repeats → word-by-word green/yellow/red feedback |
| Integration | Modify `Study.jsx` | Add "Sentence" sub-mode within speak mode |

---

## Phase 8: More Grammar Drills

| Task | Files | What |
|------|-------|------|
| Expand data | Modify `src/data/grammar.js` | 15+ suffix drills, "identify error" type, "reorder sentence" type |
| New tabs | Modify `Grammar.jsx` | "Find the Error" + "Sentence Order" tabs |

---

## Phase 9: UI/UX + PWA Polish

| Task | Files | What |
|------|-------|------|
| Page transitions | Modify `App.jsx`, `index.css` | CSS fade+slide between routes |
| Offline banner | Modify `Layout.jsx` | Show banner when `!navigator.onLine` |
| SW upgrade | Modify `public/sw.js` | Dynamic cache versioning, precache build assets |
| Responsive | Modify `Layout.jsx`, `index.css` | Sidebar nav on tablet+ widths |

---

## Phase 10: Vocabulary Expansion + Word-by-Word

| Task | Files | What |
|------|-------|------|
| Word-by-word view | Modify `Import.jsx` | Toggle: `nama(name) saya(my)` inline format |
| Dictionary expansion | Modify `dictionary.js` | 495 → 800+ entries from IGCSE 0546 list |
| New topic packs | Modify `topics.js` | Add "Formal Language", "Proverbs", "News", "Emotions" |

---

## Phase 11: Gamification

| Task | Files | What |
|------|-------|------|
| XP system | Create `src/store/slices/gamificationSlice.js` | Card review +10, quiz +25, roleplay +50, daily goal +100 |
| Badges | Create `src/data/badges.js` | 15+ badges with unlock conditions |
| Dashboard | Modify `Dashboard.jsx` | XP bar, level, recent badges |

---

## Execution Order & Dependencies

```
Phase 0 (Foundation) ← everything depends on this
  ├── Phase 1 (Auth + Sync) ← Phases 2/3/4 depend on this
  │     └── Phase 2 (LLM Proxy) ← Phases 3/4 depend on this
  │           ├── Phase 3 (AI Roleplay)
  │           └── Phase 4 (LLM Writing)
  ├── Phase 5 (FSRS) ← independent, do anytime after Phase 0
  ├── Phase 6 (Dashboard) ← benefits from Phase 5
  ├── Phase 7 (Pronunciation) ← independent
  ├── Phase 8 (Grammar) ← fully independent, no dependencies
  ├── Phase 9 (UI/PWA) ← independent
  ├── Phase 10 (Vocab) ← independent
  └── Phase 11 (Gamification) ← independent
```

**Recommended order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 8 → 7 → 9 → 10 → 11

Phases 5-11 can be interleaved with 3-4 if you want variety.

---

## Verification (After Each Phase)

1. `npm run build` passes with zero errors
2. All 7+ routes render correctly
3. Dark/light themes both work
4. Zustand persistence survives page reload
5. Existing features NOT broken (feature preservation is critical)

---

## Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Supabase | Free | $0 (50K users, 500MB DB, 500K edge invocations) |
| GPT-4o-mini | Pay-as-go | ~$1 for single student usage |
| Vercel/hosting | Free | $0 |
| **Total** | | **~$1/month** |

Alternative: Gemini Flash or Groq Llama free tiers for $0 total.
