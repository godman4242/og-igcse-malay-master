# "Picked for you" Phase 2 — COMPLETION design (2026-06-13)

**Status: design-passed 2026-06-13 (Fable 5 session). Ready for a quality-first build session.**
Supersedes the *remaining-work* parts of `2026-06-06-personalized-for-you-design.md` §5.3-5.4 +
the Phase-2 half of `plans/2026-06-06-personalized-for-you.md`; their licensing companion
(`2026-06-06-for-you-phase2-dictionary-licensing.md`) **stands unchanged** — kaikki/Wiktionary
(CC-BY-SA) stays OUT of this public repo; owned data + CC0 Wikidata + (optionally) the
CC-BY-4.0 validity word-list are the only bundle-safe sources.

## Live-truth audit (2026-06-13 — what EXISTS, verified by grep/read; do NOT rebuild)
- `src/lib/dictionaryGrounding.js` — Tier-1 `verifyPair` + `buildGroundingIndex`, sense-splitting,
  unit-tested (`dictionaryGrounding.test.js`). Also consumed by PDFReader.
- `src/data/wikidataMalayEn.js` — the CC0 Wikidata Tier-3 asset, ALREADY bundled + wired via
  `buildDeckGroundingIndex` (lazy import).
- `src/lib/deckGenerator.js` — pure `buildDeckPrompt` / `parseDeckCandidates` / `groundCandidates` /
  `deckNameForGoal` (unit-tested) + `generateDeckText` + `generateGroundedDeck`.
- `src/components/MakeDeckPanel.jsx` — MOUNTED on ForYou (`ForYou.jsx:110`): generate → grounded
  accept/confirm flow → `addCards` into a named deck.
- Owned dictionary now **825 pairs** (was ~495 at design time) — Tier-1 coverage grew ~67%.

## The two real gaps (why Phase 2 isn't "done")
1. **Deck generation predates the 2026-06-10 multi-provider BYOK router.**
   `generateDeckText` calls `callOpenRouter` (env/user OpenRouter key) → `callAI` (shared
   rate-limited edge proxy); the panel gates on `isOpenRouterAvailable()`. A learner whose ONLY
   key is **Gemini or Ollama** — fully supported app-wide since the router shipped — sees
   "add a key to unlock" and can never generate. This is the router memo's "aiText-prefers-BYOK"
   fast-follow, applied to decks.
2. **The AI-roleplay seed (Phase-2 Step 3, second half) was never built.** Zero roleplay
   references in deckGenerator/ForYou. The goal+interests signal stops at vocab decks.

## Increments (priority order; one commit each)

### A. Deck generation through the instruct router (the gap that blocks real users)
- `generateDeckText` tries **`callInstruct({ system, user, signal })` FIRST** (user's own key,
  provider-agnostic, inherits cooldown auto-switch), then falls back to the existing chain
  (`callOpenRouter` env → `callAI` edge → `VITE_AI_MOCK`). instruct.js's public API is FROZEN —
  import only `hasInstructProvider`/`callInstruct`; never touch adapters.
- Panel gate: `deckAiAvailable() = mock || hasInstructProvider() || isOpenRouterAvailable()`.
- Red-proof: behavioural test with `vi.mock` on instruct.js + openrouter.js — (a) instruct
  configured → callInstruct used, OpenRouter NOT called; (b) instruct absent → existing chain
  (current behaviour pinned); (c) instruct throws → falls through, never rejects the whole flow.
- Don't touch `buildDeckPrompt`/`parseDeckCandidates` (pinned by existing suites).

### B. "Practise a conversation" — AI roleplay seed (key-gated, same gate as A)
- Pure core red-proofed FIRST: `src/lib/scenarioGenerator.js` —
  `buildScenarioPrompt(goal, interests, lang)` (strict-JSON instruction, 4-5 turns) +
  `parseScenarioCandidate(text)` validating the FULL `SCENARIOS` entry contract
  (`{ id, lang, title, titleEn, context, contextEn, totalTurns === turns.length,
  turns[].examiner non-empty, turns[].hint, keyVocab[] }`; `modelAnswers` optional) → returns
  the scenario or `null`. NEVER launch a malformed scenario (parse-reject → friendly retry).
- UI: second CTA in `MakeDeckPanel` (one panel, two actions — deck / conversation) → preview
  card (title + context + provenance line "AI-generated scenario") → launches the EXISTING
  `RoleplaySession({ scenario, onExit })` (verified prop contract, `RoleplaySession.jsx:14`).
- DECISIONS: custom scenarios are **session-only in v1** (not persisted — veto: a "my scenarios"
  shelf later, needs a store slice + cap). Language follows the For-You/app lang the learner
  picks in the panel (`ms` default). `keyVocab` softly checked against the grounding index —
  unknown words don't block (scenario vocab is contextual, not taught pairs) but the preview
  marks them so the learner knows. AI evaluation path: by construction the user HAS a key
  (gate A), so scoring uses the existing AI evaluator; static-mode fallback stays Malay-only
  as today.

### C. Tier-2 validity word-list (optional increment — build LAST, skip if over budget)
- Bundle `iannho/Malay-Dataset` `Malays.dic.txt` (24.5k real Malay words, CC-BY-4.0 — licensing
  doc Tier 2) as a lazy asset + attribution line (Settings credits + README). `verifyPair`
  gains a `validWord` medium-confidence signal for unverified Malay candidates (UI: "real word,
  translation unconfirmed" badge on the confirm list).
- HARD GATE: lazy chunk ≤ ~120 KB gz (expected ~80); if larger, ship a frequency-trimmed subset.
- Veto: skip entirely — A+B deliver the user-facing value; C only improves confirm-flow labels.

## What NOT to break (pinned by existing suites/e2e)
`parseDeckCandidates`/`groundCandidates` contracts · `callInstruct`/text-caller behaviour
(frozen seam; cikguSystemPrompt + instruct suites) · ForYou shelves (Phase-1 e2e) · Roleplay
static scenarios + MS/EN toggle · the licensing rule (NO CC-BY-SA data committed).

## Done criteria (per increment)
Red-proofed cores watched failing → gate green (build · test:run · lint · content) → chunk
budgets respected (ForYou page chunk <70 KB; new lazy assets exempt-listed in CLAUDE.md) →
commit → push → Vercel READY on upg- → RESUME_HERE.md updated same commit. After A+B (+C if
taken): stop-and-report with a Kheshav smoke-test script (Gemini-key user generates a deck AND
a conversation on prod).
