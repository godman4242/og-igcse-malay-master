# AI Roleplay Seed — design spec (2026-06-07)

Phase-2 increment **E** (the last For-You AI increment). Companion to
`2026-06-06-personalized-for-you-design.md` and the grounding work in
`2026-06-06-for-you-phase2-dictionary-licensing.md`. **Researched against the live
code 2026-06-07** (Roleplay.jsx, RoleplaySession.jsx, scenarios.js, deckGenerator.js).

---

## TL;DR (the decision)
Add a **"Make a scenario for my goal"** generator that turns the learner's goal +
interests into a **custom AI roleplay scenario** and drops them straight into the
EXISTING AI roleplay session (`RoleplaySession`). It reuses three things already
shipped: (1) the AI orchestration pattern from increment D
(`generateDeckText`: VITE_AI_MOCK → OpenRouter → edge), (2) the **grounding gate**
(`verifyPair`) — every generated `keyVocab` word is checked against owned dictionary
+ CC0 Wikidata so a seeded scenario never teaches a made-up word, and (3) the live
`RoleplaySession` evaluator — **zero changes to the turn engine**.

**Key finding that makes this small & safe:** the AI session reads only a *minimal*
slice of a scenario — NOT the full static shape. So generation is far simpler and
more robust than authoring a complete static scenario.

---

## Verified reuse-map (live signatures, 2026-06-07 — READ BEFORE BUILDING)

### What `RoleplaySession` ACTUALLY consumes from a `scenario`
From `src/components/RoleplaySession.jsx`. These are the ONLY fields the AI session
touches — everything else in the static scenario shape is unused in AI mode:
- `scenario.context` + `scenario.contextEn` → sent to the AI as `scenarioContext`
  (`${context} (${contextEn})`). **Required.**
- `scenario.turns[0].examiner` → the opening examiner line shown first (falls back to
  `keyVocab[0]` then `'Selamat datang!'`). **Required-ish** (opening matters most).
- `scenario.turns[n].examiner` → **fallback** examiner line if the live AI fails to
  produce turn n. The AI drives turns dynamically, so these only need to be plausible.
- `scenario.turns[n].hint` → the on-screen hint per turn.
- `scenario.keyVocab` (array) → injected into the AI turn + scoring prompt AND used by
  the scorecard's vocab-used/missing tally. **The grounding target.**
- `scenario.keyImbuhan` (array, optional) → injected into AI turn + scoring prompt.
- `scenario.totalTurns` → falls back to `turns.length`.
- `scenario.lang` → `'ms' | 'en'` (drives TTS/STT locale + prompts).
- `scenario.title` → header + history label.

**NOT used by AI mode:** `modelAnswers`, `rubric`, `titleEn`, `contextEn` beyond the
one interpolation. ⇒ **The generator does NOT need to produce model answers or a
rubric.** This is the single biggest simplifier.

### AI orchestration (reuse from increment D)
- `src/lib/deckGenerator.js` already proves the pattern: `generateDeckText` =
  `VITE_AI_MOCK` → `callOpenRouter({systemPrompt,messages})` → `callAI({action:'chat'})`.
  Mirror it for scenario generation. (The roleplay *turn* calls use
  `callAI({action:'roleplay'})` via the edge — unchanged; only the **scenario JSON**
  is a new generate call, best routed through OpenRouter/free when available.)
- `getMockResponse(action)` in `src/data/aiMocks.js` — add a `'scenario'` case +
  `MOCK_SCENARIO_RESPONSE` for hermetic mock/e2e (same approach as `MOCK_DECK_RESPONSE`).

### Grounding (reuse from increments A/C/D)
- `buildDeckGroundingIndex(cards)` (deckGenerator.js) lazy-loads owned dictionary +
  CC0 Wikidata → a `verifyPair` index. **Reuse verbatim** to vet `keyVocab`.
- `verifyPair(m, e, index)` → `{verified, confidence, canonicalEn?}`. For scenario
  seeding we only have Malay words (no proposed English), so we need a **word-validity**
  check, not a pair check — see Decision 3.

### Personalization signals (already wired)
- `identity.idealSelf` / `identity.goalPreset` (+ `GOAL_PRESETS`, `goalToFocus` in
  `src/lib/goals.js`) → the goal. `userInterests` (+ `INTERESTS` in `src/lib/interests.js`)
  → interest labels. Roleplay.jsx already reads `userInterests` and prioritises
  scenarios by them (`prioritiseByInterests`).

### History (one small, known edge)
- `RoleplayScorecard.jsx` logs `addRoleplayHistory({ scenarioId: scenario.id, turns, score })`.
- Roleplay.jsx history tab renders `SCENARIOS.find(s => s.id === entry.scenarioId)?.title
  || entry.scenarioId`. A generated `id` won't be in `SCENARIOS` → it'd show the raw id.
  **Fix (small):** add `title: scenario.title` to the logged entry and make the renderer
  prefer `entry.title`. (Back-compatible — old entries fall back to the find.)

---

## Decisions (with alternatives + rationale)

### Decision 1 — Surface: the **Roleplay page**, not ForYou  ⚠️ CONFIRM WITH KHESHAV
A "✨ Make a scenario for my goal" card at the top of the Roleplay scenarios list.
- **Why Roleplay, not ForYou:** the generated scenario lives in Roleplay's *local*
  `useState` (`setScenario(x); setMode('ai')`). Hosting the button ON Roleplay means a
  **direct, trivial injection** — no cross-route state plumbing. Hosting on ForYou would
  need a new store field (`pendingScenario`) + a Roleplay mount-effect to consume it →
  more moving parts + regression risk on the 575-line Roleplay page. Personalization is
  preserved either way (goal/interests come from the store, not the page).
- **Recommendation:** ship on Roleplay (lower risk, contextually correct — the user is
  already in "practise speaking" mode). A ForYou deep-link ("Practise speaking about your
  goal →" that routes to `/roleplay` and auto-opens the generator) is a trivial 1-line
  fast-follow if wanted.
- **This is the one product-placement call for Kheshav** (per his "spec features needing
  product input" preference) — default = Roleplay.

### Decision 2 — Generate the MINIMAL scenario, let the live AI drive
The generator outputs only: `{ title, context, contextEn, lang, keyVocab[], keyImbuhan[],
turns: [{examiner, hint}] × ~5 }`. No `modelAnswers`, no `rubric` (AI mode ignores them).
- **Why:** smaller output = far higher parse reliability; the live `RoleplaySession`
  already generates each turn dynamically, so `turns[n].examiner` only need to be sane
  fallbacks. Less to get wrong, nothing degraded.

### Decision 3 — Ground `keyVocab` as **validity**, never silent-ship wrong Malay
`verifyPair` checks a Malay↔English *pair*; here the AI gives only Malay `keyVocab`.
So add a tiny pure helper `isKnownMalay(word, index)` (the Malay word exists as a key in
the grounding index — owned OR Wikidata). Filter `keyVocab` to known words; **drop**
unknown ones from the vocab list (so scoring/teaching never targets an invented word).
- If too many are dropped (e.g. <2 remain), keep the scenario but with the surviving
  vocab (the conversation still works — keyVocab is guidance, not a hard gate).
- **Never** block the whole feature on grounding — unlike a deck (where a card IS the
  artifact), here vocab is advisory. The guardrail is "don't *promote* a wrong word",
  satisfied by filtering. Document this difference from D explicitly.

### Decision 4 — Language follows the learner's goal/app, default `ms`
Generate a Malay (`lang:'ms'`) scenario by default (the syllabus focus). If the goal
text is clearly English-paper oriented, an `en` scenario is possible — but to stay
bounded, **v1 = Malay-only** (matches the static evaluator's strength). English seed =
parked note.

### Decision 5 — AI availability gate mirrors D + existing Roleplay
Show the generator when scenario generation is possible: `VITE_AI_MOCK` ||
`isOpenRouterAvailable()` || `getRemainingCalls() > 0` (edge). Running the *session*
already needs edge quota (existing `aiAvailable` banner handles that). If generation
succeeds but edge quota is 0, the session falls back to its existing static-fallback
examiner lines — so a seeded scenario is still playable. No new rate-limit logic.

---

## Pure functions to TDD (the testable core)
New `src/lib/roleplayGenerator.js`:
- `buildScenarioPrompt(goal, interests, { lang })` → `{system, user}`. System: "author an
  IGCSE Paper-3 Malay roleplay scenario as JSON with EXACTLY these keys… ~5 turns…
  standard Bahasa Melayu… examiner drives, student responds." Tests: embeds goal +
  interests; asks for JSON + the right keys; no `undefined` on empty inputs; never throws.
- `parseScenario(text)` → a normalised scenario object or `null`. Tolerant of ```json
  fences/prose (reuse the bracket-matching approach from `parseDeckCandidates`, but for an
  OBJECT `{…}` not an array). Validates required fields (context, ≥1 turn with examiner),
  coerces `turns` to `[{examiner, hint}]`, caps turns (≤6), trims, drops malformed turns,
  defaults `lang:'ms'`, `keyVocab`/`keyImbuhan` to arrays. Returns `null` on garbage.
- `isKnownMalay(word, index)` → boolean (key exists in grounding index). Tests: owned hit,
  Wikidata hit, unknown miss, case/space-insensitive, garbage→false.
- `groundScenario(scenario, index)` → scenario with `keyVocab` filtered to known words
  (keeps `keyImbuhan` as-is — affixes aren't dictionary words). Pure. Tests: drops the
  invented word, keeps real ones, never empties below the survivors.
- `seedScenarioId(goal)` / title helper → deterministic readable id+title (e.g.
  `ai-seed-…` + `AI · {goal}` style, mirror `deckNameForGoal`).

Orchestration (covered by mock-AI e2e, mirrors deckGenerator):
- `generateScenarioText({goal, interests, lang, signal})` → 3-tier chain (mock/OpenRouter/edge).
- `generateSeededScenario({goal, interests, cards, lang, signal})` → text → `parseScenario`
  → `groundScenario(buildDeckGroundingIndex(cards))` → returns `{scenario}` or throws/empty.

---

## UI (Roleplay page)
A new component `src/components/SeedScenarioCard.jsx` rendered above the scenario list
(inside `tab === 'scenarios'`), gated by Decision 5:
- Pitch + goal input (prefilled from `defaultGoal(identity)` — reuse the helper idea from
  MakeDeckPanel) + "Generate scenario" (gradient button, busy spinner).
- On success: a tiny preview (title + context + N turns + the grounded keyVocab chips with
  a "checked ✓" cue) and a primary **"Start roleplay"** → `onSeed(scenario)` which the
  parent wires to `setScenario(scenario); setMode('ai')`.
- Error/empty → friendly retry. Locked (no AI) → "add a key to unlock" → `/settings`
  (mirror MakeDeckPanel's locked branch).
- `var(--color-*)` only; bilingual-safe; a11y (labels, roles).

## Tests / gates (same bar as D)
- Unit: `roleplayGenerator.test.js` — the 5 pure functions above (RED→GREEN, ~15–20 cases).
- Mock-AI e2e `tests/e2e/seed-scenario.spec.js`: seed BYOK key + `page.route('**/openrouter.ai/**')`
  returns a fenced scenario JSON (one invented keyVocab word to prove filtering) →
  generate → preview shows grounded vocab (invented word absent) → "Start roleplay" enters
  the AI session (examiner opening line visible). Light + dark. `bindStore`. (Locked-state
  not hermetic — same VITE_OPENROUTER_KEY caveat as make-deck; code-verify only.)
- `npm run build` (Wikidata stays its own lazy chunk — reuse `buildDeckGroundingIndex`),
  `npm run lint` (0 err), `npm run test:run` (all green), full e2e green, eyeball both themes.
- Commit atomic + refresh `RESUME_HERE.md` same commit → deploy → confirm Vercel READY.

## Adversarial findings / edge cases
- **History label:** generated id not in `SCENARIOS` → add `title` to the logged entry +
  prefer it in the renderer (Decision/History note). Verify in e2e or a unit on the action.
- **AI returns prose, not JSON:** `parseScenario` must tolerate fences/prose and return
  `null` cleanly → UI shows "couldn't build a scenario, try again" (no crash).
- **Edge quota 0 at session start:** seeded scenario still plays via static-fallback
  examiner lines (existing behaviour) — acceptable; note it.
- **Reduced/garbage keyVocab after grounding:** keep the scenario; vocab is advisory.
- **English goal:** v1 generates Malay; don't crash on English input (just produce a Malay
  scenario themed on the goal). English scenario = parked.
- **Don't touch the turn engine / static mode / scoring** — additive only (CLAUDE.md:
  Roleplay.jsx is a large state machine; read fully, surgical diffs).

## Parked (not this increment)
- English seeded scenarios; ForYou deep-link entry; storing seeded scenarios to replay
  later (history currently logs score only, not the scenario body).
