# Pass 2 — Framing: Builder-Ready Specs

**Project:** IGCSE Malay Master
**Input:** 48 ideas in `/Users/kheshav/.claude/plans/learning-outcomes-ideation.md`
**Goal of this pass:** Translate ideas into ranked, sequenced, builder-executable specs. A downstream builder agent should be able to pick a cluster and ship it without follow-up questions.
**Status:** in progress, saved incrementally.

---

## Scoring Rubric

Each idea scored 1–5 on three axes:

- **L (Learning impact):** how much does this move an actual IGCSE outcome (vocab range, accuracy, communication, pronunciation, fluency)? 5 = directly moves an exam-graded skill; 1 = peripheral.
- **F (Codebase fit):** how cleanly does it slot into existing architecture? 5 = uses existing data/components, no new infra; 1 = needs new routes, schemas, or external services.
- **C (Cost cap):** inverted — 5 = no AI cost ever, 3 = uses free-tier OpenRouter occasionally, 1 = needs paid LLM calls per use.

**Composite = L × F × C (max 125).** Score ≥ 60 = top cluster; 36–59 = solid; below 36 = defer.

Bias notes: L is the most important signal (this is a learning app, not a feature buffet). C matters because the user has explicitly avoided paid AI dependencies. F prevents over-engineering: a brilliant idea that requires 6 weeks of refactor loses to a good idea that ships in a day.

---

## Master Ranking

| ID | Idea | L | F | C | Score | Cluster |
|---|---|---|---|---|---|---|
| 1.7 | Cumulative warm-up (spaced retrieval) | 4 | 5 | 5 | 100 | A |
| 3.1 | Pre-answer confidence wager | 5 | 4 | 5 | 100 | B |
| 3.3 | Three-line feedback (Feed-Up/Back/Forward) | 5 | 4 | 5 | 100 | B |
| 4.5 | Visible competence (then vs now passage) | 4 | 5 | 5 | 100 | E |
| 6.4 | 1-card mode (tiny habit) | 4 | 5 | 5 | 100 | E |
| 6.8 | Comeback warm welcome | 4 | 5 | 5 | 100 | E |
| 1.4 | Reverse direction drill (E→M) | 5 | 4 | 5 | 100 | A |
| 3.6 | Why-I-got-it-wrong tagging | 4 | 5 | 5 | 100 | B |
| 4.4 | Streak-freeze framed kindly | 3 | 5 | 5 | 75 | E |
| 5.6 | Common-error heatmap | 4 | 5 | 4 | 80 | D |
| 3.4 | Error journal pattern surfacing | 4 | 5 | 4 | 80 | D |
| 3.8 | Forgetting-curve visualization | 4 | 4 | 5 | 80 | D |
| 4.3 | Choice architecture for daily plan | 4 | 4 | 5 | 80 | E |
| 5.1 | Genre-aware writing scaffolds | 5 | 4 | 4 | 80 | C |
| 4.8 | Cikgu's daily one-liner | 3 | 5 | 5 | 75 | E |
| 4.7 | Effort-over-outcome rewards | 3 | 5 | 5 | 75 | E |
| 4.1 | One-thing-at-a-time focus mode | 3 | 5 | 5 | 75 | A |
| 5.2 | Examiner sentence stems library | 5 | 3 | 5 | 75 | C |
| 1.8 | Elaborative encoding semantic prompt | 4 | 4 | 5 | 80 | A |
| 6.7 | Identity-label after 7-day streak | 3 | 5 | 5 | 75 | E |
| 1.2 | Pretesting before new cards | 4 | 4 | 5 | 80 | A |
| 4.2 | Worked example → faded → solo | 5 | 3 | 5 | 75 | A |
| 2.8 | Daily IGCSE micro-task | 5 | 4 | 4 | 80 | C |
| 5.4 | Near-transfer drill (novel item) | 5 | 4 | 4 | 80 | C |
| 5.8 | Mastery-locked grammar sequences | 4 | 4 | 5 | 80 | C |
| 6.3 | Implementation intentions cue | 4 | 4 | 5 | 80 | E |
| 1.1 | End-of-session free-recall sweep | 5 | 3 | 5 | 75 | A |
| 6.1 | Ideal-L2-Self onboarding | 4 | 4 | 5 | 80 | E |
| 5.3 | Topic-schema vocab clustering | 4 | 4 | 5 | 80 | D |
| 2.6 | i+1 comprehension ladder | 4 | 3 | 5 | 60 | C |
| 2.7 | Sentence-mining from comprehension | 4 | 4 | 5 | 80 | C |
| 4.6 | Optimal-challenge feedback (post-session 1-tap) | 4 | 4 | 5 | 80 | B |
| 1.3 | Self-explanation prompt | 4 | 3 | 5 | 60 | A |
| 1.5 | Image cue mode (emoji-first) | 3 | 4 | 5 | 60 | A |
| 3.7 | Daily reflection prompt | 3 | 5 | 5 | 75 | B |
| 3.2 | Hypercorrection feedback loop | 4 | 4 | 5 | 80 | B |
| 5.5 | Far-transfer constrained writing | 5 | 3 | 4 | 60 | C |
| 2.2 | Constrained-output sentence builder | 5 | 3 | 4 | 60 | C |
| 6.5 | Distant-goal anchor in daily plan | 4 | 4 | 5 | 80 | E |
| 6.6 | Cikgu near-peer persistent voice | 4 | 4 | 5 | 80 | E |
| 6.2 | Cultural authenticity weekly piece | 3 | 4 | 5 | 60 | C |
| 5.7 | Examiner-mode holistic feedback | 5 | 3 | 3 | 45 | C |
| 3.5 | Pre-exam diagnostic mock | 5 | 3 | 4 | 60 | C |
| 2.1 | 4/3/2 fluency drill | 4 | 3 | 4 | 48 | F |
| 2.4 | Shadowing drill | 4 | 3 | 4 | 48 | F |
| 2.5 | Teach-back to Cikgu | 4 | 3 | 3 | 36 | F |
| 2.3 | Branching examiner reactions | 4 | 3 | 3 | 36 | F |
| 1.6 | Mnemonic keyword bridges (LLM) | 3 | 3 | 2 | 18 | defer |

(Scores ≥ 60 are the buildable set: 38 of 48. Below 60: 1.6 only — its value is real but the LLM cost vs simpler alternatives makes it second-priority.)

---

## Cluster Map

The ranked ideas group into 6 shippable clusters. Each cluster is a coherent shipping unit — components inside reinforce each other and share code/state changes, so building them together is cheaper than picking ideas one-by-one.

- **Cluster A — Smarter Study Loop** (encoding upgrades on `Study.jsx`)
- **Cluster B — Metacognitive Close-the-Loop** (confidence, calibration, reflection)
- **Cluster C — IGCSE Exam Surface** (genre scaffolds, stems, micro-tasks, transfer)
- **Cluster D — Pattern Visibility** (heatmaps, forgetting curve, topic schemas)
- **Cluster E — Long-Game Motivation** (identity, habit, kind affect, daily plan)
- **Cluster F — Speech & Fluency** (4/3/2, shadowing, branching examiner)

**Recommended ship order:** B → E → A → C → D → F.
- **B first** — biggest learning-impact ROI per line of code; all top-rated; no dependencies on others.
- **E second** — protects retention/return rate, which lifts every later improvement's effective impact.
- **A third** — once metacognition + motivation are present, encoding upgrades have somewhere to land.
- **C fourth** — exam-specific surface needs the foundation in place.
- **D fifth** — visualizations are best built once enough data exists.
- **F last** — speech infrastructure is the highest cost and most risk; ship after the cheaper wins.

---

## Cluster B — Metacognitive Close-the-Loop

**Goal:** Convert sessions from "stats reports" into self-regulated learning loops — students leave each session knowing what to do next and how confident they should be in what they "know".
**Component ideas:** 3.1 confidence wager · 3.2 hypercorrection · 3.3 three-line feedback · 3.6 error tagging · 3.7 daily reflection · 4.6 optimal-challenge check · (plus: replaces the old "Improvement 1: Smart Session-End Recommendations" from `playful-fluttering-ritchie.md` more thoroughly)
**Why first:** every idea in this cluster scores ≥75; it's almost entirely UI + new store fields with zero new infrastructure; the rest of the plan is more useful once the calibration data starts collecting.

### B.1 — Store changes (`src/store/useStore.js`)

Bump `STORE_VERSION` from 5 → 6. Add migration that initializes the new fields with safe defaults.

New fields on root state:
```js
// Metacognitive log — append-only, capped at 500 entries
calibrationLog: [],     // [{ ts, cardId, confidence: 'guess'|'maybe'|'sure', correct: bool, mode }]

// Per-mistake metadata, attached to existing `mistakes` entries via mistake.id
mistakeReasons: {},     // { [mistakeId]: 'unknown' | 'confused' | 'typo' | 'misread' }

// Post-session affect signal
sessionFeedback: [],    // [{ ts, deck, accuracy, perceived: 'easy'|'right'|'hard' }]

// Daily reflection log
reflections: [],        // [{ ts, bestMode: 'vocab'|'grammar'|'speak'|'read', note: string }]
```

New actions:
- `logCalibration({ cardId, confidence, correct, mode })`
- `logMistakeReason(mistakeId, reason)` — also adjusts FSRS difficulty: typo and misread get a softer demotion
- `logSessionFeedback({ deck, accuracy, perceived })` — biases next session's variant difficulty (read by `selectVariantSafe` in `data/drillVariants`)
- `logReflection({ bestMode, note })`

New getters:
- `getCalibrationScore()` → `{ sureCorrect, sureWrong, guessCorrect, guessWrong, calibrationGap }` — percentage points by which the student over- or under-estimated themselves over the last 50 entries
- `getHypercorrectionTargets()` → cardIds where confidence='sure' but correct=false in the last 14 days

### B.2 — Confidence wager UI (Idea 3.1)

**Where:** `src/pages/Study.jsx`. Insert between the card front and the answer reveal in `quiz`, `type-answer`, `cloze`, and `listen` modes. NOT in `flashcard` mode (the user already self-rates ease).

**Component:** new `src/components/ConfidenceWager.jsx`
- Three buttons in a row: 🤔 Guessing / 😐 Maybe / 💪 Sure
- Buttons styled with `var(--color-card)` background, accent border on hover
- Selecting a button is non-blocking: it logs and immediately reveals the answer

**Behavior:** if the user skips (presses reveal directly), nothing logs. The wager is optional; making it required would violate Affective Filter principles.

**Wiring:** Study.jsx tracks `pendingConfidence` in local state. On answer-reveal, calls `logCalibration({ cardId, confidence: pendingConfidence, correct, mode })`.

### B.3 — Hypercorrection feedback (Idea 3.2)

**Where:** Study.jsx wrong-answer feedback panel.

**Trigger:** when `pendingConfidence === 'sure'` and answer is wrong.

**UI:** prepend a callout to the existing wrong-answer feedback:
> ⚠️ You were sure but it was wrong. These are the *most fixable* errors — your brain notices the gap. Take 10 seconds to read why.

After the standard correction shown, FSRS rating is forced to `Again` (already automatic for wrong answers). Card's `difficulty` parameter is bumped by an extra +0.3 (cap at 10) — small targeted intervention, not a full demotion.

### B.4 — Three-line feedback contract (Idea 3.3)

**Goal:** every feedback surface answers Feed-Up / Feed-Back / Feed-Forward.

**Component:** new `src/components/ThreeLineFeedback.jsx`. Props: `{ goal, now, next }` plus an optional `nextHref` and `nextOnClick`.

**Render targets:**
1. `Study.jsx` session-end (replaces the bare stats grid at lines 260–303 — keep stats but wrap them with the three-line component).
2. `RoleplayScorecard.jsx` — at the top of the existing feedback layout.
3. `Writing.jsx` analyzer output footer.
4. `Grammar.jsx` end-of-drill summary.

**Content generator:** new `src/lib/feedback.js` exporting `buildFeedback(context, storeState)` where `context` is one of `'study-session' | 'roleplay' | 'writing' | 'grammar-drill'`. Returns `{ goal, now, next, nextHref }`. Pulls from `getStudyPlan()`, `getCalibrationScore()`, exam date, and accuracy. Templated language; no LLM.

Example for study-session at 78% accuracy:
- **Goal:** "Move steadily toward Band 5: aim for 85% accuracy on review-state cards."
- **Now:** "Today: 78% across 22 cards. Calibration gap: +12% (you slightly overrate yourself)."
- **Next:** "Tag 3 of those wrongs by reason → Mistakes page" → links to `/mistakes`.

### B.5 — Wrong-answer reason tagging (Idea 3.6)

**Where:** Study.jsx wrong-answer feedback panel, AFTER the answer is shown.

**UI:** chip row: [Didn't know] [Confused with…] [Typo] [Misread]. Tapping a chip logs and dismisses the panel. "Confused with…" opens a small word-picker dialog of the user's other Review-state cards in the same topic for fast pairing.

**Effects:**
- `unknown` → no FSRS adjustment beyond the wrong itself
- `confused` → store the confused-pair in `mistakeReasons` for a future "contrastive review" (deferred to Cluster A)
- `typo` → soften FSRS: re-rate from `Again` to `Hard`
- `misread` → soften FSRS: re-rate from `Again` to `Hard`, flag for Cluster A's pretest reuse

### B.6 — Optimal-challenge post-session prompt (Idea 4.6)

**Where:** Study.jsx and MixedSession.jsx, after the three-line feedback but before the action buttons. Triggers only every 3rd session to avoid prompt fatigue.

**UI:** "Was that... 🥱 too easy / ✅ just right / 😰 too hard?" Single tap, dismisses. Logs to `sessionFeedback`.

**Effect:** updates a rolling 5-session bias parameter that `selectVariantSafe` already accepts for variant difficulty selection. Three consecutive 😰 → step variant difficulty down. Three consecutive 🥱 → step it up.

### B.7 — Daily reflection on goal completion (Idea 3.7)

**Where:** Study.jsx and Dashboard. Triggers when the daily-goal counter ticks over (existing logic in `useStore.js` engagement section).

**UI:** modal-ish card (in-page, not a true modal): "Daily goal hit! 🎉 What clicked today?" with chips [📚 Vocab / 📖 Grammar / 🗣️ Speaking / 📰 Reading] and an optional 60-char text field. Save+close. Skipping is fine.

**Read surface:** Dashboard shows "your strongest mode this week was X" once 7+ reflections logged. Pure data summary — no LLM.

### B.8 — Build sequence (in this order)

1. Bump `STORE_VERSION`, add fields, write migration. `npm run build`. Verify `igcse-malay-store` still loads in DevTools after a refresh.
2. Implement actions and getters; do not wire UI yet.
3. Add `ConfidenceWager.jsx` + Study.jsx wiring (one mode first — `quiz` — to validate). Build, manually run a session, confirm `calibrationLog` populates.
4. Add hypercorrection callout (B.3). Verify by deliberately answering "Sure → wrong".
5. Add reason chips (B.5). Verify FSRS adjustments via `getCardById(...).difficulty` before/after.
6. Build `feedback.js` + `ThreeLineFeedback.jsx`. Wire into Study.jsx session-end first.
7. Wire ThreeLineFeedback into the other 3 surfaces.
8. Add optimal-challenge prompt (B.6). Verify variant bias persists across sessions.
9. Add daily-reflection prompt (B.7). Verify Dashboard summary after seeding 7+ entries via dev tools.
10. Final `npm run build` zero errors. Smoke-test all 12 routes.

### B.9 — Verification checklist (cluster-level)

- [ ] `npm run build` zero errors after each step
- [ ] Store survives reload (persistence test)
- [ ] No infinite re-render loops (no getter calls inside `useStore` selectors — see CLAUDE.md)
- [ ] Confidence wager appears in 4 modes, not in flashcard mode
- [ ] Hypercorrection callout fires only on Sure+Wrong
- [ ] Reason chips appear only after wrong answers, not after correct
- [ ] ThreeLineFeedback renders in all 4 designated surfaces with `goal/now/next` text populated
- [ ] Optimal-challenge prompt appears every 3rd session, not every session
- [ ] Daily reflection appears on goal completion only, not on every session
- [ ] Light/dark themes both work for new components

---

## Cluster E — Long-Game Motivation

**Goal:** Protect and grow return-rate and identity-based engagement, especially across the multi-month grind that IGCSE prep actually is. SDT-grounded (autonomy, competence, relatedness) and Dörnyei-grounded (Ideal L2 Self).
**Component ideas:** 4.3 choice architecture · 4.4 kind streak-freeze · 4.5 visible competence · 4.7 effort rewards · 4.8 Cikgu one-liner · 6.1 Ideal-L2-Self · 6.3 implementation intentions · 6.4 1-card mode · 6.5 distant-goal anchor · 6.6 near-peer Cikgu · 6.7 identity label · 6.8 comeback welcome.
**Why second:** these protect the user's return rate. Every later cluster's effective impact is proportional to how often students come back.

### E.1 — Store changes

```js
// New persistent fields
identity: {
  idealSelf: '',            // 60-word self-authored future-self description (Idea 6.1)
  label: null,              // 'Consistent' | 'Curious' | 'Brave' | 'Detailed' | 'Determined' | null
  cue: null,                // 'morning' | 'commute' | 'evening' | null (Idea 6.3)
  identityChosenAt: null,
},
lastSessionAt: null,        // ISO timestamp; used to detect comeback (Idea 6.8)
```

New actions: `setIdealSelf(text)`, `setIdentityLabel(label)`, `setStudyCue(cue)`, `markSessionStart()` (updates `lastSessionAt`, also detects > 7 day gaps and triggers comeback flow).

New getters: `isComeback()`, `getDaysSinceLastSession()`, `getDailyMotionDelta()` (for Idea 6.5: how much one daily-goal completion shifts `readinessPct`).

### E.2 — Onboarding additions

Two new optional steps appended to existing first-run onboarding:

1. **Ideal-L2-Self (6.1):** "Imagine yourself a year from now using Malay confidently. Where are you, who are you talking to, and about what?" Free 60-word textarea. Save to `identity.idealSelf`. Skip allowed.
2. **Implementation intention (6.3):** "When will you usually study?" Three large cards: ☕ Morning · 🚌 Commute · 🌙 Evening. Saves `identity.cue`. Skip allowed.

These appear only in onboarding (not retroactively forced on existing users — but Settings has fields to set them).

### E.3 — Dashboard rebuild section: motivation row

New row near the top of `Dashboard.jsx`, between the streak header and existing widgets:

- **Cikgu one-liner (4.8):** templated string from `data/cikguGreetings.js` chosen by recent stats — e.g., "Your meN- accuracy jumped 12% this week — bagus!" / "You haven't tried a roleplay in 5 days — short one?" Pure data, no LLM. New file `src/data/cikguGreetings.js` with ~30 templates and a `pickGreeting(stats)` selector.
- **Distant-goal anchor (6.5):** if `examDate` set → "📅 47 days to exam · today moves you 1.4% closer." `dailyMotionDelta` = remaining gap to target band ÷ days remaining. If no exam date set → "Each daily goal builds your foundation."
- **Identity badge (6.7):** if `identity.label` is set, show a small chip with the label and one-line meaning ("Consistent · shows up daily even on hard days").
- **Then-vs-now passage (4.5):** weekly visualization (Sunday refresh): "30 days ago you couldn't read this — now you can." Picks a sample passage from `data/comprehension.js` whose unknown-word ratio dropped most over 30 days. Cap at one per week to preserve impact.

### E.4 — Choice-architecture daily plan (4.3)

Replace the prescriptive "today: X cards + Y drills" with: "Today, choose 3 of 5: [Vocab 20] [Grammar 5] [Roleplay 1] [Comprehension 1] [Writing 50]". Selected items become the daily-goal target. Selections persist for the day. Unselected types show as muted; tapping completes them anyway with bonus XP if the user has spare capacity.

Code: extend `getDailyPlan()` from the audit's planned Improvement 4 to return `{ options: [...], chosen: [...] }` and respect user picks.

### E.5 — Streak-freeze framing (4.4)

Pure copy change in existing freeze-related UI strings in `Layout.jsx` / `Dashboard.jsx`:
- "Streak frozen" → "Cikgu put a freeze on for you 💙"
- "You'll lose your streak tomorrow!" → "If today's tough, a freeze is fine — you've earned this streak."

Optional: animate freeze placement with a brief Cikgu line. Zero engineering cost.

### E.6 — 1-card mode (6.4)

CTA on Dashboard alongside the regular Study button: "Just one card?" — always shown. Clicking starts a single-card session that exits after one review. The session counts toward streak (since BJ Fogg's tiny-habit anchor depends on the win). XP smaller than full session but positive.

Implementation: `Study.jsx` accepts a query param `?count=1`; the session-end logic at line 187 already triggers when `remaining.length === 0`.

### E.7 — Comeback warm welcome (6.8)

Triggered by `isComeback()` getter (≥ 7 days since `lastSessionAt`).

When comeback session starts, `Study.jsx` overrides queue generation: pull 5 highest-stability cards (mature ones the user knows) regardless of due date. Show a Cikgu banner: "Selamat datang kembali! Let's ease in — these are old friends." After this single warm-up session, normal queue resumes.

This is the biggest specific lever in the cluster: returning learners who get hit with a "142 cards due!" usually quit forever.

### E.8 — Effort-over-outcome XP (4.7)

Modify XP awarding in `useStore.js` (existing engagement layer):
- Same XP for "tried hardest variant" as for "answered easy variant correctly"
- "Wrong → re-attempted on next due date" gets +50% XP bonus
- New copy in level-up toasts: "You stayed on that one — that's the work."

No data changes; rule changes only.

### E.9 — Build sequence

1. Store changes (`STORE_VERSION` 6→7 if Cluster B already bumped to 6, otherwise 5→6 directly). Migration. Build.
2. Onboarding additions (E.2) — easy to test in DevTools by clearing localStorage.
3. Comeback flow (E.7) — testable by manually setting `lastSessionAt` to 8 days ago.
4. 1-card mode (E.6) — single CTA + query-param wiring.
5. Streak-freeze copy changes (E.5) — find/replace.
6. Dashboard motivation row (E.3) — Cikgu greeting, distant-goal anchor, identity badge.
7. Then-vs-now passage (4.5) — needs aggregate calc; do last in cluster.
8. Choice architecture (E.4) — biggest scope item; do after smaller wins.
9. XP rule changes (E.8) — simple but needs careful regression check on level-up animation triggers.
10. Identity label prompt at 7-day streak (6.7) — one-shot UI; trivial.

### E.10 — Verification

- [ ] `npm run build` zero errors after each step
- [ ] Onboarding skippable; existing users not forced through new screens
- [ ] Comeback flow does not double-trigger if user does two sessions in one day after a long break
- [ ] 1-card mode counts toward streak but does not overstate XP
- [ ] Choice architecture: unchosen tasks remain available but visually muted
- [ ] Then-vs-now passage caches for 7 days (don't recompute every render)
- [ ] All copy works in dark and light themes
- [ ] No regressions to existing streak/freeze logic

---

## Cluster A — Smarter Study Loop

**Goal:** Strengthen encoding and retrieval inside the existing study loop using cheap, evidence-backed interventions. All changes attach to `Study.jsx` and `fsrs.js`; no new routes.
**Component ideas:** 1.1 free-recall sweep · 1.2 pretesting · 1.3 self-explanation · 1.4 reverse direction · 1.5 image cue · 1.7 cumulative warm-up · 1.8 elaborative encoding · 4.1 focus mode · 4.2 worked-example fading.
**Why third:** depends on Cluster B's calibration data to drive adaptive scaffolding decisions; once B and E are in, A is layered on a stable base.

### A.1 — Queue generation upgrades (`src/lib/fsrs.js`)

New exports:

```js
// Replaces the audit plan's vanilla sortWithWarmup
export function sortWithSpacedWarmup(cards, count = 3) {
  // 1. Find cards last reviewed 3-7 days ago, sorted by stability desc, take `count`
  // 2. Remaining cards sorted by sortByPriority
  // Returns warmup cards first, then the rest
}

export function isComebackQueue(lastSessionAt) {
  return lastSessionAt && (Date.now() - new Date(lastSessionAt).getTime()) > 7 * 24 * 60 * 60 * 1000
}

export function buildComebackQueue(allCards, count = 5) {
  // Highest-stability mature cards regardless of due date
}
```

Wire into Study.jsx queue generation at startup. Spaced warm-up replaces the old plan's warm-up; comeback queue overrides everything when `isComeback()` returns true (Cluster E.7 dependency).

### A.2 — Pretesting flow (Idea 1.2)

For New-state cards (`card.reps === 0`) in `quiz`, `type-answer`, `cloze` modes:

Insert a 5-second optional guess prompt before the answer reveal:
- Headline: "Take a guess — your brain remembers better when it tries first."
- Single text input or "Skip" link.
- Whatever the guess is, app then proceeds to normal answer reveal with: "✨ Now you'll remember it better."

No grading. The act of attempted retrieval is the entire point (Productive Failure).

State: add `card.firstSeenPretest = true` once a pretest happens, so it never repeats for the same card.

### A.3 — Reverse direction drill (Idea 1.4)

New `reverse-type` mode in `Study.jsx` mode switcher. Available when:
- card is in FSRS Review state
- card.stability ≥ 7 days

Mode shows English → user types Malay. Generation Effect target.

If wrong, automatically queue a forward (M→E) drill of the same card next session as scaffolding (`card.scaffoldM2E = true`).

UI: same card layout as `type-answer`, just inverted.

### A.4 — Elaborative encoding semantic prompt (Idea 1.8)

Only for `card.reps === 0` AND mode is `quiz` or `cloze`. Before card content:

> "Quick — is this word about: 👥 People · 🪑 Things · 🏃 Actions · ❤️ Feelings"

Four large buttons. Any answer fine. Tap → card proceeds. Logs the choice on the card (`card.semanticTag`) for later use in topic-clustering visualizations (Cluster D).

This costs 2 seconds and forces deep semantic processing on first encounter — research-backed retention boost.

### A.5 — Focus mode (Idea 4.1)

New toggle in Settings: "Focus mode for new cards". When on (default = on):
- For card.reps ≤ 1, hide: progress bar, mode-switcher dropdown, hints panel, footer
- Show only: card content, answer reveal, Right/Wrong buttons
- Once card has reps ≥ 2, full UI returns

Implementation: `Study.jsx` conditional class on the layout wrapper. CSS `display: none` for hidden elements.

### A.6 — Worked example → faded → solo (Idea 4.2)

For `Grammar.jsx` drill rendering (not vocab — grammar drills benefit most). Lookup uses FSRS `state` of the drill in `grammarCards`:

- `New` → before showing the drill, show a worked example: "Here's how it works: tulis → menulis (T drops). Now you try."
- `Learning` → show a hint reveal button with the first letter of the answer.
- `Review` → solo, no scaffolding.

Implementation: new `src/components/DrillScaffold.jsx` that wraps drill rendering; reads FSRS state from `useStore`.

### A.7 — Free-recall sweep at session end (Idea 1.1)

Optional 60-second free-recall after each Study session, only when `sessionStats.reviewed ≥ 10` (otherwise too few words to make it useful).

UI: full-screen sub-view of Study.jsx with:
- Headline: "60 seconds — write every word from this session you can remember."
- Big textarea
- Timer

On submit:
- Fuzzy-match input against the session's reviewed Malay words
- For each matched word, log a bonus retrieval to FSRS (treat as Easy rating but don't double-count toward today's review count)
- For each unmatched word, bump card.difficulty by 0.2 to surface it sooner
- Show summary: "You recalled 14 of 22 — strong session!"

Skipping is one tap. The skip rate itself becomes a metacognition signal in Cluster D.

### A.8 — Image-cue mode (Idea 1.5) — emoji-first

New `image-cue` mode in Study.jsx. Available for cards in `data/dictionary.js` that have an optional `img` field (emoji or icon string).

Mode shows just the emoji + 4-option multiple choice or type-input. Limited to vocabulary with concrete referents (food, places, body parts, weather).

Initial seeding: walk through `dictionary.js` and add emoji where obvious. ~150 of the 804 entries should map naturally to a single emoji. Skipped for abstract words.

### A.9 — Self-explanation prompt (Idea 1.3) — light-touch

Every 3rd correct grammar drill in `Grammar.jsx`, optionally:
> "Quick: in your own words, why is this answer right?"

Free 100-char text input + Skip. Logged to `mistakes` (yes — `mistakes` becomes a "study notes" journal more than just an error log) with a `type: 'self-explanation'` flag.

No grading. Generation alone produces the benefit.

### A.10 — Build sequence

1. Queue upgrades (A.1) — `sortWithSpacedWarmup`, `buildComebackQueue`. Build, test.
2. Pretesting (A.2) — single new branch in Study.jsx render. Easy to verify.
3. Elaborative semantic prompt (A.4) — same shape as A.2.
4. Focus mode (A.5) — pure conditional rendering.
5. Free-recall sweep (A.7) — most code; do once others are stable.
6. Reverse direction mode (A.3) — new mode + scaffold logic.
7. Drill scaffold (A.6) — affects Grammar.jsx; touch-test all drill types.
8. Self-explanation prompt (A.9) — small.
9. Image-cue mode (A.8) — most content authoring; do last in cluster.

### A.11 — Verification

- [ ] All existing study modes still work
- [ ] Warm-up: first 3 cards are stability-high AND last reviewed ≥3 days ago, when such cards exist
- [ ] Pretesting fires once per New card, not on review of same card
- [ ] Free-recall fuzzy-match is forgiving (case, accents, simple typos)
- [ ] Reverse-type only available on stable Review-state cards
- [ ] Drill scaffold renders correct UI per FSRS state (test with synthetic states)
- [ ] No regressions in card review counts or streak logic

---

## Cluster C — IGCSE Exam Surface

**Goal:** Convert the app from "general Malay practice" into "IGCSE 0546-targeted prep" by exposing genre conventions, formulaic stems, band descriptors, and exam-format daily practice.
**Component ideas:** 2.2 constrained output · 2.6 i+1 reading ladder · 2.7 sentence mining · 2.8 daily IGCSE micro-task · 5.1 genre scaffolds · 5.2 stems library · 5.4 near-transfer · 5.5 far-transfer · 5.7 examiner-mode feedback · 5.8 mastery-locked grammar · 6.2 cultural authenticity.
**Why fourth:** depends on the metacognitive base (B) to know what to recommend, and on the motivational base (E) to keep students engaged with format-specific (less novel-feeling) practice.

### C.1 — New static data files

- `src/data/stems.js` — ~80 high-utility stems by function (opening / agreeing / contrasting / sequencing / concluding / requesting / refusing). Each entry: `{ id, m, e, function, example, level: 'core'|'extended' }`.
- `src/data/genres.js` — ~6 IGCSE writing genres with skeletons, length targets, required markers (notice, email, blog, story, report, postcard).
- `src/data/igcseBands.js` — band descriptor language for vocab range / accuracy / communication / fluency, scaled 1–6, in IGCSE 0546 phrasing.
- `src/data/grammarPrereqs.js` — DAG of grammar topic prerequisites (e.g., `peN- doer nouns` requires `meN-PTKS`).
- `src/data/dailyTasks.js` — pool of ~30 micro-tasks tagged by paper type; one served per day.
- `src/data/cultureWeekly.js` — ~24 short culture passages (52 weeks coverage rotates twice).

These files are pure content; no React. They can be authored progressively — start with 20 stems, 3 genres, etc., and expand.

### C.2 — Genre-scaffolded writing (Idea 5.1)

Add to `Writing.jsx`: a "Structured" tab next to existing "Free" mode.

UI: choose genre → app shows skeleton with labeled blocks (e.g. for an email: To · Subject · Greeting · Body · Closing · Signature). Each block is a separate textarea with its own min/max word counter. App checks structural completeness (does the email have a closing? does the notice have a date?) — pure regex, no LLM.

`getFeedback(text, genre)` in new `src/lib/genreCheck.js` returns `{ structurePass: bool, missingMarkers: [...], wordCountByBlock: {...} }`.

The existing free-mode analyzer keeps working unchanged.

### C.3 — Stems library (Idea 5.2)

Three integration points:

1. **Standalone stem-deck mode in `Study.jsx`** — stems studied as cards with FSRS state (separate `stems` array on `card.t = 'stems'`). Vocabulary-style review, but the "answer" is the function ("opening / contrasting / etc.") rather than translation, since these are formulaic chunks meant for productive use.
2. **Inline hint button in `Roleplay.jsx` and `Writing.jsx`** — small "💡 Stems" button reveals 4 contextually relevant stems based on current scenario tag or genre.
3. **Stem-of-the-day on Dashboard.jsx** — one stem per day shown with example, encouraging daily exposure.

### C.4 — Daily IGCSE micro-task (Idea 2.8)

New section on `Dashboard.jsx`: "Today's exam-style task" card. Picks one task from `dailyTasks.js` based on day-of-year hash (deterministic, so two devices show the same task on the same day for users with cloud sync).

Tasks rotate paper types: read+answer (Paper 1), short writing (Paper 2), 1-min spoken response (Paper 3), comprehension question (Paper 4 if applicable).

Click → opens an in-page mini-session. 5–8 minute commitment. Stores completion in `studyHistory` with `type: 'daily-task'`. Separate streak counter ("exam-format streak") so this is gamified independently of vocab streak.

### C.5 — Mastery-locked grammar topic sequence (Idea 5.8)

In `Grammar.jsx` topic picker, draw lock icons on topics whose prerequisites aren't at FSRS Review with stability ≥ 7 days.

Lock is **soft** (orange warning, not hard block): user can still attempt, but tooltip warns "Master meN-PTKS first — only 2/5 drills are at review state."

Implementation: `src/lib/grammarGate.js` exporting `isTopicReady(topic, grammarCardsState)` → bool. Reads `grammarPrereqs.js`.

### C.6 — Near-transfer drill (Idea 5.4)

After a user completes any imbuhan drill set with ≥ 80% accuracy, present a "Transfer test": a single drill on a *novel* item the user has never trained, but that follows the same rule.

UI: same drill component, with a banner: "🌟 Transfer challenge — you've never seen this word."

Tracking: results stored in `transferStats` (new store field), shown on Dashboard as "trained accuracy: 92% · transfer accuracy: 67%". The gap is the actual learning measure.

Items pulled from a "novel pool" added to `data/grammar.js` — words deliberately held out from regular drills.

### C.7 — Constrained-output writing (Ideas 2.2 + 5.5)

New mode in `Writing.jsx`: "Mini-prompt" (separate from Structured and Free).

UI: short constraint card — e.g. "Write 2 sentences about your weekend that use *sudah* AND a meN- prefix verb." Required tokens highlighted. Sentence count enforced. App checks token presence (regex). Pass = sentence written + tokens present + meets word count.

Lightweight feedback: "✅ Used *sudah* — strong / ⚠️ no meN- verb yet — try membaca, menulis, mengaji". Pure rule check, no LLM.

Mini-prompts pulled from a new `data/miniPrompts.js`. ~40 entries, tagged by required grammar feature.

### C.8 — Diagnostic mock (Idea 3.5)

New `src/pages/Diagnostic.jsx` route, also accessible from Dashboard exam-countdown card.

25-minute mixed task: 10 vocab cloze + 5 grammar drills + 1 short comprehension + 1 short writing prompt + 1 1-min spoken response. Auto-generated from existing data; no new content.

End: pseudo-band per skill against `igcseBands.js` descriptors. Stored in `diagnosticHistory`. Dashboard shows trend over time.

### C.9 — Examiner-mode feedback (Idea 5.7)

Optional toggle in `Writing.jsx` and `Roleplay.jsx`: "Get examiner feedback".

When on, after the user submits, `src/lib/examiner.js` calls the existing OpenRouter/Supabase fallback chain with a structured prompt:

```
You are an IGCSE 0546 Malay examiner. Score this response against
[band descriptors injected from igcseBands.js]. Reply in this JSON
shape: { vocab: 1-6, accuracy: 1-6, communication: 1-6, comments:
{ vocab: '...', accuracy: '...', communication: '...' }, nextStep:
'one specific improvement' }.
```

Response renders as a formal scorecard with band-descriptor language. Falls back to rule-based scoring when LLM unavailable. Caps at 5 examiner calls/day to control cost.

### C.10 — i+1 reading ladder + sentence mining (Ideas 2.6 + 2.7)

In `Comprehension.jsx`:

- Sort passages by per-user difficulty: % of words user has Review-state cards for. Display "ladder" — current level + locked higher levels.
- "Add to deck" affordance on every word in the passage. Tapping creates a vocab card with the passage sentence as `ex`, dictionary lookup for `m` and `e`. Card is born in context.

### C.11 — Cultural authenticity weekly (Idea 6.2)

Sunday-rotation banner on Dashboard pulls from `cultureWeekly.js`. 60-word passage about Malaysian culture, food, history. Click → reads in `Comprehension.jsx`. Vocabulary auto-suggested for deck addition.

### C.12 — Build sequence

1. Author content files (C.1) progressively. Don't try to fill all 80 stems before shipping; 20 is a viable v1.
2. Stems study mode (C.3.1) — minimal new code, leverages Study.jsx.
3. Daily micro-task (C.4) — high motivation per line of code.
4. Genre-scaffolded writing (C.2) — bigger UI, but contained to Writing.jsx.
5. Mastery-locked grammar topics (C.5) — small lib + Grammar.jsx UI.
6. Near-transfer (C.6) — needs novel-item pool authored.
7. Constrained-output mini-prompts (C.7) — content-heavy.
8. Stem hints in Roleplay/Writing (C.3.2) — finishing touch.
9. Diagnostic mock (C.8) — new route.
10. Examiner-mode feedback (C.9) — last (LLM cost).
11. i+1 ladder + sentence mining (C.10) — independent of the rest.
12. Culture weekly (C.11) — content.

### C.13 — Verification

- [ ] Genre check returns correct missingMarkers for each genre on hand-authored test cases
- [ ] Stems are persisted as proper FSRS cards; deck switching works
- [ ] Daily task is deterministic per date (test by changing system clock)
- [ ] Mastery lock displays icon but does not hard-block
- [ ] Transfer test fires once per drill set, not on every drill
- [ ] Diagnostic mock completable in under 25 minutes; results stored
- [ ] Examiner mode falls back gracefully when AI unavailable
- [ ] No regressions in existing Writing free mode or Comprehension navigation

---

## Cluster D — Pattern Visibility

**Goal:** Surface the data the app already collects in ways that *teach the learner about themselves* — making implicit patterns explicit.
**Component ideas:** 3.4 pattern surfacing · 3.8 forgetting curve · 5.3 topic clustering · 5.6 error heatmap.
**Why fifth:** all four ideas are visualizations on top of existing store data — they need enough longitudinal data to be worth showing, which means deferring until B/E/A have been collecting for some weeks.

### D.1 — Files

- New `src/pages/Insights.jsx` route — single page with all four visualizations as sections.
- New nav entry in More-drawer of `Layout.jsx`.
- Use `recharts` (already a likely dependency) or simple SVG. Avoid adding new chart libs.

### D.2 — Error pattern surfacing (Idea 3.4)

Already 80% built: `clusterMistakes()` exists in `src/lib/patterns.js`. Surface its output.

UI section: "Your top 3 grammar patterns this week" — bullets with description from `PATTERN_DESCRIPTIONS`, count, and a one-tap "Drill these" button that filters Grammar.jsx to that cluster's drillIds.

### D.3 — Common-error heatmap (Idea 5.6)

UI: matrix; rows = grammar pattern names from `patterns.js`, cols = drill items in that pattern. Cell color scaled by error rate. Tap cell → opens that single drill.

Data: aggregate over `mistakes` filtered by `type: 'grammar'` and `reviewed: false`, grouped by drillId.

### D.4 — Forgetting curve preview (Idea 3.8)

UI: per-deck mini line chart showing predicted retention % over the next 14 days under two scenarios:
- "If you review on time" — flat line ~90% based on FSRS stability average
- "If you skip" — exponential decay using stability decay constant

Pull from FSRS via `forgetting_curve(stability, t)` helper (add to `src/lib/fsrs.js`).

### D.5 — Topic-schema cluster map (Idea 5.3)

UI: simple radial layout — center = topic name (e.g., "Sekolah"), spokes = words user has Review-state cards for in that topic. Words in red = struggling (low stability). Words in gray = locked (would-be cards, not yet added). Each topic gets one radial.

Use existing `dictionary.js` `t` field for topic membership.

### D.6 — Build sequence

1. Insights.jsx scaffold + nav entry. Build.
2. Pattern surfacing section (D.2) — already-existing data. Smallest scope.
3. Error heatmap section (D.3) — slightly more involved aggregation.
4. Forgetting curve (D.4) — add helper in fsrs.js.
5. Topic radial (D.5) — most layout work; do last.

### D.7 — Verification

- [ ] Page renders with sensible empty states for users with little data
- [ ] No infinite re-render loops (heatmap aggregation done in `useMemo`)
- [ ] Color scales accessible in both themes
- [ ] Tap-through actions work (heatmap → drill, pattern → cluster drills)

---

## Cluster F — Speech & Fluency

**Goal:** Build out the Paper 3 oral skill explicitly. Speech is the highest-cost cluster (Web Speech API quirks, content authoring) so it ships last.
**Component ideas:** 2.1 4/3/2 fluency drill · 2.3 branching examiner · 2.4 shadowing · 2.5 teach-back · 1.6 mnemonic generation (deferred unless LLM budget allows).
**Why last:** speech infrastructure is the highest engineering risk, the existing Roleplay scaffolding can absorb most additions without disruption, and all earlier clusters strengthen the foundation for a richer oral-practice experience.

### F.1 — Shadowing drill (Idea 2.4)

New `src/components/ShadowingDrill.jsx` reusable in Roleplay and as a stand-alone "Shadow" mode in Study.jsx.

Flow:
1. Pick a sentence (from the current scenario, or from `data/sentencesForShadowing.js` content file).
2. App TTS plays at 0.75× speed → countdown → user speaks → STT captures.
3. Diff highlight — green for matched syllables, red for missed.
4. Repeat at 1.0× then 1.25×. Best take per round saved.

Web Speech API: locale `ms-MY`. Fallback message for browsers without support; do not crash.

### F.2 — 4/3/2 fluency drill (Idea 2.1)

New page `src/pages/Fluency.jsx`. Pick topic from a `fluencyTopics.js` content file. App times user speaking on the topic for 4 / 3 / 2 minutes consecutively.

Per round: STT transcript, word count, words-per-minute. Visualization: 3 bars showing WPM trend. No content grading.

### F.3 — Branching examiner reactions (Idea 2.3)

In `Roleplay.jsx`: add "challenge branches" to existing scenarios. Each scenario gains 2-3 alternative examiner follow-ups based on rule triggers:
- Response too short (< 10 words) → "Boleh huraikan lebih lanjut?"
- Used word incorrectly (regex against known confusions) → "Maksud awak X atau Y?"
- Pronunciation low confidence → "Saya tidak begitu jelas — boleh ulang?"

Stored in `data/scenarios.js` as `branches: { tooShort: '...', wordConfusion: '...', unclearSpeech: '...' }`.

Plus: optional LLM mode (toggle) for richer branching using existing OpenRouter free-tier chain.

### F.4 — Teach-back to Cikgu (Idea 2.5)

In `CikguBot.jsx`, new mode: "Teach Cikgu". Cikgu picks a grammar topic the user has high accuracy on (per Cluster D data) and asks the user to explain it. Cikgu then plays "confused student" with rule-based clarifying questions.

Logged to `studyHistory`. No grading. The protégé effect benefit comes from the act of explaining.

### F.5 — Mnemonic generator (Idea 1.6) — deferred-but-specced

Optional integration: when a card has lapsed 3+ times, offer "Get a memory hook from Cikgu." Triggers OpenRouter call with structured prompt that returns a phonetic-keyword + image mnemonic. Stored as card metadata. Capped at 10 mnemonic generations/day.

### F.6 — Build sequence

1. Shadowing drill component (F.1) — reusable foundation.
2. Branching examiner rule-based version (F.3 part 1) — content edits to scenarios.
3. Fluency.jsx page (F.2) — new route.
4. Teach-back mode in Cikgu (F.4) — minor addition to existing surface.
5. (Optional) LLM-richer branching (F.3 part 2).
6. (Deferred) Mnemonic generator (F.5).

### F.7 — Verification

- [ ] All speech features show graceful fallback if Web Speech API unsupported
- [ ] STT locale set to `ms-MY` on every speech-recognition init
- [ ] Diff display works for short and long sentences
- [ ] Fluency drill timing accurate to ±1 second
- [ ] No mic permission blocks force-stop the app

---

## Execution Roadmap

**Recommended ship cadence:** one cluster per week. Each cluster is independently shippable.

| Week | Cluster | Why |
|---|---|---|
| 1 | B (metacognitive) | Highest ROI per LOC; foundation for adaptive logic in all later clusters |
| 2 | E (motivation) | Protects return rate so later clusters' impact compounds |
| 3 | A (study loop) | Layered on top of B's calibration data |
| 4 | C (exam surface) | Needs B+E foundation, justifies user effort with exam relevance |
| 5 | D (pattern visibility) | Best with several weeks of data already collected |
| 6 | F (speech & fluency) | Highest cost; ship last |

**Cumulative store version progression:**
- Cluster B: STORE_VERSION 5 → 6
- Cluster E: 6 → 7
- Cluster A: 7 → 8
- Cluster C: 8 → 9
- Cluster D: 9 (no schema changes)
- Cluster F: 9 → 10

**Each cluster's sign-off gate:**
1. `npm run build` zero errors
2. All 12+ routes still render
3. localStorage persistence survives a full reload
4. No infinite re-render loops in DevTools
5. Light and dark themes both work
6. New persisted fields visible in store via DevTools

**For the executing agent:**
- Read `src/store/useStore.js` end-to-end before any STORE_VERSION bump (the migration must preserve all existing data).
- Cards in the store have FSRS fields plus the dictionary `m, e, ex, t` fields. Don't conflate these schemas.
- Never call store getter functions inside a Zustand selector (causes infinite re-render — see CLAUDE.md).
- Always use `var(--color-*)` CSS variables for color, never hex.
- Verify `npm run build` is zero-error after each step in a cluster, not just at the end.
- React 19 strict mode flags impure components — wrap any `Date.now()` calls in arrow functions.

---

## Pass 2 — Status: COMPLETE

**Saved at:** `/Users/kheshav/.claude/plans/learning-outcomes-pass2-framing.md`

**Total scope:** 6 clusters covering 47 of 48 ideas (1.6 deferred). 6-week shipping cadence. Pass 1 + Pass 2 together provide a complete spec a builder agent can execute one cluster at a time without follow-up questions.

**Recommended next step (Pass 3):** rather than executing all 6 clusters in this session, ship Cluster B end-to-end first, observe behavior, then revisit the plan for any adjustments learned from real use.





