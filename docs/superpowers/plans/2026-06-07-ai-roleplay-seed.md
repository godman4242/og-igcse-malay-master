# Build plan — AI Roleplay Seed (Phase-2 increment E) — 2026-06-07

Spec: `docs/superpowers/specs/2026-06-07-ai-roleplay-seed-design.md` (read the verified
reuse-map + Decisions 1–5 first). ONE feature. Mirrors increment D's structure: pure TDD
core → AI orchestration → key-gated UI → mock-AI e2e. Reuses D's grounding index verbatim.

## Pre-flight (every session)
1. Baseline: `git status` clean · `npm run test:run` (note count — was **486**) · `npm run
   lint` (0 err, 3 known warns) · prod READY.
2. Re-read the spec reuse-map — DON'T rebuild: the AI chain (`generateDeckText` pattern),
   `buildDeckGroundingIndex`/`verifyPair`, `RoleplaySession` (turn engine — untouched),
   `goals.js`/`interests.js`, `getMockResponse`.
3. **Confirm Decision 1 (surface = Roleplay page, default) with Kheshav** — one
   AskUserQuestion. It's the only product call; everything else is locked in the spec.
4. **Verify the edge function is deployed** (`ai-proxy` ACTIVE) before relying on the live
   AI session — it was ACTIVE v9 on 2026-06-07; re-check via Supabase MCP.

---

## Step 1 — pure `roleplayGenerator.js` core (TDD)  ← do this first, no UI/network
New `src/lib/roleplayGenerator.js`. Write `src/lib/__tests__/roleplayGenerator.test.js`
FIRST (RED), then implement (GREEN):
- `buildScenarioPrompt(goal, interests, { lang = 'ms' } = {})` → `{system, user}`.
  - Tests: system mentions JSON + the required keys (context/turns/keyVocab/examiner/hint);
    user embeds the goal + each interest; empty inputs → no literal `undefined`; blank goal
    doesn't throw; `lang` flows into the instructions.
- `parseScenario(text)` → normalised scenario object | `null`. Reuse the brace/bracket
  string-walk idea from `parseDeckCandidates` but match a top-level OBJECT `{…}`.
  - Normalise: require `context` (string) + `turns` with ≥1 `{examiner}`; coerce each turn
    to `{ examiner:string, hint:string }`, drop malformed; cap `turns` ≤ 6; default
    `lang:'ms'`; `keyVocab`/`keyImbuhan` → arrays of trimmed strings; `title` trimmed or a
    fallback; carry `contextEn` if present else `''`.
  - Tests: clean JSON; ```json fence; prose-embedded; missing context → null; 0 valid turns
    → null; turns over-cap truncated; garbage/non-object/empty/null → null; never throws.
- `isKnownMalay(word, index)` → boolean. Key exists in the grounding index (owned OR
  Wikidata). Tests: owned hit (`rumah`), Wikidata hit (`payung`), unknown miss
  (`belalbuztik`), case/space-insensitive, empty/garbage → false, non-Map index → false.
- `groundScenario(scenario, index)` → scenario with `keyVocab` filtered to `isKnownMalay`
  words (leave `keyImbuhan` untouched — affixes aren't dictionary entries). Pure, no mutate.
  - Tests: invented keyVocab word dropped, real ones kept; empty/absent keyVocab tolerated;
    keyImbuhan preserved verbatim.
- `seedScenarioMeta(goal)` → `{ id, title }` (e.g. `id: 'ai-seed-' + slug`, `title: 'AI ·
  {goal}'` capped — mirror `deckNameForGoal`). Tests: id stable+slug-safe; title capped;
  blank goal → generic.

Gate: `npx vitest run src/lib/__tests__/roleplayGenerator.test.js` green.

## Step 2 — AI orchestration + mock (mirror deckGenerator)
- Add `MOCK_SCENARIO_RESPONSE` (a valid fenced scenario JSON incl. ONE invented keyVocab
  word to exercise grounding) + `case 'scenario':` in `getMockResponse` (`src/data/aiMocks.js`).
- In `roleplayGenerator.js`:
  - `generateScenarioText({goal, interests, lang, signal})` — `VITE_AI_MOCK` →
    `getMockResponse('scenario')`; else `isOpenRouterAvailable()` → `callOpenRouter({systemPrompt,
    messages:[{role:'user',content:user}], maxTokens:1200, signal})`; else
    `callAI({action:'chat', payload:{messages, scenarioContext:system}, stream:false})`.
  - `generateSeededScenario({goal, interests, cards, lang='ms', signal})` →
    `Promise.all([generateScenarioText(...), buildDeckGroundingIndex(cards)])` →
    `parseScenario` → `null`? throw a friendly Error : `groundScenario(...)` → attach
    `seedScenarioMeta(goal)` (id+title) → return `{ scenario }`.
- (No new unit tests required for orchestration — covered by e2e — but keep functions thin.)

## Step 3 — UI: `SeedScenarioCard.jsx` + wire into Roleplay (verify via e2e)
- New `src/components/SeedScenarioCard.jsx` (mirror `MakeDeckPanel.jsx` structure):
  props `{ onSeed }`. Reads `identity`, `userInterests`, `cards` (raw selectors — no getters
  in selectors). Key-gate per Decision 5 (`VITE_AI_MOCK || isOpenRouterAvailable() ||
  getRemainingCalls() > 0`; else locked → `/settings`). Goal input prefilled from
  `defaultGoal(identity)`. Generate → busy → preview (title, context, N turns, grounded
  keyVocab chips with a ✓ cue) → **"Start roleplay"** calls `onSeed(scenario)`. Error/empty
  → retry. `var(--color-*)` only; a11y labels/roles; bilingual-safe.
- Wire in `src/pages/Roleplay.jsx` (SURGICAL — read the file fully first):
  - Render `<SeedScenarioCard onSeed={(sc) => { setScenario(sc); setMode('ai') }} />` at the
    top of the `tab === 'scenarios'` block (above the AI-status banner or just under it).
  - **History label fix:** in `addRoleplayHistory` call site (`RoleplayScorecard.jsx`) add
    `title: scenario.title`; in Roleplay.jsx history render prefer `entry.title || sc?.title
    || entry.scenarioId`. Back-compatible.

## Step 4 — gates
- `tests/e2e/seed-scenario.spec.js` (mirror `make-deck.spec.js`): seed BYOK key +
  `page.route('**/openrouter.ai/**')` → fenced scenario JSON (incl. an invented keyVocab
  word). goto `/roleplay`, open the card, fill goal, Generate → preview shows the grounded
  vocab (invented word ABSENT) → "Start roleplay" → AI session opening examiner line visible.
  Light + dark screenshots. `bindStore`. (Locked-state code-verify only — VITE_OPENROUTER_KEY
  caveat as in make-deck.)
- `npm run build` (no new eager imports; Wikidata stays its own lazy chunk via
  `buildDeckGroundingIndex`) · `npm run lint` 0 err · `npm run test:run` all · full e2e green
  · eyeball light+dark.
- Commit atomic + refresh `RESUME_HERE.md` same commit → push (auto) → confirm upg- READY.

## Gotchas
- **Do NOT touch the turn engine, static mode, or scoring** in RoleplaySession — additive only.
- Roleplay.jsx is a 575-line state machine — read fully, surgical diffs (CLAUDE.md).
- Grounding here is **validity-filter** (advisory), NOT a hard pair-gate like D — never block
  the whole feature on grounding (spec Decision 3).
- Don't allocate inside Zustand selectors; `getRemainingCalls` is a getter → call in body.
- Generated scenario needs only the MINIMAL fields (spec reuse-map) — don't waste tokens
  asking the AI for modelAnswers/rubric.

## Plain-language version (for Kheshav)
A button on the Roleplay page: type your goal (e.g. "talk about my football hobby"), and the
AI writes you a brand-new speaking-exam scenario about it — then you practise it live with the
examiner bot, exactly like the built-in scenarios. Every Malay "key word" it picks is checked
against the real dictionary first, so it never coaches you on a made-up word. One question for
you at the start: should the button live on the Roleplay page (my recommendation) or the For
You home?
