# ActiveCorrection — visible non-colour success cue (WCAG 1.4.1 Use of Color)

**Date:** 2026-06-15 · **Loop:** local build loop, self-sourced (queue empty → GOAL-driven
assessment) · **Axis:** 3 (UX & accessibility)

## Problem (Real — concrete evidence)

`src/components/ActiveCorrection.jsx` — the "Feedback Correction Effect" drill mounted on the FREE
default Grammar tier after a wrong Malay drill answer (`Grammar.jsx:244 setNeedsCorrection(true)` →
`Grammar.jsx:575-576`) — signalled a **correct** retype by **colour alone** on the visible side: the
input border + text flip to `var(--color-green)`, then an 800 ms auto-advance. The prior cycle
(`b83bab1`) added the screen-reader half (sr-only `FeedbackLive` + an `aria-label`) but **left the
visible-colour-only cue flagged as a remaining gap** (its own `▶ NEXT`).

A grep of every drill verdict surface vs. the visible-cue pattern confirms `ActiveCorrection` is the
**sole** drill that lacks a non-colour visible verdict. Every sibling shows the `✅ Correct!` / `❌`
glyph (a shape cue) or "Correct!"/"Betul!" text:

- `ClozeMode.jsx:43`, `ProduceMode.jsx:80`, `TypeMode.jsx:41`, `FlashcardMode.jsx:270/296/322/350`,
  `ListenMode.jsx:49`, `SpeakMode.jsx:148` → `✅`/`❌` glyph
- `Comprehension.jsx:452`, `Listening.jsx:305` → visible "Correct!/Not quite" text

So a sighted **colourblind** learner (~8 % of males) gets no perceivable confirmation — a measurable
**WCAG 2.1 SC 1.4.1 Use of Color (Level A)** failure, the most fundamental accessibility tier, on the
free path.

## Criteria fit

Axis 3 (a11y) — a measurable WCAG miss with a concrete `file:line`. Outranked by nothing real on
axes 1/2 this cycle (content + grading already swept clean across recent cycles).

## Measurable Done (observable pass/fail)

A mounted test types the correct answer and asserts a **visible** (non-`sr-only`) element carrying the
`✅` glyph + "Correct!" now renders — **RED before** (only the sr-only live region + colour existed).

## Decision / why / veto

- **Decision:** reuse the app-wide `✅ Correct!` glyph verdict (the exact `ClozeMode`/`TypeMode`/
  `ProduceMode` pattern). **Why:** consistency — every other drill already shows this; the `✅` shape
  is a non-colour cue that satisfies 1.4.1 even for total colour blindness.
- **Veto — make the `<p>` `aria-hidden`:** rejected. Sibling drills do NOT hide their visible verdict,
  and the `<p>` is not `aria-live`, so the SR announces once via `FeedbackLive` and reads the static
  `<p>` only on navigation — no double announcement. Matching the sibling pattern keeps it consistent.
- **Veto — a bespoke ✓ icon component:** rejected (the emoji glyph is the established convention; a new
  icon would diverge for no benefit).

## What NOT to break

`handleChange` matching, the 800 ms auto-advance, the green border/text, the sr-only `FeedbackLive`
announcement, and the input `aria-label` are all **byte-identical**. No `STORE_VERSION` / schema /
free-path / `instruct.js` / content touch. No Malay/English content authored (wording mirrors the
existing app pattern — nothing to web-verify).

## Verification

`src/components/__tests__/activeCorrectionA11y.test.js` +1 behavioural test (red-proofed: `cue`
undefined RED before). Gate: build OK · 1674 tests (+1) · lint 0 errors · Grammar chunk 50.7 KB ≪ 70 KB.
e2e not required (one conditional verdict `<p>`, no interactive control / new flow — the mounted unit
test drives the real render across the empty→correct transition; matches the prior ActiveCorrection
a11y cycle's documented precedent).
