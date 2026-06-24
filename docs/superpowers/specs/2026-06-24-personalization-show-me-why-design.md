# Personalization "B: Show me why" — design spec (2026-06-24)

First aspect deep-dive under the planning framework
([`../../process/planning-and-thinking-framework.md`](../../process/planning-and-thinking-framework.md)),
Execute gear. Research + decision: [`../../research/2026-06-24-personalization-research.md`](../../research/2026-06-24-personalization-research.md).

**Spec questions answered by research, not by asking** (Kheshav's standing instruction, 2026-06-24:
"a lot of these can be answered by research on what's more effective — do the research and follow the
most effective choice"). Each decision below carries its evidence + a one-line veto note.

---

## 1. Compass anchor (why this is worth building)

The app already **adapts** (FSRS scheduling, For-You weak-topic picks, fix-up queue, daily plan) but the
learner can neither **feel** nor **steer** it. Closing that gap is the highest outcome-per-effort
personalization move because the signal *already exists and is being thrown away*:

- `dailyPlan.js` computes a human `reason` string for **every** task (e.g. *"Spaced review is
  time-sensitive — clearing due cards locks in what you already learned."*) — then `buildKeepGoing` in
  `forYouShelves.js` maps it to `{id,label,sublabel,route}` and **drops `reason`**.
- "Picked for you" chips come from real weighted mistakes (`learnerProfile.focusTopics`, severity ×
  recency) but render as a bare category label with no *"because…"*.

So Direction B is mostly **stop discarding signal we already compute**, plus one genuinely new mechanism
(a constrained mix-steer). Evidence that this moves outcomes — not just engagement:

- Adaptive/personalized learning ES ≈ **0.40**; adaptive-vs-non-adaptive **g ≈ 0.70** — *but only when
  the learner perceives the adaptation* (Wang 2026 meta-analysis). Surfacing the "why" is what converts
  silent adaptation into *perceived* adaptation.
- Explaining *why* a recommendation was made **increases acceptance** of it; showing the system's
  *certainty* did **not** improve trust/acceptance (Cramer et al., content-based art recommender). →
  Show the reason, never a confidence number.
- Autonomy (genuine but bounded choice) → intrinsic motivation → **persistence**, the real bottleneck of
  self-study (Self-Determination Theory). The mix-steer is the autonomy lever.

**Guardrail (Compass says NO):** every element must plausibly raise *exam outcome per minute*, not
"time in app". No streak-bait, no cosmetic theming. The steer can bias the *discretionary* mix but can
**never** weaken the spaced-repetition spine.

---

## 2. Scope — three additive sub-features, all on `/for-you`

All of B lands on the **For-You page** (`src/pages/ForYou.jsx`) — already the personalization home,
already `studyLang`-scoped, already snapshots the store once per visit. This keeps the blast radius
small and testable.

1. **"Why" surfacing** — render the already-computed reason on each For-You item (visibility per Q1).
2. **Focus mix-steer** — a small set of named presets that reweight *selection only* (Q2).
3. **"Where you stand" competence panel** — one simple skill-meter view composed from existing
   aggregates (Q3).

**Out of scope (YAGNI):** per-word mastery bars; free-form sliders; a new per-topic mastery engine;
AI-generated explanations (the reasons are deterministic strings we already own); editing FSRS; any
Dashboard rework (Dashboard stays the `/` home — B is additive on `/for-you`). "A: make my study space"
and "C: my goal, my path" remain later bets.

---

## 3. Research-grounded decisions

### Q1 — Where the "why" lives → **Hybrid by surface; reason text only, no certainty**

- **Inline one-line reason** on the load-bearing hero items: the "Picked for you" hero and each
  "Keep going" task card. These carry the *selection* reasons that make adaptation perceivable.
- **Tap-gated ⓘ** ("why these?") on the dense word-rails ("Still remember", "Saved") — those already
  have a self-explanatory subtitle; a per-card reason would clutter.
- **Never** render a confidence/certainty score.

*Evidence:* transparency ↑acceptance but certainty doesn't (Cramer et al.); OLM research — *"simple
inspectable models are more preferred than advanced"* and visualization drives the metacognition +
motivation benefit (OLM SRL systematic review); CLT / practitioner UX — *too much personalization
detail risks confusion, design digestible formats*.
*Veto note:* if usability shows the inline reason crowds a hero on a 390 px viewport, fall back to an
inline reason on "Picked for you" + the single top "Keep going" task only, ⓘ-gated elsewhere.

### Q2 — Mix-steer shape → **Presets (constrained choice), not sliders; selection-layer only**

A small, named preset set (recognition-cost, not recall-cost) that biases *which* discretionary skill
the daily plan surfaces. **v1 set is bounded by what the selection layer can actually steer today:**
`dailyPlan.pickSkillFocus` makes exactly ONE genuinely-flexible choice — which of
**speaking / writing / grammar** fills the day's single skill-focus slot — so those are the steerable
emphases. (The spine — due review, fix-ups — is non-negotiable and not steerable; new-vocab/exam are
phase-gated, not free.)

| Preset (v1) | Effect (selection reweight only) |
|---|---|
| **Balanced** (default) | No reweight — byte-identical to today's behavior. Identity-safe default. |
| **More speaking** | +bounded `need` bonus so speaking wins the daily skill-focus slot more often; smart session defaults speaking-on. |
| **More writing** | +bounded `need` bonus → writing wins the skill-focus slot more often. |
| **More grammar** | +bounded `need` bonus → grammar wins the skill-focus slot more often. |

**Deferred (NOT v1):** "More listening" and "Exam crunch" — `dailyPlan` has no listening/exam candidate
to surface, so steering them would promise a control with no effect. Adding listening/exam as daily-plan
candidates is its own bet (see §8). v1 ships only steers that visibly change behavior.

**How it touches FSRS: it does not.** The preset adds a **bounded `need` bonus** inside
`dailyPlan.pickSkillFocus` (which discretionary skill is chosen) and flips the smart session's
`includeSpeaking` default — nothing else. It never reads or writes `due / stability / difficulty /
state / reps / lapses`, and **never raises a discretionary task above the spine**: FSRS-due review
(priority 100, `always`) and top fix-ups (80) keep their existing rank and the "due cards stay the
session majority" guard (`interleavedQueue.js:78`). The bonus is *bounded* so a real, urgent need can
still outrank the preferred skill — constrained autonomy, not a hard override. Focal-card reweighting
inside `selectFocalCards` is **deferred** (it risks the spine-majority guard; v1 leaves it untouched).
This is the SDT autonomy benefit without expertise-reversal harm.

*Evidence:* novices / low-prior-knowledge learners are **overwhelmed by fine-grained control** and
benefit from **constrained options**; full learner control helps high-knowledge learners but harms
novices (expertise-reversal). Our audience is explicitly the beginner IGCSE learner. SDT: bounded choice
still delivers the autonomy → persistence path.
*Veto note:* if presets feel too coarse in use, add a single 3-way intensity (the existing
`dailyGoalLevel` casual/standard/intensive) rather than per-skill sliders — never sliders.

### Q3 — Competence map → **Compose existing aggregates into ONE simple skill-meter panel**

A single scannable **"Where you stand"** panel on `/for-you`, built from signals we already compute — no
new tracking engine:

- **Headline:** overall exam readiness % from `getExamReadiness()` (already smoothed).
- **Mastery number:** `countMastered(langCards)` → *"NN words mastered"* (the Dashboard tile's source —
  numbers stay consistent).
- **Skill balance bars:** `skillBalance()` 7-day per-skill activity (reading / listening / writing /
  speaking / vocab / grammar / exam) — already rendered by Dashboard's PaperBalance; reuse the pure
  aggregator. Color-code; highlight **neglected** skills (the comparison/color levers OLM research flags
  as the motivational drivers).
- **Weak spots:** `learnerProfile.focusTopics` rendered as the same chips as "Picked for you" (one
  visual language across the page).

*Evidence:* OLM research — *"simple inspectable OLMs are more preferred than advanced ones"*; the
skill-meter is the canonical, well-liked OLM form; comparison + color-coding are the features most
linked to engagement/motivation and to self-regulation behaviors (goal-setting, self-assessment,
help-seeking).
*Veto note:* resist per-word/per-topic granular mastery bars — that's the *advanced* OLM learners prefer
less, and a large build for marginal value. One panel, four signals, done.

### Q4 — Bilingual + empty-state (mechanics; decide-and-flag)

- **Bilingual:** the "why" strings and the competence panel derive from signals already scoped by
  `studyLang` upstream (`cardsForLang`, `scopeMistakes`, etc. in ForYou.jsx) — so they are
  automatically per-language with no extra work. The **preset is stored per language**
  (`studyMix: { ms, en }`, default `'balanced'` each) to mirror the v34 "decks never mix" invariant —
  switching `studyLang` swaps the active preset. *Veto note:* if the plan judges per-language an
  over-fit, a single global preset is the fallback — but per-language is the consistent choice.
- **Empty-state:** an empty deck shows **none** of B. `buildDailyPlan` already returns `tasks: []`,
  `buildPicked` is `hidden` when `cards.length === 0`, and ForYou renders `<GetStarted>` when all
  shelves hide. The mix-steer control and competence panel **render only when there is signal** (deck
  non-empty); on an empty deck `<GetStarted>` owns the whole screen. No "why" on a fresh deck.

### Q5 — Measurable, outcome-linked Done

Binary and test-pinned (see §6).

---

## 4. Architecture — units, interfaces, dependencies

Each unit is small, pure where possible, and independently testable (brainstorming "isolation &
clarity").

### 4.1 `src/lib/whyReason.js` (new, pure) + `src/lib/topicLabels.js` (extracted)
- **Does:** the single source of truth that maps a For-You item → its one-line reason string, for both
  the inline (hero) and ⓘ-gated (rail) surfaces. For tasks it passes through the `dailyPlan` task
  `reason` (stop dropping it); for "Picked for you" it builds *"Built around your weak spots this week:
  X, Y"* from `focusTopics`; for rails it returns the rail-level *"why these?"* blurb.
- **Interface:** `reasonForTask(task) → string`, `reasonForPicked(focusTopics) → string`,
  `reasonForRail(shelfId) → string`. Pure, deterministic.
- **Copy language:** the reason *prose* is English, matching the existing For-You subtitles/labels (the
  page's copy is already English for both syllabuses). The *content* (which weak spots) is already
  `studyLang`-scoped upstream in `ForYou.jsx`, and the category labels come from the shared map — so no
  per-language prose branching is needed.
- **Depends on:** `topicLabels.js` — the `CATEGORY_LABELS` / `categoryLabel()` map **extracted** from
  `forYouShelves.js` into a tiny shared module so `whyReason` and `forYouShelves` share one map (DRY, no
  import cycle).
- **Why a unit:** keeps reason copy in ONE place (parity with the AI-prompt parity rule pattern), so the
  inline and gated surfaces can never drift.

### 4.2 `src/lib/studyMix.js` (new, pure)
- **Does:** defines the preset list and the **policy** for how much a preset biases a skill. Pure,
  data-only — it returns a *number* (a bounded `need` bonus), it does not touch candidates or cards.
- **Interface:** `STUDY_MIX_PRESETS` (array of `{id,label,emphasis}` where `emphasis ∈ {null,
  'speaking','writing','grammar'}`), `MIX_NEED_BONUS` (the constant bonus, e.g. `2`),
  `mixNeedBonus(presetId, skillKind) → number` (returns `MIX_NEED_BONUS` when `skillKind` is the
  preset's emphasis, else `0`; returns `0` for `'balanced'`/unknown — **default is identity**),
  `isValidPreset(id) → boolean`.
- **Depends on:** nothing. Consumed by `dailyPlan.pickSkillFocus` (adds the bonus to the matching
  skill's `need`) and by `SmartStudy` (reads emphasis to default `includeSpeaking`). Default
  `'balanced'` → **byte-identical to today**.
- **Why a unit:** the steer policy (which preset → which skill → how much) lives in exactly one place
  and is unit-pinned; consumers stay one-line.

### 4.3 `src/lib/competenceSnapshot.js` (new, pure)
- **Does:** composes the "Where you stand" view-model from existing aggregates — `getExamReadiness()`
  output, `countMastered(langCards)`, `skillBalance(...)`, `learnerProfile.focusTopics`. Returns a
  flat, render-ready object (headline %, mastered count, skill bars with a `neglected` flag, weak-spot
  chips). No new persisted state.
- **Interface:** `buildCompetenceSnapshot(snapshot, now) → { readinessPct, mastered, bars[], weakSpots[] }`.
  Returns `null` (panel hidden) when the deck is empty.
- **Depends on:** the four existing pure aggregators (composition only).

### 4.4 UI glue (`ForYou.jsx` + small components)
- `WhyLine` — inline one-liner under hero items (reads `whyReason`).
- `WhyChip` — tap-gated ⓘ on rails (reveal-gated, mirrors the page's existing reveal pattern; pure UI
  state, never touches FSRS — same discipline as the "Still remember" probe).
- `MixSteer` — the preset chooser (named cards, recognition-cost). Writes `studyMix[studyLang]` to the
  store. Hidden on empty deck.
- `CompetencePanel` — renders `competenceSnapshot`. Hidden on empty deck.
- `forYouShelves.buildKeepGoing` — **stop dropping `reason`** (one-line change: include `reason` in the
  mapped task).

### 4.5 Store (`useStore.js`)
- New field `studyMix: { ms: 'balanced', en: 'balanced' }` + `setStudyMix(lang, presetId)` action.
- **STORE_VERSION bump 34 → 35** with a migration that defaults `studyMix` for existing users —
  preserves all data, adds the field. (Per CLAUDE.md migration discipline.)
- The preset id is read in ForYou's `dailyPlanInputs` (→ `pickSkillFocus`) and in `SmartStudy` (→
  `includeSpeaking` default). `selectFocalCards` is **not** changed in v1.

### 4.6 Data flow
```
studyLang ──► studyMix[studyLang] (preset id)
                     │
   ┌─────────────────┼─────────────────────────────┐
   ▼                 ▼                              ▼
buildDailyPlan   SmartStudy pre-screen           (display only)
 pickSkillFocus    includeSpeaking default          │
 need += mixNeedBonus(preset, kind)                  │
   │                 │                               │
   ▼                 ▼                               ▼
"Keep going" +    Smart Session                   whyReason ─► WhyLine / WhyChip
 reasons surfaced   (spine floor preserved;        competenceSnapshot ─► CompetencePanel
 (skill-focus        focal tiering unchanged)
  shifted)
```
FSRS fields are read-only inputs to selection and are **never written** anywhere in this flow.

---

## 5. The load-bearing invariant — FSRS isolation

> **Steer SELECTION, never SCHEDULING.** No code path introduced by B may write `due`, `stability`,
> `difficulty`, `state`, `reps`, or `lapses`. The mix-steer reweights *discretionary candidate ordering*
> only; due spaced-review and top fix-ups keep their priority floor and their session-majority guard.

This is pinned by a dedicated test (§6.3) that diffs every card's FSRS fields across every preset and
asserts zero drift. If that test is impossible to satisfy for a proposed mechanism, the mechanism is
wrong — replan.

---

## 6. Measurable Done (binary, test-pinned)

1. **Every** "Picked for you" hero and **every** "Keep going" task renders a non-empty, human-readable
   reason from the real derivation (not a placeholder). — *unit + render test asserts non-empty reason
   per item; e2e snapshot on a seeded deck.*
2. The learner can pick a focus preset and the **next daily plan's skill-focus shifts in the asserted
   direction** (e.g. "More speaking" makes the speaking focus win the slot when it otherwise wouldn't,
   without raising it above the spine). — *unit test on `mixNeedBonus` + `buildDailyPlan` skill-focus
   selection.*
3. **Zero FSRS due-date / field drift** across all presets. — *property test: for a fixed deck, every
   preset yields byte-identical FSRS fields on every card (§5).*
4. The "Where you stand" panel renders from existing aggregates on a populated deck and is **absent** on
   an empty deck. — *unit test on `buildCompetenceSnapshot` for populated + empty snapshots.*
5. **Empty-state safe:** empty deck → `<GetStarted>` only; no why-strings, no mix-steer control, no
   competence panel. — *render test on the empty snapshot.*
6. **Bilingual:** switching `studyLang` re-scopes the why-strings, the active preset, and the panel to
   that language. — *extends the existing lang-scope tests.*
7. Gate stays green (build + ~1030 unit tests + lint); per-route ForYou chunk stays within budget;
   README + the driver.js guide (`tourSteps.js`) updated for the new For-You controls (per standing
   rule).

---

## 7. Test plan (TDD — red first)

- `whyReason.test.js` — each item type → expected reason shape; bilingual; empty inputs don't throw.
- `studyMix.test.js` — `applyMixSteer`: default = identity (byte-identical); each preset shifts the
  tagged candidates in the right direction; spine candidates pass through untouched; never mutates input.
- `studyMix.fsrs-safety.test.js` — the §5 zero-drift property test (the load-bearing one).
- `competenceSnapshot.test.js` — composition correctness; `null` on empty deck; neglected-skill flag.
- `forYouShelves.test.js` — extend: `buildKeepGoing` now carries `reason`.
- ForYou render/e2e — seeded deck shows reasons + steer + panel; empty deck shows only GetStarted;
  preset round-trips through the store and survives reload (STORE_VERSION migration).

---

## 8. Open risks / watch-items

- **"More listening" / "Exam crunch" deferred from v1** — `dailyPlan` has no listening or exam candidate
  and listening lives on `/listening` (not inside `buildSession`), so a "More listening" steer would be
  a control with no visible effect. v1 ships only the three steerable skill-focus emphases
  (speaking/writing/grammar). Adding listening + exam as first-class daily-plan candidates (so they
  *can* be steered) is a clean follow-up bet — log it to GOAL.md when this lands.
- **Preset vs `dailyGoalLevel` overlap** — intensity (how much) already exists; the preset is *what
  mix*. Keep them orthogonal; don't let the preset secretly change volume.
- **ForYou chunk size** — adding three components + libs; keep the new libs pure/light and lazy-friendly
  so the per-route budget holds (verify in §6.7).

---

## 9. Decision log (decide-and-flag)

- **All of B on `/for-you`, additive** — smallest blast radius, page is already lang-scoped &
  snapshot-per-visit. *Veto:* could also surface the competence panel on Dashboard later; not now.
- **Reasons from a shared `whyReason.js`, not inline strings** — one source so inline + gated can't
  drift. *Veto:* trivial enough to inline, but parity history says centralize.
- **Per-language preset** — matches v34; *veto:* global if the plan finds it over-fit.
- **Presets, never sliders; reason text, never certainty** — both are research-forced, not preference.
- **v1 steers only what `dailyPlan` can already surface** (speaking/writing/grammar skill-focus) —
  honest scope: no preset that has no visible effect. Listening/exam steering waits on adding those as
  daily-plan candidates. *Veto:* if you want listening steerable now, that's a bigger bet (new candidate
  + UI), spec it separately.
- **No AI** — reasons are deterministic strings we already compute; adding an LLM here would be cost +
  latency + a silent-failure surface for zero benefit.
