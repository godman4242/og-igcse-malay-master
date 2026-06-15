# WritingMicroPrompt disabled "Submit" button — contrast / P2-U1 fix

**Date:** 2026-06-15 · **Loop cycle (self-sourced, queue empty → GOAL-driven assessment)** · Axis-3 (UX/a11y)

## Problem (Real + concrete evidence)

`src/components/interleaved/WritingMicroPrompt.jsx:89` was the **only** `text-black` on a
`--color-*` fill anywhere in `src/` (grep-verified — the sole other hit is the explanatory
comment in `index.css:26`). The disabled-state Submit button:

```jsx
className="… text-black …"
style={{ background: …'var(--color-card2)', color: input.trim() ? 'var(--color-on-bright)' : undefined, … }}
```

When the input is empty the inline `color` is `undefined`, so the `text-black` class wins →
`#000000` on `--color-card2`. In the **default (dark) theme** `--color-card2 = #1e1e40`, so the
disabled "Submit" label is black-on-dark-navy at `opacity: 0.5` ≈ **1.4:1** — effectively
illegible. This both violates the documented **P2-U1 convention** ("never `text-black`/`#000` on a
`--color-*` background") and is a real visible defect in the theme the app ships by default.

(Disabled controls are WCAG-1.4.3-exempt, so this is the app's own stricter convention + a
legibility defect, not a hard WCAG failure — but the label is genuinely unreadable in dark mode.)

## Measurable Done (observable pass/fail)

1. `grep -rn 'text-black' src/` returns **zero** component hits (only the index.css comment + this
   feature's own test/spec text).
2. The disabled Submit button's inline `color` resolves to a theme-aware `var(--color-*)` token
   (`--color-dim`), not `undefined`/`text-black`.
3. The **enabled** Submit button is byte-identical to before (green fill + `--color-on-bright`).
4. New red-proofed test passes; full gate green.

## Fix (surgical)

Remove the `text-black` class; set the disabled color to `var(--color-dim)` (the app's standard
disabled/secondary text token, used by the adjacent Skip button) — tuned to pass in both themes
(**5.13:1** dark / **4.83:1** light vs card2, per the index.css ratio comments). Enabled state
unchanged.

## Decide-and-flag

- **Decision:** disabled color = `var(--color-dim)` (matches the sibling Skip button).
- **Why:** card2 is a dim neutral surface, so `--color-dim` is the correct token; it is theme-aware
  and already proven against card2 in both themes.
- **Veto 1:** `var(--color-on-bright)` for disabled — rejected: on-bright is for BRIGHT/accent
  fills and is `#000` in dark mode → reproduces the same illegible black-on-card2.
- **Veto 2:** also recolour `SpeakingMicroTurn`'s `#fff`-on-red buttons — rejected as scope creep:
  white-on-bright is the intended direction (not a `text-black` violation) and is a separate
  judgment; keep the diff to the one documented violation.
- **Rejected lead:** the prior cycle's `▶ NEXT` flagged the micro-prompts' `❌ Not quite` rows as a
  missing-FeedbackLive (WCAG 4.1.3) gap. On inspection those are **self-grade buttons** (the student
  presses them to assess themselves), not app-computed verdicts — a screen reader already announces
  the activated button, so there is no status message to announce. The lead was a misclassification;
  not built.

## What NOT to break

No `STORE_VERSION`/schema/free-path/`instruct.js`/content change · enabled-state visuals unchanged ·
no feature deleted · both themes stay legible.
