# Personalization deep-dive — research & decision (2026-06-24)

First "aspect deep-dive" under the new planning framework
([`../process/planning-and-thinking-framework.md`](../process/planning-and-thinking-framework.md)).
Grounded in real sources + practitioner reviews per the standing research rule — not memory.

## Question
Is personalization the highest-Compass first aspect to improve (Compass = learner exam outcome per
minute), and if so, which direction?

## Evidence (cited)
- **Adaptive personalization moves outcomes — when it actually adapts.** Personalized/adaptive
  learning averages an effect size ≈ **0.40** on achievement; **g ≈ 0.70** for adaptive-vs-
  non-adaptive systems (medium–large). The decisive moderator: the system must *adapt to the
  learner* — shallow/cosmetic personalization shows little-to-no effect.
  ([Wang 2026 meta-analysis, JCAL](https://onlinelibrary.wiley.com/doi/10.1002/jcal.70168?af=R) ·
  [scoping review, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11544060/))
- **Persistence is the real bottleneck of self-study, and autonomy drives it.** Self-Determination
  Theory: autonomy (genuine choice/control) + competence + relatedness → intrinsic motivation →
  persistence. Controlled (non-autonomous) engagement predicts *less* learning and *less* persistence.
  ([SDT in education, ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0361476X20300254)
  · [autonomy support, PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4424234/))
- **Practitioner caution — the engagement-obsession trap.** Duolingo's adaptive difficulty + streaks
  + personalized nudges drive huge retention, but the documented downside is shallow learning (users
  leave after basics). Personalization must serve the *outcome*, not addictiveness.
  ([Duolingo scaling critique](https://gadallon.substack.com/p/duolingos-scaling-journey-education))
- **Personalization exemplar (productivity):** Zen browser's edge is letting the user *shape the
  environment to their identity + workflow* (workspaces, theming, layout), not cosmetics for their
  own sake. ([MakeUseOf](https://www.makeuseof.com/zen-browser-features-for-productivity/))

## Decision
**Personalization = the first aspect (confirmed).** It beats learning-science (already strong → smaller
marginal gain) and code-quality (indirect enabler) on learner-facing leverage. **Reframe:** weight
**adaptive + autonomy**, not cosmetic theming. **Guardrail:** anchor every personalization feature to
the Compass; reject pure engagement plays.

**Chosen direction — "B: Show me why" (transparency + competence + light steer).** The app already
*adapts* but the learner can neither *feel* nor *steer* it — closing that gap is the highest
outcome-per-effort move (it surfaces work already built). A ("make my study space"/workspaces) and C
("my goal, my path") follow later.

## Existing surfaces B leverages (grounded against live code)
- `src/pages/ForYou.jsx` — "Picked for you" hero + weak-topic chips (≈L165); consumes `getStudyPlan()`.
- `src/store/useStore.js` — `getStudyPlan` (≈L1806), `getFixUpQueue` (≈L1758), `mistakeReasons`,
  `countMastered` (lib/fsrs), `skillActivity` → `lib/skillBalance.js`. These already compute *why* a
  card/shelf is chosen (due / missed-twice / weak topic) — B's job is to **surface the reason** and add
  a **simple mix steer** ("more listening / less grammar"), plus a visible **mastery/competence map**.
- `src/pages/Dashboard.jsx`, `src/pages/MistakeJournal.jsx` — other adaptive surfaces.

## Open questions for the spec (brainstorm in the new session)
1. Where does "why" live — inline per card/shelf, a tappable info chip, or both? (reveal-gated to avoid
   clutter; ADD-first.)
2. The mix-steer: a few presets vs. sliders? How does it interact with FSRS scheduling (must not corrupt
   spaced-repetition due-dates — steer the *selection*, not the algorithm)?
3. Competence/mastery map: reuse `skillBalance` / `countMastered`, or a new per-topic view?
4. Bilingual + empty-state safety (no "why" on a fresh empty deck).
5. Measurable Done (outcome-linked, not proxy): e.g. "every Picked-for-you item shows a one-line reason;
   the learner can shift the mix and the next session reflects it; zero FSRS due-date drift (test-pinned)."
