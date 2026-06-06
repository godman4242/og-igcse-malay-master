# Build plan — "For You" personalized home + AI custom decks (2026-06-06)

Spec: `docs/superpowers/specs/2026-06-06-personalized-for-you-design.md` (read §2
reuse-map + §4 locked decisions first). Two phases, **one feature per session**.
Phase 1 (no AI) ships value to everyone; Phase 2 (AI, key-gated) layers on top.

## Pre-flight (every session)
1. Baseline: `git status` clean · `npm run test:run` (note count) · lint 0 · prod READY.
2. Re-read the spec §2 reuse map — DON'T rebuild what exists (`learnerProfile.js`,
   `SmartSession`/`interleave.js`, `dailyPlan.js`, `fsrs.isDueForRecall`, the AI
   tier-chain). This feature is mostly *wiring + new UI*, not new engines.
3. Confirm the §8 open decisions with Kheshav (one AskUserQuestion) — esp. §8.1
   (does For You replace `/` as the landing?), which changes nav + the first-run tour.

---

## Verified reuse-map + adversarial findings (2026-06-06 — READ BEFORE BUILDING)
A pre-build verification pass against the live code. These are confirmed signatures
+ the gotchas the spec glossed:
- **`STORE_VERSION` is currently `22`** (CLAUDE.md was stale, now fixed) → the goal-
  preset migration bumps to **23**.
- **`src/lib/fsrs.js`** exports `isDueForRecall(card)`, `isDue(card)`, `getDueCards`,
  `createNewCardState`, `reviewCard`, `Rating`, `State`. NOTE: "Still remember these?"
  is the INVERSE of `isDueForRecall` (want settled/strong + NOT due) → it's a NEW
  selector (`stillRememberCards`), not a reuse of `isDueForRecall`.
- **`buildDailyPlan(inputs, now)`** takes a rich `inputs` object: `{ cards, dueCount,
  fixUpQueue, studyPlan, examDue, dailyGoalLevel, isComeback }`. "Keep going" must
  assemble these (the Dashboard already does — mirror its call site).
- **`interleave.js`** exports `buildMixedSession({ cards, grammarCards, settings })`
  + `getMixedSessionSummary(results)`. It DOES accept a `cards` array → a weak-topic
  bias is feasible by passing a filtered/weighted set.
- **⚠️ `SmartSession` gotcha (the spec under-stated this):** the component is
  `SmartSession({ includeSpeaking, targetMinutes, onExit })` — **no card-filter prop.**
  Launching it as-is gives a GENERIC interleaved session, not a weak-topic "picked for
  you" one. To personalize it: add a `focusTopics`/`cardFilter` prop to `SmartSession`
  and thread it into its `buildMixedSession({ cards: filtered })` call. DECISION for
  Phase 1: ship "Picked for you" launching SmartSession **surfaced-but-generic** first
  (cheap, still valuable — it was orphaned), then add the focus prop as a fast-follow.
- **⚠️ Landing-route swap = highest blast radius (adversarial finding):** do NOT move
  Dashboard off `/` in Phase 1. For You is ADDITIVE (new tab + route); Dashboard stays
  at `/`. A swap would touch `FirstRunCard`, `first-run-tour.spec.js`, `daily-plan.spec.js`,
  Layout `NAV` (`Home`), and the `index.html` canonical/og:url. Treat the landing-swap
  as a separate deliberate change AFTER For You proves out (spec §8.1, revised).

## PHASE 1 — Smart shelves + goal link (NO AI, everyone)

### Step 1 — pure `forYouShelves.js` (TDD)
- New `src/lib/forYouShelves.js`: `buildForYouShelves(snapshot) → [{ id, title,
  items, cta, hidden }]`. `snapshot` = aggregated store fields (cards, mistakes,
  studyHistory, confidenceLog, identity, streak) — pass plain data, no store access
  inside (mirrors `practiceSurfaces.js`/`learnerProfile.js` purity).
  - Compose from existing derivations: `buildLearnerProfile()` for focusTopics;
    a new pure `stillRememberCards(cards, now)` selector (stability ≥ 21d, last
    review ≥ 14d, not due); `buildDailyPlan()` for "Keep going"; 'Saved' deck for
    recents; `goalToFocus()` (Step 3) for "Toward your goal".
  - Each shelf sets `hidden:true` when it has no items (caller filters).
- Tests `src/lib/__tests__/forYouShelves.test.js`: each shelf populates from the
  right signal; empty signal → `hidden`; deterministic ordering; new-learner
  snapshot → all shelves hidden. RED→GREEN.

### Step 2 — `stillRememberCards` selector (TDD)
- Add to `src/lib/fsrs.js` (next to `isDueForRecall`): pure boundary logic.
- Tests: at/under/over each threshold (stability, recency, due-ness). RED→GREEN.

### Step 3 — goal presets + `goalToFocus` (TDD + store + Settings)
- `src/lib/goals.js`: `GOAL_PRESETS` (id, label, focus tags) + pure
  `goalToFocus(goalPreset, sentence) → { emphasise: string[] }`. Tests per preset.
- Store: add `identity.goalPreset` (default null); **bump `STORE_VERSION`** + a
  migration case preserving all existing data. Action `setGoalPreset`.
- Settings UI: a preset chooser above the existing one-sentence field (don't remove
  the sentence). Keep `var(--color-*)`, bilingual-safe.

### Step 4 — `ForYou.jsx` + `/for-you` route + nav (verify via e2e)
- New `src/pages/ForYou.jsx`: snapshot the store ONCE (per CLAUDE.md selector
  rules — `useStore.getState()` for the heavy read, stable selectors for what must
  be reactive), `buildForYouShelves`, render horizontal-scroll rails; each item
  navigates / launches a session. Self-hiding shelves; first-run "get started" state.
- `App.jsx`: lazy route `/for-you`. **Landing decision (§8.1, REVISED): additive
  only** — add For You as a new primary nav tab; **keep Dashboard at `/`**. Do NOT
  move Dashboard or touch the first-run tour in Phase 1 (that's a separate later
  change). Re-confirm with Kheshav at kickoff.
- **Surface the orphaned `SmartSession`:** the "Picked for you" CTA launches it
  (currently only reachable at the unlinked `/smart-study`). Phase 1 = surfaced-but-
  generic; the weak-topic `focusTopics` prop (threaded into `buildMixedSession`) is a
  fast-follow — see the verified reuse-map gotcha above.

### Step 5 — Phase-1 gates
- `tests/e2e/for-you.spec.js`: seed signals → shelves render + launch; goal preset
  changes emphasis; empty learner → get-started state. Light + dark. `bindStore`.
- build clean · lint 0 · test:run all · e2e green · eyeball both themes.
- Commit atomic + refresh `RESUME_HERE.md` same commit → deploy → Vercel READY.

---

## PHASE 2 — AI custom decks + dictionary grounding (key-gated)

### Step 1 — verified dictionary asset + `verifyPair` (TDD)
- Pick a source (spec §7 — default kaikki.org MS↔EN, **resolve CC-BY-SA first**).
- A build/script step distils it to a compact local lookup (committed asset or
  generated). `src/lib/dictionaryGrounding.js` `verifyPair(m, e) → { verified,
  canonicalEn?, suggestion? }`. Tests: verified / mismatch / unknown.

### Step 2 — AI deck generator behind the key gate (TDD-able pure parts)
- Pure `buildDeckPrompt(goal, focusTopics, interests)` + `parseDeckCandidates(aiText)`
  → `{m,e,ex}[]`. Tests with canned AI text (mock).
- Wire through the existing 3-tier chain (`ai.js`/`openrouter.js`; `VITE_AI_MOCK`).
- Grounding filter: candidates → `verifyPair` → accept verified, surface mismatches
  learner-in-the-loop (never silent-ship). Accepted → named deck via `addCards`.

### Step 3 — UI + AI roleplay seed + gates
- "Make me a deck" CTA on For You, **shown only when an AI key is configured**;
  otherwise a soft "add a key to unlock" hint.
- AI roleplay: seed a scenario from goal+interests, run the existing Roleplay AI evaluator.
- E2E with mock AI: CTA → grounded cards land in a deck. Gates as Phase 1.

---

## Parked (separate future specs — do NOT fold into the above)
- **Auto multi-key model router** ("Perplexity auto" mode): multi-key vault +
  task→model routing. Standalone infra. Reuse the existing fallback chain until then.
- **Base-dictionary expansion**: ship verified MS↔EN pairs into `src/data/dictionary.js`
  as its own data PR (helps tap-translate app-wide, independent of AI).

## Gotchas
- Don't rebuild existing engines (§2). The win is wiring + UI.
- Don't rewrite Dashboard (857 lines). For You is additive; only the landing-route
  swap touches nav.
- Pure builders over ONE snapshot — no per-shelf store subscriptions (perf rule).
- Bilingual-safe; `var(--color-*)` only; bump `STORE_VERSION` with a migration.

## Paste-ready kickoff (PHASE 1)
> Fresh Claude Code session on IGCSE Malay Master ("ooga da boogadamalay"),
> React/Vite SPA, live at https://upg-igcse-malay-master.vercel.app.
> READ FIRST: auto-memory MEMORY.md (esp. [[feedback_layman_explanations]],
> [[feedback_standing_commit_permission]], [[feedback_time_estimates_add]],
> [[project_idea_personalized_ai_deck]]), `RESUME_HERE.md` (top), then spec
> `docs/superpowers/specs/2026-06-06-personalized-for-you-design.md` (§2 reuse-map +
> §4 locked decisions) + this plan. TASK: PHASE 1 only — the "For You" personalized
> home (smart shelves, NO AI): a pure `forYouShelves` builder + a new `/for-you`
> landing tab that reuses EXISTING signals (`learnerProfile.focusTopics`, FSRS
> stability, `buildDailyPlan`, the 'Saved' deck) and SURFACES the orphaned
> `SmartSession`. Plus goal presets in Settings (+`goalToFocus`). Follow the TDD
> order; do NOT build Phase-2 AI this session (one feature per session).
> HOW I WORK: plain layman terms, assume I forget context, evaluate my choices &
> recommend better, short time estimate before non-trivial steps. Standing
> permission to stage/commit/sync atomic verified units; main auto-deploys, confirm
> READY after; refresh RESUME_HERE same commit.
> START: verify baseline → confirm spec §8 open decisions with me (esp. §8.1: does
> For You replace `/` as the landing?) → Step 1 (TDD `forYouShelves`). Quality over speed.

## Plain-language version (for Kheshav)
1. **Phase 1 (next session):** a new "For You" home screen with shelves — "Picked
   for you", "Still remember these?", "From your saved words", "Keep going" — built
   from things the app already knows about you. No AI, works for everyone, instant.
   Plus goal buttons in Settings so the app knows what you're aiming for.
2. **Phase 2 (the session after):** if you've added an AI key, a "Make me a deck"
   button that writes a custom deck from your goal + weak words — and every word is
   checked against a real Malay-English dictionary first, so it doesn't make things up.
3. **Later, separate:** the auto-pick-the-best-AI-model idea, and growing the
   built-in dictionary — both their own jobs so they don't bloat this one.
