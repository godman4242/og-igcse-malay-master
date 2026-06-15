# `.animate-fadeUp` should be disabled under `prefers-reduced-motion` — design

**Date:** 2026-06-15 · **Loop:** local build loop, self-sourced (queue empty → GOAL-driven assessment)
**Axis:** 3 (UX & accessibility / low friction) · **Freshest `▶ NEXT` lead:** "reduced-motion on the
`animate-fadeUp` transitions" (RESUME_HERE.md, ActiveCorrection-colour-cue cycle).

## Problem (Real — concrete evidence)

`src/index.css`:
- `:81` — `.animate-fadeUp { animation: fadeUp 0.25s ease; }` is the app's primary **entrance**
  animation. The `fadeUp` keyframe (`:77-80`) animates `opacity 0→1` **and** `transform: translateY(8px)→0`
  — i.e. real vertical **motion**, not just a fade. Used **82× across 40 files**
  (`grep -rn animate-fadeUp src/`), including the OUTER wrapper of the whole Dashboard
  (`Dashboard.jsx:246`) and Study (`Study.jsx:66`).
- `:92-94` — `@media (prefers-reduced-motion: reduce) { .page-transition { animation: none; } }` disables
  the **same `fadeUp` keyframe** for the route-transition wrapper only. `.animate-fadeUp` is **not**
  listed, so a learner who set `prefers-reduced-motion: reduce` (vestibular / motion sensitivity; also the
  app's ADD-first "calm UI" mission) still gets 82 sliding entrance animations.

This is an **internal inconsistency**, not a debatable WCAG interpretation: the app already decided this
keyframe should be `animation: none` under reduced motion (for `.page-transition`) and the rest of the app
respects the preference (framer-motion `useReducedMotion` in `Study`/`RoleplaySession`/`SmartSession`, the
toasts, the guide controller, the Settings deep-link scroll). The 82-use component-level entrance animation
was simply missed in the CSS media query.

## Fix (surgical, CSS-only)

Extend the existing reduced-motion block to also zero `.animate-fadeUp`:

```css
@media (prefers-reduced-motion: reduce) {
  .page-transition,
  .animate-fadeUp { animation: none; }
}
```

No flash-of-invisible-content risk: with `animation: none`, an `.animate-fadeUp` element renders at its
**resting** state (opacity 1, no transform — the element's default), exactly like `.page-transition`
already does. The keyframe's `from { opacity: 0 }` only applies while the animation runs.

## Measurable Done (observable pass/fail — TDD red-proof first)

1. **Unit (runs in the standard gate):** a new test reads `src/index.css` and asserts the
   `prefers-reduced-motion: reduce` block's selector list **includes `.animate-fadeUp`**. RED before
   (block lists only `.page-transition`). Mirrors the existing `themeContrast.test.js` CSS-source pattern.
2. **e2e (real Chromium computed style):** extend `tests/e2e/page-transitions.spec.js` — under
   `reducedMotion: 'reduce'`, navigate to `/`, assert a `.animate-fadeUp` element's computed
   `animationName === 'none'`. RED before (would be `'fadeUp'`). Mirrors the sibling `.page-transition`
   reduced-motion test already in that file (`:48`).

## What NOT to break (regression guards)

- **Default (no reduced-motion):** `.animate-fadeUp` still animates normally — the new rule only applies
  inside the media query. (The e2e's existing non-reduced tests already assert `fadeUp` fires.)
- `.page-transition` reduced-motion behaviour unchanged.
- No `STORE_VERSION` bump · no schema / free-path break · no feature deleted · `instruct.js` API untouched
  · **no content authored** (pure CSS; nothing to web-verify).

## Decide-and-flag

- **Decision:** add `.animate-fadeUp` to the SAME existing media block (one shared rule with
  `.page-transition`). **Why:** both use the identical `fadeUp` keyframe and the same "disable motion"
  intent; one rule keeps them from diverging again. **Veto (a separate `@media` block):** rejected — needless
  duplication of the media query.
- **Scope veto:** do NOT also touch `animate-spin` (loading spinners — disabling removes the loading
  affordance; arguably "essential" motion), `animate-pulse` (Tailwind decorative; separate judgment), or the
  unused `shimmer` keyframe (dead CSS, no class applies it). Keep the diff to the one documented
  inconsistency — the `fadeUp` keyframe disabled for one selector but not the other.
