# ActiveCorrection drill — announce success via a live region + name the input (WCAG 4.1.3 / 1.4.1 / 4.1.2)

**Self-sourced (queue empty), GOAL-driven assessment — axis-3 (UX & accessibility).** The last
verdict-bearing drill surface still missing a polite live region.

## Problem (evidenced)

`src/components/ActiveCorrection.jsx` is the "Feedback Correction Effect" component — after a learner
answers a Grammar drill **wrong**, `Grammar.jsx:244` sets `needsCorrection=true` and renders
`<ActiveCorrection>` (`Grammar.jsx:575-576`), forcing the learner to *type the correct answer to
continue* (active production of the correction — a real learning-science mechanism). This is the FREE
default Grammar tier, hit on every wrong Malay drill answer.

When the learner types the correct answer (`handleChange`, exact match), the only success signal is:
- the input **border** flips to `var(--color-green)` and the **text colour** to green, then
- `setTimeout(onComplete, 800)` auto-advances to the next drill.

A screen-reader / low-vision learner gets **zero announcement** that they succeeded — the success is
conveyed by **colour alone** and the view then swaps. Grep-confirmed: `ActiveCorrection` is the ONLY
verdict-bearing interactive surface in `src/` that does **not** import/mount `FeedbackLive` (every
study mode + Grammar's own drill verdict + Comprehension + Listening + SavedWordCloze + MixedSession +
Dictation + ClozeListening + PDFReader already do). It was missed in every FeedbackLive rollout and has
**no test**.

Two more, smaller, on the same 45-line component:
- The auto-focused input (`useEffect → inputRef.focus()`) has **no accessible name** — only a
  `placeholder="Type correction..."`. On mount the SR jumps to the input and announces the placeholder,
  **not** the instruction `<p>"Type the correct answer to continue:"` (which is a separate, unassociated
  text node). SC 4.1.2 / 1.3.1.
- Success-by-colour is also SC 1.4.1 (Use of Color) — adding a text announcement gives the
  non-colour cue.

WCAG 2.1 SC **4.1.3 Status Messages** (primary), **1.4.1 Use of Color**, **4.1.2 Name, Role, Value** —
all Level A/AA, on the app's stated keyboard/switch/ADD-first mission.

## Criteria fit

- **Axis 3 (UX & accessibility / low friction):** a measurable WCAG miss on a live learning surface.
  Same drill-feedback class the loop has been sweeping; CLAUDE.md convention: *"every drill announces
  correct/incorrect via a polite live region (FeedbackLive)… or SRs hear nothing."*
- **Real:** concrete `file:line` evidence above; reproducible (answer any Malay grammar drill wrong → the
  correction input gives no SR feedback on success).
- **Measurable Done:** a red-proofed test where the `role="status"` region is empty before, then carries
  `"Correct!"` after a right answer; and the input's accessible name is the instruction. RED first.

## Fix (surgical, additive, no visible change)

In `ActiveCorrection.jsx` only:
1. Import the shared `FeedbackLive` and mount it **unconditionally** (renders empty on mount, since
   `isCorrect` starts false → updates to `'Correct!'` when correct — the established mount-empty-first
   pattern, so the SR announces the *change*). `sr-only` ⇒ no visual change. Use the app-wide
   `'Correct!'` wording every study mode already uses.
2. Add `aria-label="Type the correct answer to continue"` to the input so the auto-focused field
   announces the instruction (matches the visible `<p>`).

Nothing else changes: the 800ms auto-advance, the green border/text, `handleChange` matching logic, and
the visible layout are all untouched.

## Decide-and-flag

- **Decision:** reuse the shared `FeedbackLive` + the app-wide English `'Correct!'`. *Why:* every study
  mode announces English "Correct!" regardless of card language, so a blind learner hears ONE consistent
  verdict app-wide. *Veto:* a Malay "Betul!" — rejected (inconsistent with the rest of the app; the
  parent Grammar drill verdict at `Grammar.jsx:574` already uses "Betul!" for the *drill* verdict, but
  the correction-success is a different, app-generic confirmation; English keeps the cross-app pattern).
- **Decision:** announce only on **success** (`isCorrect`), not on each wrong keystroke. *Why:* the
  component only advances on the correct answer; there is no discrete "wrong" verdict here (the learner
  keeps typing). Announcing every mismatched keystroke would be noise. *Veto:* announce wrong attempts —
  rejected (no discrete wrong state; would spam the SR on every character).
- **Decision:** keep the input's `outline-none`. *Why:* app-wide input convention (TypeMode,
  Grammar drill input) pairs `outline-none` with a custom coloured border — changing it here is
  inconsistent + out of scope.

## What NOT to break

- No `STORE_VERSION` / schema / free-path / `instruct.js` touch (none involved).
- No content authored (WCAG citation standard; "Correct!" already ships app-wide — nothing to
  web-verify).
- No visible change (the live region is `sr-only`; the input label is `aria-label` only).
- The 800ms auto-advance + green-border behaviour stays byte-identical.
- No feature deleted.

## Done = green gate

`npm run build` + `npm run test:run` (+2 red-proofed tests in
`src/components/__tests__/activeCorrectionA11y.test.js`) + `npm run lint` all green. e2e not required:
SR announcement + one `aria-label` on an existing control, no new screen/control/layout/flow; the
mounted unit test drives the real component DOM across the empty→correct transition (matches the recent
a11y-cycle precedent — drillFeedbackA11y / studyFeedbackA11y).
