# Micro-guide style — UDL + ADD-first page tours (2026-06-24)

**Decision owner:** Kheshav (ADD; wants the whole app to follow UDL). Approved direction
2026-06-24: page-tour steps are **too long**; make them short, "micro", and finishable.

## Why (grounded, not vibes)
- **ADD / cognitive load:** every extra word in a just-in-time overlay is friction. A wall of
  text in a popover is the fastest way to make someone tap "Skip".
- **UDL — Representation:** "highlight what is essential, minimise extraneous information,
  chunk." Short one-idea steps ARE the UDL-correct form, not a compromise of it.
- **UDL — Action & Expression (executive function 6.x):** *support progress monitoring.* So
  progress stays VISIBLE — but as a non-daunting signal (dots), never a scary "4 of 22".
- **Goal-gradient effect:** people push harder as the end nears *when the end looks close*. A
  short tour with a visible "almost done" signal beats a long one with a hidden count.

## The rules (measurable — a step that breaks one is a defect)
1. **One idea per step.** If a step teaches two things, split or cut.
2. **≤ ~14 words in `body`.** Lead with the **action or benefit**, not the mechanism.
   ("Switch decks up top" not "At the top of the screen there is a row that lets you…").
3. **No separate `example:` line.** Fold a 3–5 word concrete cue *inline* ONLY when the
   control isn't self-evident (e.g. the non-obvious Produce mode). Most steps need none.
4. **≤ 5 steps per tour.** Merge/cut low-value steps. Fewer steps = less discouraging AND a
   smaller, encouraging dot count.
5. **Plain language, jargon defined inline** (e.g. "spaced repetition" → "comes back when
   you're about to forget"). Bilingual content still web-verified (axis-1).
6. **Keep the empty-state-safe rule** (centered `arrow:'none'` where controls are conditional —
   see `guide-empty-state-chaos.spec.js`).

## Progress indicator — DOTS (Kheshav's pick 2026-06-24)
Replace the visible "{{current}} of {{total}}" (`guideController.js` progressText +
`popoverDecorations.makeProgressJumpable`) with **dots** (● done/current, ○ remaining).
- **Preserve jump-to-step** (HARD invariant: never delete a feature): each dot is a button →
  `onJump(i)`. aria-label keeps the number for screen readers ("Go to step 3 of 5") — numbers
  are fine for SR, just not the *visible* daunting count.
- **Length-aware:** dots while `total ≤ 7`; a slim proportional **progress bar** when `total > 7`
  (the 22-step full tour would overflow as dots). One helper, two render modes by length.
- Update tests: `popoverDecorations.test.js`, `guideController.test.js`, and e2e
  `guide-drag-dock` / `guide-pause-skip` / `guide-pdf-reader` / `guide-pdf-chaos` (they assert
  the old "N of M" jumper).

## Rollout (one page per commit — the loop's proven rhythm)
- **Pilot shipped first:** `/study` (Kheshav's most-used page) — the worked example to react to.
- Then the remaining 20 routes in `PAGE_GUIDES`, each commit: shorten `body`s to the rules,
  cap at ≤5 steps, drop `example:` lines, keep empty-state safety. Update that route's
  `guide-*.spec.js` titles/count + `pageGuides.test.js` as needed; `guide-empty-state-chaos`
  adapts automatically (it reads `PAGE_GUIDES[route].length`).
- The full tour (`tourSteps.js`, ~22 steps) gets the bar (not dots) and the same brevity pass.

**Definition of done (per route):** every step ≤14 words, ≤5 steps, no `example:` field, gate
green, that route's guide e2e green.
