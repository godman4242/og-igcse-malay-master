# Roleplay speaking-paper label — bilingual content-truth fix (axis-1)

**Date:** 2026-06-23 · **Mode:** local build loop, GOAL-driven Self-source (queue empty;
directed Full-Page-Guide epic Phase 3c complete) · **Axis:** 1 (correctness / confident-wrong content)

## Problem (Real — file:line evidence)

The **Roleplay** surface is BILINGUAL — `Roleplay.jsx:28` seeds an in-page `lang` toggle from the
global `studyLang` (`SCENARIOS` ↔ `SCENARIOS_EN`), and `RoleplayScorecard` already branches on
`scenario?.lang === 'en'` (`RoleplayScorecard.jsx:25`). The page BODY copy is already language-aware
(`Roleplay.jsx:82-85`, `Speaking.jsx:390-392`), but two USER-FACING labels hardcode the Malay-specific
**"Paper 3"** and so render it to English learners too:

1. `src/pages/Roleplay.jsx:168` — a `"Paper 3"` chip on **every** scenario card, including the English
   (`SCENARIOS_EN`) cards shown when `lang === 'en'`.
2. `src/components/RoleplayScorecard.jsx:171` — `"IGCSE Paper 3 Band"` under the score ring, shown after
   **any** roleplay (incl. English scenarios — `scenario.lang === 'en'` is already a live code path).

**Web-verified 2026-06-23 (primary sources):**
- Cambridge IGCSE Malay – Foreign Language **0546** (2025–27): **Paper 3 = Speaking** ✓ (0546 Paper 3
  Speaking specimen / teacher-examiner notes). So "Paper 3" is CORRECT for the Malay learner.
- Cambridge IGCSE English – Second Language **0510** (2024–26): components are **Paper 1 Reading &
  Writing · Paper 2 Listening · Component 3 Speaking Test**. English speaking is **Component 3, NOT
  "Paper 3"** → "Paper 3" is confident-WRONG for the English learner.

Same bug class as the 2026-06-23 listening/reading label cycle (a Malay-specific paper number leaking
onto a bilingual surface), but for the SPEAKING paper, and user-facing.

## Decision (decide-and-flag)

Apply the **Kheshav-cleared 2026-06-22 rule** (GOAL.md): on a bilingual / shared surface, **label by
skill** in the English branch and **keep the verified number only in single-syllabus context**. Since
`lang` (Roleplay) / `scenario.lang` (Scorecard) is in scope, make each label language-aware — exactly
the pattern `Roleplay.jsx:82-85` already uses:

- Scenario-card chip: `lang === 'en' ? 'Speaking' : 'Paper 3'`.
- Scorecard label: English → `'Speaking Band'`; Malay → `'IGCSE Paper 3 Band'` (unchanged).

**Why skill-label (not "Component 3") for English:** the band ring is the app's own 1–6 estimate (the
roleplay AI uses the Malay Paper 3 rubric), and 0510 speaking is graded 1–5 — so asserting "Component 3"
next to a /6 ring would itself overclaim. A skill label ("Speaking") is correct, scale-agnostic, and
matches the established drop-the-number decision. **Veto note:** could instead show "Component 3" for
English, but that risks a new confident-wrong scale implication; the larger "English roleplay scores on
a Malay rubric" question is a separate pedagogy item (▶ NEXT), out of scope for this content-truth fix.

## What NOT to break / KEEP (verified-correct, single-syllabus Malay)

- `Roleplay.jsx:84` body (Malay branch) "Paper 3" — already lang-gated → KEEP.
- `Speaking.jsx:392` "IGCSE Paper 3 speaking" — already lang-gated (`isEng` ternary) → KEEP.
- `Dashboard.jsx:888` "Paper 3 exam prep" — inside the Malay-framed first-run onboarding ("Welcome to
  IGCSE Malay Master / your IGCSE Malay exam") → single-syllabus Malay context → KEEP.
- `Roleplay.jsx:78` `<Meta>` description — head-only, explicitly Malay-framed ("Malay pronunciation and
  grammar"); not user-visible body copy → KEEP (veto: could neutralise, but out of scope, not wrong).
- All Malay speaking content (`systemPrompts.js`, `speakingGrader.js`, `cikguKnowledge.js` Paper-3
  entries) — single-syllabus Malay, Paper 3 = Speaking ✓ → untouched.

## Measurable Done (observable pass/fail)

New jsdom render test `src/components/__tests__/roleplaySpeakingLabel.test.js` (mirrors
`roleplayScorecardMistakeLang.test.js`):
- **RED first** against current code, then GREEN after the fix.
- Scorecard, `scenario.lang === 'en'`: rendered text contains **"Speaking Band"** and **no "Paper 3"**.
- Scorecard, Malay scenario (no `lang`): rendered text contains **"IGCSE Paper 3 Band"**.
- Roleplay picker, `studyLang === 'en'`: rendered text contains **"Speaking"** chips and **no "Paper 3"**.
- Roleplay picker, `studyLang === 'ms'`: rendered text contains **"Paper 3"**.

Gate: `build` 0 err · `test:run` all green (+ new) · `lint` 0 err (3 known warns). UI-affecting →
run `tests/e2e/guide-roleplay.spec.js` locally.

## Invariant screen

No `STORE_VERSION` / schema / free-path / `instruct.js` touch · no feature deleted · text-only label
swaps (no color/class/layout) → dark+light identical · not a new feature (a content-truth correction to
an existing surface) → README/tour ship-contract N/A.
