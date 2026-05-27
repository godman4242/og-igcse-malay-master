# 2026-05-27 — Session: Phase 4 (Frictionless UX & Deep Work) — page transitions

Closes the remaining piece of Phase 4 in CLAUDE.md's Zero-Waste
Cognitive Engine plan. Theater Mode was already shipped (and wired into
both Writing.jsx and Speaking.jsx via `useTheaterMode`); the only open
item was page-transition polish.

## The framer-motion tradeoff

Plan literal called for `framer-motion` + `<AnimatePresence>`. Stack
context made that the wrong call:

- `framer-motion` 12.38.0 is already installed and used by three pages
  (Study, Roleplay, SmartSession), but each pulls it in via *their own
  lazy chunk* — current build splits motion into `dist-CyvQv1Ru.js`
  (184 KB raw / 48 KB gz) and `use-reduced-motion-eHBhwiXB.js` (121 KB
  raw / 39 KB gz). Total ~300 KB / ~87 KB gz, billed only when those
  routes load.
- Importing `AnimatePresence` from `framer-motion` in `App.jsx` (eager)
  would hoist `motion-dom` into `index-*.js`. **That is the exact
  regression the 2026-05-25 `MistakeToast` rewrite called out and
  fixed** — its top-of-file comment explicitly documents why the
  prior framer-motion-based version was dropped.
- The page-transition use case is a *single* fade+slide-in animation.
  CSS keyframes deliver an identical visual at zero new bundle cost
  and zero new failure modes.

Decision: CSS-only, matching the established pattern set by
`MistakeToast` and the new `MistakePromotedToast`. The deviation from
the literal spec is documented here so a future reader doesn't think
the agent forgot the framer-motion piece.

If a future requirement demands true crossfade (old page exits *while*
new page enters), the lightest upgrade path is `LazyMotion` +
`domAnimation` + `m` from `motion/react`, lazy-loaded into its own
chunk — but the current "enter-only on mount" pattern is what
production SPAs (including Vercel.com) ship.

## Fix

### CSS — reuse the existing `fadeUp` keyframe

```css
/* src/index.css */
.page-transition {
  animation: fadeUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  .page-transition { animation: none; }
}
```

`fadeUp` was already defined (8 px translate-up + opacity 0→1).
Reusing it keeps the visual vocabulary consistent across the app's
`.animate-fadeUp` usages and these new route transitions.

### App.jsx — keyed wrapper inside Suspense

```jsx
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>{/* … 17 routes … */}</Routes>
    </div>
  )
}
```

`key={location.pathname}` triggers a React unmount/remount of the
wrapper on every path change, which re-fires the CSS keyframe. The
keyed wrapper lives *inside* `<Suspense fallback={...}>`, so the
loading spinner does NOT animate — only the resolved route content
does. (Without that, the spinner would slide in, then content would
snap into place.)

`location={location}` on `<Routes>` is the same as the default
(Routes pulls from context), but the explicit pass-through is the
documented pattern and would let us upgrade to an AnimatePresence
crossfade later without touching the wrapper.

## Files changed

| File | Change |
|---|---|
| `src/index.css` | `.page-transition` class + `prefers-reduced-motion` override (~10 lines). |
| `src/App.jsx` | New `AnimatedRoutes` component (factored 17 route definitions into it); added `useLocation` import; replaced inline `<Routes>` with `<AnimatedRoutes />`. |

## Verification

- `npm run lint` → 0 errors, 3 pre-existing warnings unchanged.
- `npm run test:run` → 214/214 pass in 624 ms.
- `npm run build` → clean.
  - `index-*.js`: **409.15 KB / 131.36 KB gz** (vs `d2091c2` 409.02 /
    131.34 — net **+0.13 KB raw / +0.02 KB gz**, just the new JSX).
  - Compared to the framer-motion-in-eager-Layout alternative
    (~+190 KB raw / ~+50 KB gz), this is a ~1500× smaller footprint
    for the same visual.

Edge cases hand-walked:
- **Suspense + key**: fallback renders without animation; resolved
  content animates on the next paint after the lazy chunk lands.
- **Same-route navigation** (clicking the same nav button): pathname
  unchanged → no remount → no animation. Correct.
- **Query/hash change**: pathname unchanged → no remount. Correct
  (don't want a flash on filter toggles).
- **`<Navigate to="/" />` from 404**: pathname changes → animation
  fires. Correct.
- **prefers-reduced-motion**: animation killed via media query; div
  still remounts (instant content swap). Correct.
- **State preservation**: Routes already unmounts/remounts the matched
  Route element on path change; the keyed wrapper just adds one
  parent-level unmount/mount that's invisible to per-route state.

## State at end of session

- All five Zero-Waste master-plan phases **shipped**:
  1. Architectural Detox ✅
  2. Interleaved Practice ✅
  3. Adaptive Scaffolding ✅
  4. **Frictionless UX & Deep Work ✅ (this session — Theater Mode
     already done, page transitions landed here)**
  5. Tight Feedback Loops ✅ (prior commit `d2091c2`)
- 0 lint errors, 214/214 tests, build clean.
- Doc drift unchanged: CLAUDE.md still says `STORE_VERSION = 12`;
  reality is `20`. Known. Don't burn a turn investigating.

## Open threads

- **B (Row 7 cosmetic gap)** — unchanged; punted.
- **D (Playwright auto-tester)** — unchanged; punted.
- **Future motion upgrade** — if true crossfade is ever wanted, use
  `LazyMotion` + `domAnimation` + `m` from `motion/react` in a lazy
  chunk. Don't re-import the full `framer-motion` package eagerly.
