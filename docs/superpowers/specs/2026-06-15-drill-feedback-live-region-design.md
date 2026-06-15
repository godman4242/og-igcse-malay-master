# A11y — SavedWordCloze + MixedSession drills must announce the verdict via a live region

**Date:** 2026-06-15 · **Cycle:** local build loop, self-sourced (queue empty → GOAL-driven assessment)
**Axis:** 3 (UX & accessibility) · **WCAG:** 2.1 SC 4.1.3 Status Messages

## Problem (Real — concrete evidence)

The prior a11y cycle (Comprehension + Listening) declared the FeedbackLive sweep "complete" in its
`▶ NEXT`. A fresh grep across every feedback-bearing surface (`isCorrect|Betul|Tidak tepat|Not
quite|Correct!`) vs. the FeedbackLive importers shows it MISSED two interactive **drill** surfaces:

- **`src/pages/SavedWordCloze.jsx:183-186`** — the "Practise saved words" cloze/produce drill (route
  `/saved-cloze`). Renders the per-question verdict (`✅ Correct!` / `Answer: <word>`) as a plain `<p>`.
  Grep-confirmed: **no `aria-live` / `role="status"` / `FeedbackLive` anywhere in the file.**
- **`src/components/MixedSession.jsx:233-239` & `307-313`** — the Dashboard "Smart Study" interleaved
  drill. Two verdict surfaces: vocab (`Nice!` / `Review: <meaning>`) and grammar/tense/comprehension/
  variant (`Betul!` / `Jawapan: <ans>`, `Correct!` / `Answer: <ans>`). **No live region anywhere.**

CLAUDE.md's a11y convention is explicit: *"every drill announces correct/incorrect via a polite live
region (`FeedbackLive`)… or SRs hear nothing."* A screen-reader / switch learner answering on these two
surfaces sees the green/red verdict but hears **zero** announcement — a measurable SC 4.1.3 miss on two
major learning surfaces (the ADD-first / low-friction north-star covers SR/switch users).

## Measurable Done (observable pass/fail)

A `role="status"` live region exists on each surface, is **empty before any answer**, and carries the
verdict text **after** an answer is graded — proven by mounted behavioural tests that are RED before the
fix (region does not exist → `status()` is `null`) and GREEN after:

- SavedWordCloze: answer right → region text `=== 'Correct!'`; answer wrong → `=== 'Not quite — the
  answer is rumah'`.
- MixedSession: answer a grammar drill right → region text `=== 'Correct!'`; region empty pre-answer.

## Approach (surgical, additive — no visible change)

Mount the EXISTING shared `src/components/FeedbackLive.jsx` (`role="status" aria-live="polite"
aria-atomic` `sr-only`) **unconditionally** at the top of each surface's active return, bound to a
derived text that is `''` until a verdict exists. Reuse the established app-wide wording verbatim
(`ClozeMode`/`TypeMode`/`ProduceMode`/`QuizMode`/`FlashcardMode`): `correct ? 'Correct!' : 'Not quite —
the answer is <X>'`. For MixedSession's vocab-standard self-rate (which has no typed answer) fall back to
`Review: <meaning>` (mirrors the visible text). The visible `<p>`/verdict rows are **untouched**.

## Decide-and-flag (forks pre-resolved)

- **Wording: app convention ("Correct!") vs faithful-to-visible ("Nice!"/"Betul!").** → Convention.
  *Why:* every study mode already announces English "Correct!" / "Not quite — the answer is X"
  regardless of card language (ClozeMode/TypeMode/ListenMode), so a blind learner hears ONE consistent
  verdict word across Study + Smart-Study. The celebratory synonym is cosmetic; the teaching value is
  right/wrong + the answer. *Veto:* mirror each surface's exact word — rejected as inconsistent with the
  rest of the app and lower value.
- **Test depth: behavioural vs structural for MixedSession.** → Behavioural, via a scoped `vi.mock` of
  `lib/interleave` returning ONE known grammar drill. *Why:* MixedSession's item selection uses
  `shuffleArray(Math.random)` + FSRS due logic + the variant engine — non-deterministic to drive
  end-to-end — but the verdict/live-region code under test is the component's, not the builder's; mocking
  the builder makes the typed-Check path deterministic and the proof real (stronger than a source grep).
  Driving the **correct** path means `buildDrillFeedback` returns `null` (no `GRAMMAR_FEEDBACK` lookup) →
  no extra fixtures. *Veto:* structural-only (the Listening precedent) — rejected here because
  MixedSession IS drivable with a small contained mock; structural would not catch a wrong binding.
- **Scope: 2 surfaces this cycle.** Matches the prior cycle's Comprehension+Listening precedent. The
  SmartSession micro-prompts (`WritingMicroPrompt`/`SpeakingMicroTurn`) + `ActiveCorrection` are the same
  small fix but live inside other sessions and each need their own test → recorded in `▶ NEXT` for the
  next cycle (increment model). `ActiveCorrection` is inside `Grammar.jsx` which already has page-level
  FeedbackLive, so it is the lowest priority.

## What NOT to break

- No `STORE_VERSION` bump · no schema / free-path touch (improves the FREE study path) · no feature
  deleted · `instruct.js` API untouched · no content authored (verdict strings already ship; WCAG
  citation is standard — nothing to web-verify).
- The visible verdict rows stay byte-identical; FeedbackLive is an invisible `sr-only` div.
- Bilingual: MixedSession's Malay verdicts (`Betul!`/`Jawapan:`) stay visible unchanged; the SR
  announcement is English by convention (as every other study mode).
