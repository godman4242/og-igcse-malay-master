# Build plan — For You Phase 2 COMPLETION (2026-06-13)

Spec: `docs/superpowers/specs/2026-06-13-for-you-phase2-completion-design.md` (read FIRST —
live-truth audit + decisions + what-not-to-break live there; this file is only the ORDER).
One increment per commit. Model: Fable 5 (high). Quality over speed — no overnight constraint.

## Pre-flight
1. Baseline: `git status` clean · `npm run test:run` (note count) · lint 0 errors · prod READY.
2. Skim the THREE existing modules before any edit: `src/lib/deckGenerator.js`,
   `src/lib/dictionaryGrounding.js`, `src/components/MakeDeckPanel.jsx` — this build is
   re-seaming + one new pure core, NOT new engines.

## Increment A — deck generation through callInstruct (~3 files)
1. RED: `src/lib/__tests__/deckGeneratorInstruct.test.js` — vi.mock instruct.js + openrouter.js
   + ai.js; pin (a) instruct-first when configured, (b) current chain when not (behaviour
   freeze), (c) instruct failure falls through silently. Watch it fail.
2. GREEN: `generateDeckText` tries `callInstruct` first; `MakeDeckPanel.deckAiAvailable` adds
   `hasInstructProvider()`. Panel hint copy: "add an AI key in Settings" (covers all providers).
3. Existing `deckGenerator.test.js` must stay green UNTOUCHED. Gate → commit.

## Increment B — AI roleplay seed (~4 files)
1. RED: `src/lib/__tests__/scenarioGenerator.test.js` — parseScenarioCandidate accepts a full
   valid JSON scenario; rejects (null): missing turns, empty examiner, totalTurns mismatch,
   non-array keyVocab, malformed JSON, prompt-injection-shaped extra fields (strip unknown keys).
   buildScenarioPrompt embeds goal/interests/lang + strict-JSON instruction. Watch fail.
2. GREEN: `src/lib/scenarioGenerator.js` (pure; mirror deckGenerator's layering) +
   orchestration `generateScenario({ goal, interests, lang, signal })` reusing Increment A's
   chain order.
3. UI: second CTA + preview in `MakeDeckPanel.jsx` → `RoleplaySession({ scenario, onExit })`
   (lazy-load RoleplaySession from the panel the way Roleplay.jsx does — keep it OFF the
   ForYou eager path). FeedbackLive for status announcements; ≥44px targets; `var(--color-*)`.
4. Gate (ForYou page chunk stays <70 KB) → commit.

## Increment C (OPTIONAL — skip if anything above ran long or the chunk gate fails)
1. `scripts/` fetch + commit the CC-BY-4.0 word-list as `src/data/malayWordList.js` (lazy);
   attribution in Settings credits + README. RED: verifyPair `validWord` signal tests.
2. Confirm-flow badge in MakeDeckPanel. Chunk ≤ ~120 KB gz HARD GATE. Gate → commit.

## Wrap (every path)
- CLAUDE.md: chunk-exemption list + a one-line Phase-2 status touch-up if C shipped.
- RESUME_HERE.md: ship record + stop-and-report (same commit as the last increment).
- Vercel READY on upg- → hand Kheshav a 3-step prod smoke script (Gemini key → make a deck →
  practise a conversation).
