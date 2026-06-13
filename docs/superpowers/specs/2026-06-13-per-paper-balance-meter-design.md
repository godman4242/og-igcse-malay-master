# Per-paper balance meter (review feature #7) — DESIGN + backlog triage

**Status: ✅ BUILT + SHIPPED 2026-06-13 (loop iteration 5).** Kheshav baked the product calls
(one activity = one completed unit per surface; session counts, not minutes; rolling 7 days) and the
loop built it test-first: `src/lib/skillBalance.js` (pure aggregator) + `skillActivity` store slice
(STORE_VERSION 30→31) + 5 surfaces instrumented + lazy Dashboard `PaperBalance` widget. Decisions and
veto notes live in the RESUME_HERE.md shipped box. The design analysis below is kept as the record.

## The crux — the data isn't there yet
A per-paper balance meter ("you haven't done Listening this week") needs per-skill activity. Grounding
against `src/store/useStore.js`, here's what's actually tracked:

| IGCSE skill | Tracked? | Source in store |
|---|---|---|
| Vocab/Study | ✅ rich | `studyHistory` `{ 'YYYY-MM-DD': { reviews, minutes } }` |
| Writing | ✅ | `writingHistory` `[{ ts, lang, format, score }]` |
| Speaking | ✅ | `speakingHistory` `[{ ts, … durationSec }]` + `ai.roleplayHistory` |
| Grammar | ⚠️ partial | `grammarCards` (SRS state per drill; no clean per-day activity) |
| Exam | ✅ (composite) | `examAttempts` `[{ ts, … }]` |
| **Reading** (comprehension, pdf-reader) | ❌ **none** | — |
| **Listening** (listening, dictation) | ❌ **none** | — |

So a 4-paper meter today would show **Reading = 0 and Listening = 0 forever**, even right after the
learner finishes a comprehension set — misleading, and it can't fulfil the feature's whole point
(nudging neglected papers). `grep` proof: no `comprehensionHistory`/`listeningHistory`/`readingHistory`
of any kind in the store.

## What an honest build requires (the open decisions — need Kheshav)
1. **Add per-skill activity logging** — a new persisted `skillActivity` (e.g.
   `{ 'YYYY-MM-DD': { reading, listening, writing, speaking, vocab, grammar } }`, local-day keyed via
   `src/lib/localDay.js`) + one tiny action `logSkillActivity(skill)`. **STORE_VERSION bump 30 → 31.**
2. **Instrument ~5 surfaces** to call it on a completed unit of work: Comprehension (question set done),
   Listening (passage scored), Dictation (set done — note dictation v1 doesn't persist, this would be
   its first persistence), PDFReader (a read session — fuzzy: what counts?), Grammar (drill batch).
   Writing/Speaking/Vocab/Exam can be derived from existing arrays OR also call the logger for uniformity.
   **PRODUCT CALL: what is "one activity" per surface?** (a finished set? N minutes? one item?)
3. **Metric** — counts (simple, always available) vs minutes (needs durations; only some surfaces have
   them). Recommend **counts/sessions for v1**.
4. **Window** — "this week" via the rolling-7-day helper in `src/lib/patterns.js` (stay consistent with
   the Dashboard heatmap, which is local-day keyed).
5. **Placement** — a new Dashboard card (`src/pages/Dashboard.jsx`); obey the Zustand
   getter-not-in-selector + no-allocation-in-selector rules.

**Recommended build shape (once decided):** pure `skillBalance(activityLog, todayISO)` aggregator
(red-proof first) → `logSkillActivity` action + migration → instrument the 5 surfaces → Dashboard card.
Bounded once the product call is made; ~6 files. NOT something to guess autonomously.

## Backlog triage — why the overnight loop is pausing here
The clean, high-value, autonomously-buildable features are shipped (#1 lint guard, #2 dictionary gaps,
#3 calibration, #4 listening stage, #5 dictation, + the repo-hygiene backlog). Everything left in the
review's feature table carries a product or content-risk dimension that makes a blind overnight build
low-quality:

| # | Feature | Score | Why it's NOT a clean autobuild |
|---|---|---|---|
| 6 | Retire/retie XP | 8 | Pure **product-direction** call (remove/rework a user-facing engagement feature) |
| 7 | Per-paper balance meter | 6 | Needs instrumentation + migration + the **product call** above |
| 8 | Parameterized listening passages | 4 (eff 3) | Re-templating 8 passages w/ linked Q&A; **Malay variants = native-speaker risk** (review says confirm Malay content with a native speaker) |
| 9 | Record-and-compare in Speaking | 4.5 | MediaRecorder audio UI — little unit-testable core, hard to verify headlessly |
| 10 | Cloze-listening | 4 (eff 3) | Content + gap-selection judgment; reuses clozeBuilder but needs design |

**Recommendation:** Kheshav picks a direction in the morning. Best next autobuilds *after* a product
nod: #7 (decide the activity-unit question above) or #10 (decide gap strategy). #6 and #8 are
genuinely his calls. Re-run `/loop` once a direction is set and the loop resumes cleanly.
