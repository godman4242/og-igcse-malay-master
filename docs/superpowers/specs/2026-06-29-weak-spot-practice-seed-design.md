# Weak-spot practice seed — design (2026-06-29)

**Status: design-approved 2026-06-29 (attended). Bounded single increment, TDD, one commit.**

## Why

"Picked for you" Phase 2 (AI deck + roleplay generators) shipped 2026-06-13/14 — the deck
panel (`MakeDeckPanel.jsx`) already turns a **typed goal** into a grounded vocab deck or a
roleplay scenario, both routed through the frozen BYOK `instruct.js` seam.

But the app already computes the learner's real weak spots — `buildLearnerProfile().focusTopics`
returns the **top-3 weak mistake-categories** over the last 14 days (weighted by severity ×
recency, language-aware) — and **neither generator uses that signal.** The deck path feeds
*goal-surface tokens* (`grammar`/`exam`, from `goalToFocus`) into its "weak areas" prompt slot;
the scenario path takes no weak-spot signal at all. So the learner must *type* what to practise,
when the app already knows. This increment wires the existing signal into the practice generators
with a one-tap entry — the personalization the Phase-2 kickoff *imagined* ("seeded from MY weak
spots") but that the shipped code didn't deliver.

## Live-truth audit (verified by read, 2026-06-29 — do NOT rebuild)

- `src/lib/learnerProfile.js` — `buildLearnerProfile(store, { lang })` → `{ scaffoldLevel,
  focusTopics, recentStrengths, signals }`. `focusTopics` (the only field we consume) is built
  ONLY from `store.mistakes`: distinct category slugs, max 3, e.g. `['imbuhan:meN-', 'tense',
  'spelling']`. Category set (from CLAUDE.md / store v11): `vocab | imbuhan | tense | spelling |
  cohesion | register | pronunciation | comprehension | fluency | other`, plus the refined
  `imbuhan:meN-`. Empty when no recent mistakes.
- `src/lib/deckGenerator.js` — `buildDeckPrompt(goal, focusTopics, interests, lang)` ALREADY
  emits `Bias the deck toward these weak areas: {focusTopics.join(', ')}` (frozen, pinned). We
  just feed it the *real* topics instead of goal-surface tokens.
- `src/lib/scenarioGenerator.js` — `buildScenarioPrompt(goal, interests, lang)` /
  `generateScenarioText` / `generateScenario` take NO focusTopics. Additive change here.
- `src/components/MakeDeckPanel.jsx` — idle state offers "Make me a deck" + "Practise a
  conversation"; `handleGenerate` computes `focusTopics = goalToFocus(...).emphasise`;
  `handleGenerateScenario` calls `generateScenario({ goal, interests, lang })`. Reads
  `studyLang` (v34) and stamps generated cards with it.

## What ships

### 1. New pure core `src/lib/weakSpotSeed.js` (TDD)
`weakSpotSeed(store, lang = 'ms')` → `{ topics: string[], goal: string }`.
- Calls `buildLearnerProfile(store, { lang })`, reads `.focusTopics`.
- Maps each category slug to a **readable, language-aware phrase** via an authored `TOPIC_LABELS`
  map (both languages). Malay phrasing is authored here — Claude is the Malay quality gate
  (Kheshav is not Malay-fluent). Key calls:
  - `tense → "penanda masa"` (MS) — Malay marks time lexically (sudah/sedang/akan), not by
    conjugation, so "time markers" is the accurate gloss, not "kala".
  - `cohesion → "penanda wacana"`, `register → "laras bahasa"`, `imbuhan:meN- →
    "imbuhan (awalan meN-)"`, `other → "latihan am"`.
- Builds a one-line goal: MS `"Fokus pada kelemahan saya: a, b dan c."` / EN `"Focus on my weak
  areas: a, b and c."` (natural list join).
- **Empty focusTopics → `{ topics: [], goal: '' }`** (graceful degrade — the UI hides the entry).

### 2. Thread the signal into the scenario generator (additive — default = byte-identical)
- `buildScenarioPrompt(goal, interests, lang, focusTopics = [])` gains, when `focusTopics`
  non-empty, one line: `Where natural, give the student chances to practise these weak areas:
  {…}.` With the default `[]` the emitted prompt is **identical** to today (line filtered out) —
  existing `scenarioGenerator.test.js` stays green untouched.
- `generateScenarioText` / `generateScenario` accept + forward `focusTopics` (default `[]`).

### 3. One-tap entry in `MakeDeckPanel.jsx`
- New state `weakTopics` (string[]|null) + new phase `'weak'`. `weakSpotSeed` computed via
  `useMemo` from a `mistakes` selector + `studyLang` (no store change, no STORE_VERSION bump —
  `weakSpotSeed` reads only `store.mistakes`).
- **Idle**: when `seed.topics.length`, render a **"🎯 Practise your weak spots"** button beside
  the two existing CTAs. Tap → `setGoal(seed.goal); setWeakTopics(seed.topics); setPhase('weak')`.
- **`'weak'` phase**: a "Targeting: a, b, c" line + two buttons — "Make a deck" (`handleGenerate`)
  and "Practise a conversation" (`handleGenerateScenario`) + Back. Reuses the existing handlers
  and their loading/result/preview phases unchanged.
- `handleGenerate`: `focusTopics = weakTopics || goalToFocus(identity?.goalPreset, goal).emphasise`
  (current behaviour preserved when the weak path isn't used).
- `handleGenerateScenario`: passes `focusTopics: weakTopics || []` to `generateScenario`.
- `weakTopics` reset to `null` on Back / done so later manual flows are clean.
- A11y / styling: ≥44px targets, `var(--color-*)` only, labels follow the panel's existing
  button idioms; `🎯` is decorative (`aria-hidden`), the button text carries the meaning.

## What NOT to break (pinned by existing suites/e2e)
`buildDeckPrompt` / `parseDeckCandidates` / `parseScenarioCandidate` contracts ·
`buildScenarioPrompt` default-call output (byte-identical) · `instruct.js` frozen seam (deck +
scenario chain order unchanged) · `card.lang`/`studyLang` split · ForYou Phase-1 shelves ·
the make-deck grounding gate. BYOK keys never reach the Zustand cloud blob.

## Done criteria (observable)
With ≥1 recent mistake logged, For-You's make-deck panel shows the weak-spot button → one tap →
the generated deck/conversation is visibly biased to the learner's *own* weak categories. A
learner with no recent mistakes sees **no** button and the typed-goal flow is byte-identical.
Gate green (build · 2066 tests, +15 · lint · content-lint); new pure cores red-proofed watched-failing
first; the ForYou per-route chunk stays <70 KB (Writing is untouched); RESUME_HERE.md updated
same commit; Vercel READY on upg-.

## Decisions (decide-and-flag — veto any)
- Entry lives in the existing `MakeDeckPanel`, **not** a new For-You shelf (no new surface/state slice).
- The weak-spot button biases **both** actions (deck + conversation), not a forced single choice.
- Custom/weak-seeded scenarios stay **session-only** (consistent with shipped Phase-2 v1).
- Malay phrasing authored in `TOPIC_LABELS` is the Claude-verified quality gate; English mirror
  alongside. No AI call to name topics (deterministic, free, offline).
