# Micro-prompt focus management on view transition — design (axis-3, WCAG 2.4.3)

**Date:** 2026-06-15 (local build loop, self-sourced, queue empty → GOAL-driven assessment)
**Axis:** 3 (UX & accessibility / low friction) — the app's stated keyboard/switch/ADD-first mission.
**Source:** the freshest `▶ NEXT` thread (RESUME_HERE.md, micro-prompt-submit-contrast cycle) flagged
focus loss on the SmartSession micro-prompts as a remaining genuine a11y consideration.

## Problem (Real — concrete evidence)

The two SmartSession interleaved micro-prompts swap their view in place when the student finishes a
step, and the actioned button **unmounts**, dropping keyboard focus to `<body>`:

- **`WritingMicroPrompt.jsx`** — clicking **Submit** flips `submitted → true`, which replaces the
  textarea+Submit branch (`!submitted`, lines 69-102) with the self-grade panel (lines 104-131). The
  Submit button (the focused element after a keyboard activation) is destroyed; nothing moves focus to
  the new panel. A keyboard/switch/SR learner must hunt from the top of the document to reach the
  "❌ Not quite" / "Yes!" self-grade buttons.
- **`SpeakingMicroTurn.jsx`** — `phase` transitions `ready → recording → done`. Each transition
  unmounts the prior phase's button(s):
  - `ready → recording`: "Start Speaking" unmounts; the round Stop button appears but is **unlabeled**
    (icon-only, no accessible name) AND unfocused → a keyboard user can't easily reach it to stop early.
  - `recording → done`: the Stop button unmounts; the self-grade panel appears with no focus moved to it.

This is a WCAG 2.1 **SC 2.4.3 Focus Order (Level A)** miss + (for the Stop button) **SC 4.1.2 Name,
Role, Value**. There is **zero** focus management on any view transition across `src/components/study/`
or `src/components/interleaved/` today (grep-confirmed: the only `.focus()` is WritingMicroPrompt's
initial textarea focus). The app explicitly commits to being "fully keyboard/switch-operable" (CLAUDE.md
reader keyboard layer), so this is a real gap on-mission, not a nicety.

## Measurable Done (observable pass/fail)

- **WritingMicroPrompt:** after typing a sentence and clicking Submit, `document.activeElement` is the
  self-grade panel's question prompt (`"Did your sentence use … correctly?"`), NOT `<body>`. (RED before:
  focus is on `<body>`.)
- **SpeakingMicroTurn:** after recording starts, `document.activeElement` is the round Stop button (now
  carrying `aria-label="Stop recording"`); after recording stops, `document.activeElement` is the
  self-grade question prompt. (RED before: focus on `<body>`; Stop button has no accessible name.)

## Fix (surgical, additive)

- Add a `useEffect` keyed on the transition state (`submitted` / `phase`+`hasRecorded`) that calls
  `.focus()` on a ref'd focus target when the new view mounts.
- Focus target = the **question `<p>`** of the self-grade panel, given `tabIndex={-1}` (WAI pattern:
  move focus to the new content's heading/prompt so the SR reads the actionable question, then Tab →
  grade buttons). For SpeakingMicroTurn's recording phase, focus the round Stop button.
- Add `aria-label="Stop recording"` to the icon-only round Stop button (focusing it is meaningless
  without a name).
- No visible change; no new content; the existing initial-textarea-focus is unchanged.

## Decide-and-flag

- **Decision:** focus the self-grade panel's *question prompt* (not the first button). **Why:** WAI
  guidance for a view change is to move focus to the new content's start/heading so the SR announces the
  context ("Did your sentence use rajin correctly?") before the actions; focusing a button skips that
  context. **Veto note:** focusing the first grade button — rejected (skips the question; less helpful).
- **Decision:** REJECT the `aria-pressed` half of the `▶ NEXT` lead. **Why:** the self-grade buttons
  call `grade()` which `setTimeout(onComplete, 500)` — they commit a self-grade and auto-advance; they
  are **momentary commit buttons**, not persistent toggles a user flips back and forth. `aria-pressed`
  is for toggle buttons; adding it to a button that immediately advances is semantically wrong and the
  selected visual state is only on-screen for 500ms. **Veto note:** if a future redesign makes the
  grade persistent (no auto-advance), revisit.
- **Decision:** also move focus to the Stop button on recording start + label it. **Why:** same defect
  class (focus lost on view change) + a genuine keyboard-operability gap (a keyboard user otherwise
  can't reach Stop to end early; the 30s auto-stop is the only escape). Tightly coupled to labeling it.

## What NOT to break

- No `STORE_VERSION` / schema / free-path / `instruct.js` touch (pure component a11y).
- No content authored (WCAG citation is standard; nothing to web-verify).
- Existing `microPromptContrast.test.js` must stay green (Submit contrast unchanged).
- The visible layout/colors of both panels are byte-identical; only focus + one aria-label added.

## Verification

- TDD red-proof in `src/components/__tests__/microPromptFocus.test.js`:
  - WritingMicroPrompt behavioural: type → Submit → assert activeElement is the question `<p>`.
  - SpeakingMicroTurn behavioural (mock `getUserMedia` + `MediaRecorder`): start → assert activeElement
    is the labeled Stop button; stop → assert activeElement is the question `<p>`.
- Gate: `npm run build && npm run test:run && npm run lint` all green.
