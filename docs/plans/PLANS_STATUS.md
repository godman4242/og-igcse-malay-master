# Plans — Status Map

Quick reference: which parts of the 5 plans in this folder are already
shipped in upg, partly done, or still open. Anchored to the state of the
upg repo as of 2026-05-12 (matches `RESUME_HERE.md`, `STORE_VERSION = 14`,
17 routes under `src/pages/`).

Use this so we don't accidentally redo work already merged.

Status legend: **DONE** · **PARTIAL** · **OPEN** · **STALE** (plan
written against an old state — superseded by current code, no action).

---

## 1. distributed-splashing-pearl.md — "State-of-the-Art Upgrade" (Phases 0–11)

Written when upg didn't exist and Supabase was installed-but-unused.
**Mostly STALE** — superseded by the actual upg implementation. Kept
only for historical context.

| Phase | What | Status | Where it landed |
|---|---|---|---|
| 0 | Foundation: API layer, ErrorBoundary, store slices | DONE | `src/components/ErrorBoundary.jsx`, store is one file but stable |
| 1 | Supabase auth + cloud sync | DONE | `cloudSync.js`, `syncEngine.js`, `AuthUnlock.jsx`, user tiers |
| 2 | LLM proxy | DONE differently | 3-tier chain: expert system → OpenRouter free → Gemini/Supabase Edge (`ai.js`, `gemini.js`, `openrouter.js`) |
| 3 | Interactive AI Roleplay | DONE | `RoleplaySession.jsx`, `RoleplayScorecard.jsx` |
| 4 | LLM writing feedback | DONE + extended | `writingGrader.js` (21 formats, hybrid AI grader), `WritingTutor.jsx`, `writingErrors.js` + `writingErrorsMalay.js` rule engines |
| 5 | FSRS | DONE | `ts-fsrs` + `src/lib/fsrs.js` |
| 6 | Enhanced dashboard | DONE | `Dashboard.jsx` with study history, weak topics, recent performance |
| 7 | Enhanced pronunciation | DONE | `PronunciationDrill.jsx` + Speaking page diff feedback |
| 8 | More grammar drills | DONE | `grammar.js` + `grammarEng.js` (60+ EN drills, Find Error + Transform tabs) |
| 9 | UI/UX + PWA polish | DONE | service worker, sync pill in Layout |
| 10 | Vocab expansion + word-by-word | PARTIAL | 254 curated example sentences shipped (`dictionaryExamples.js`); the 800+ entry target may not be fully reached — verify against `dictionary.js` |
| 11 | Gamification (XP + badges) | PARTIAL | `badges.js` + `badges` field in store; XP system status unclear — `grep -n "xp" src/store/useStore.js` to check |

**Action:** none for Phases 0–9. Spot-check Phase 10 dictionary count and
Phase 11 XP wiring if continuing on those.

---

## 2. smooth-frolicking-crescent.md — Phase 1: Supabase Auth + Cloud Sync

**DONE.** All 7 phases shipped. Implementation differs from the spec in
healthy ways:

- JSONB blob model: shipped (`cloudSync.js`, single state row per user).
- Auth: shipped (`AuthUnlock.jsx`) but with user-tier roles
  (`static | enhanced | admin | owner`) layered on top — beyond the
  original spec.
- `STORE_VERSION` is at **14** (plan targeted 6) — many migrations have
  followed, all preserving data.
- Sync layer: shipped via `syncEngine.js` with queue + retry.

**Action:** none. This plan is fully superseded.

---

## 3. playful-fluttering-ritchie.md — Learning Science (5 session-end gaps)

| # | Improvement | Status | Evidence |
|---|---|---|---|
| 1 | Smart session-end recommendations (`recommendations.js`) | PARTIAL | `recommendations.js` does NOT exist. But `ThreeLineFeedback.jsx` + `feedback.js` provide a similar Goal/Now/Next contract. The deeper multi-rule recommendation engine from the plan (low-acc → mistakes, weak patterns → drills, due drills, roleplay gap, etc.) is **not built as a single utility**. **Worth doing** as a small focused PR. |
| 2 | Warm-up phase (`sortWithWarmup`) | DONE-ish | `buildComebackQueue` exists in `fsrs.js`; the spaced-warmup variant (cards last reviewed 3–7 days ago) from the Pass-2 framing may not be the actual implementation — check `sortByPriority` callers in `Study.jsx`/`SmartStudy.jsx` |
| 3 | Production practice integration | DONE | `microPrompts.js` provides post-session "use this word in a sentence" prompts |
| 4 | Personalized daily plan (`getDailyPlan()`) | OPEN | `getStudyPlan()` exists; `getDailyPlan()` likely not yet — confirm via `grep -n "getDailyPlan" src/store/useStore.js` |
| 5 | Memory stability badge on cards | OPEN | No "Memory: Strong/Good/Weak/New" indicator found in Study.jsx — would attach to card render |

**Action:** Improvements 1, 4, 5 are still viable as small focused PRs.
Improvement 1 has the highest leverage.

---

## 4. learning-outcomes-ideation.md — Pass 1: 48 ideas, 5 strategic levers

Source pool only — no execution status. Used as the input for the
Pass-2 framing file. Keep for reference; if a new idea surfaces, this is
the canonical list to score it against (Lever A=production, B=metacognition,
C=exam, D=schemas, E=affect/identity).

**Action:** none. Reference document.

---

## 5. learning-outcomes-pass2-framing.md — Pass 2: 6 clusters, builder-ready

This is the **most actionable** of the five plans and the closest match to
what's actually being built. Each cluster's current status:

### Cluster B — Metacognitive Close-the-Loop · DONE
- ✅ `calibrationLog`, `mistakeReasons`, `sessionFeedback`, `reflections` all in store
- ✅ `ConfidencePrompt.jsx` (the planned `ConfidenceWager` — renamed)
- ✅ `ThreeLineFeedback.jsx` + `feedback.js`
- ✅ `setIdealSelf`, `setIdentityLabel`, `setStudyCue`, `markSessionStart`, `isComeback`
- ⚠️ Verify hypercorrection callout (Sure→Wrong path) is wired in Study.jsx if you want to confirm B.3
- ⚠️ Daily reflection prompt (B.7) — check that Dashboard surfaces "your strongest mode this week" once 7+ reflections logged

### Cluster E — Long-Game Motivation · MOSTLY DONE
- ✅ `identity.idealSelf`, `identity.label`, `identity.cue`, `lastSessionAt`
- ✅ Comeback detection (`isComeback`)
- ✅ `buildComebackQueue` in `fsrs.js`
- ❓ `cikguGreetings.js` data file not present — the daily one-liner (E.3) may render through a different code path; worth a quick check
- ❓ Choice-architecture daily plan (E.4: "pick 3 of 5") — likely OPEN
- ❓ Streak-freeze kind copy (E.5) — pure copy change; check current strings
- ❓ Then-vs-now passage delta (4.5) — likely OPEN
- ❓ Effort-over-outcome XP rules (E.8) — depends on whether XP system from distributed-splashing-pearl Phase 11 is wired

### Cluster A — Smarter Study Loop · PARTIAL
- ✅ Comeback queue (A.1 second half)
- ✅ Drill variant scaffolding via `drillVariants.js` (Worked-example/faded/solo concept exists, possibly under different naming)
- ✅ SmartStudy.jsx as a dedicated interleaved-session route
- ❌ Pretesting flow (A.2) — no `firstSeenPretest` field detected
- ❌ Reverse direction drill (A.3) — `grep "reverse-type"` returned nothing in Study.jsx
- ❌ Elaborative semantic prompt (A.4) — no `semanticTag` field detected
- ❌ Free-recall sweep (A.7) — no `grep "free.recall"` match
- ❌ Image-cue mode (A.8) — no `image-cue` mode and no `img` field on dictionary entries
- ❌ Self-explanation prompt (A.9) — likely OPEN; check Grammar.jsx
- ❓ Focus mode (A.5) — check Settings for the toggle

### Cluster C — IGCSE Exam Surface · PARTIAL
- ✅ Band-5/6 exemplars per format → `exemplars.js` (27/27 coverage per RESUME_HERE — better than the plan's 14)
- ✅ Constrained-output prompts → `microPrompts.js`
- ✅ Diagnostic mock → `ExamRehearsal.jsx` (planned name was `Diagnostic.jsx`)
- ❌ Stems library (`stems.js`) — file does not exist; stem-of-the-day + inline stem hints OPEN
- ❌ Genre check / `genres.js` / structured writing tab — OPEN
- ❌ IGCSE band descriptor file `igcseBands.js` — OPEN
- ❌ Grammar prereq DAG `grammarPrereqs.js` + mastery-lock UI — OPEN
- ❌ Daily IGCSE micro-task pool `dailyTasks.js` + Dashboard card — OPEN
- ❌ Examiner-mode feedback (C.9) `examiner.js` — OPEN
- ❌ Near-transfer drill (C.6) — OPEN
- ❌ i+1 reading ladder + sentence mining from Comprehension (C.10) — OPEN (Comprehension page exists but lacks the difficulty-sort + tap-to-add-card flow)
- ❌ Cultural weekly (`cultureWeekly.js`) — OPEN

### Cluster D — Pattern Visibility · DONE
- ✅ `Insights.jsx` route exists
- ⚠️ Confirm all 4 sections render (pattern surfacing, error heatmap, forgetting curve, topic radial) — `head` showed only imports

### Cluster F — Speech & Fluency · PARTIAL
- ✅ Shadowing-style drill → `PronunciationDrill.jsx` (planned name was `ShadowingDrill.jsx`); plus diff feedback in Speaking page
- ❌ 4/3/2 fluency page (`Fluency.jsx`) — OPEN
- ❌ Branching examiner reactions in `scenarios.js` (`branches: {...}`) — OPEN
- ❌ Teach-back mode in `CikguBot.jsx` — OPEN
- ❌ Mnemonic generator (1.6, deferred in plan) — OPEN as planned

---

## Recommended next slices

If you want to keep shipping against these plans, the highest-leverage
untouched items are:

1. **Cluster C — stems library + daily IGCSE micro-task** (`stems.js`,
   `dailyTasks.js`, Dashboard card). Exam-surface coverage gap; cheap to
   author; high motivation per LOC.
2. **playful-fluttering-ritchie #1 — explicit recommendations engine**
   (`recommendations.js`). The Goal/Now/Next surface exists; the
   underlying rule-based selector that picks the right "Next" for
   different session shapes does not.
3. **Cluster A — reverse-direction drill (E→M)** for cards at FSRS
   Review with stability ≥ 7 days. Highest pure-learning ROI of the
   missing study-loop items; the Generation Effect gap is the single
   biggest reason students who pass quizzes still freeze in Paper 2/3.
4. **Cluster C — mastery-locked grammar topics** (`grammarPrereqs.js` +
   soft lock UI). Small file + small UI change; large pedagogical lift.
5. **Cluster F — 4/3/2 fluency drill** (`Fluency.jsx`). The single most
   IGCSE-Paper-3-aligned feature still missing.

---

## Caveats

- This map is a quick scan, not a code review. The ❓/⚠️ marks flag items
  that need a deeper read before claiming "done" or "open".
- File-name drift between plan and code is intentional in upg (e.g.
  `ConfidencePrompt` vs `ConfidenceWager`); don't assume a missing
  filename means the feature is missing — `grep` for the behaviour.
- If you start work on any open item, **read `RESUME_HERE.md` first** —
  it has commit-level context (STORE_VERSION, migrations, recent
  conflict resolutions) that this doc abstracts away.
