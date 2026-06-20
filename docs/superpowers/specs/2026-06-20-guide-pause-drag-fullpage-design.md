# In-App Guide — Pause/Explore, Drag-Dock, Skip-to-Step & Full Page Guide

**Status:** Design — approved direction 2026-06-20 (spec-first, then phased build)
**Author:** Claude (Opus 4.8) with Kheshav
**Supersedes nothing.** Extends `docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md` (the original tour).

---

## 1. Problem & goals

### 1.1 The bug (must fix)
During the in-app guide, clicking the **dark overlay** (any area outside the highlighted box) leaves the guide box on screen but **dead** — Next / Back / ✕ all become no-ops, forcing a full page refresh. This makes the guide unusable for demoing the app to new users.

**Confirmed root cause** (verified against driver.js docs + installed `driver.js@1.4.0`): our `guideController.js` defines an `onDestroyStarted` hook but **never calls `driverObj.destroy()` inside it**. driver.js's contract (official "Confirm on Exit" example) is explicit: if you override `onDestroyStarted`, *you* are responsible for calling `destroy()`, or the tour never tears down. Our handler only flips internal flags (`torn`, `settled`), removes listeners, and clears the singleton — leaving the popover + overlay mounted in the DOM with every control short-circuited by the `torn`/`settled` guards. A backdrop click (default `overlayClickBehavior: 'close'`) routes straight into this broken hook.

### 1.2 Goals (Kheshav's request, sharpened)
1. **Fix the hang** — the guide must never enter a dead state.
2. **Pause / Explore mode** — clicking the dark area should *pause* the tour: the whole page lights up and becomes fully interactive so a new user can explore the current page freely; clicking the box re-darkens and re-spotlights *exactly where they left off*. (This is also the correct resolution of the bug — backdrop click no longer means "close.")
3. **Skip-to-step** — tap the "4 of 22" progress counter, type a step number, jump there.
4. **Drag + Dock** — the guide box is draggable; magnetic margins on all four sides + four corners glow translucent-green with dashed lines while dragging; dropping on a margin **docks + minimizes** the box (keeping all controls); dragging it back out re-detaches it.
5. **Full Page Guide** (▶ play button) — a per-page deep dive that walks every control on the *current* page with an animated pointer arrow + "what it does + example", instead of touring the whole app at once.

### 1.3 Non-goals
- No rewrite of the existing tour engine. Everything is **additive** to `guideController.js` / `tourSteps.js` / `useGuide.js`.
- No cross-session persistence of box position/dock in Phase 1–2 (in-session only) unless trivially free.
- No new always-eager bundle weight — the guide stays a lazy chunk; the React HUD host renders `null` when idle and lazy-imports its heavy parts.
- Full Page Guide content is shipped **page-by-page**, not all 19 routes in one go.

### 1.4 Success criteria (observable)
- Clicking the dark overlay **never** dead-ends the box (regression-tested).
- Clicking the dark overlay lights up the page; the page is clickable; the box's controls still work; **Resume** returns to the same step with the spotlight back.
- Tapping the progress counter and entering `N` lands on step `N` (route-aware), or the nearest renderable step if `N`'s target is missing.
- Dragging shows green dashed drop zones on 4 edges + 4 corners; dropping docks + minimizes; the docked box still exposes every control.
- ▶ on a page starts a page-scoped deep dive with an animated arrow pointing at each control.
- All new interactive controls are keyboard-operable, ≥44×44px, and announce state changes (parity with the app's a11y bar).
- `npm run build` / `test:run` / `lint` green; new unit tests red-proofed; e2e covers bug-fix + pause + skip + dock.

---

## 2. Grounding — how the current guide works (verified)

| Piece | File | Role |
|---|---|---|
| Step data (pure) | `src/lib/guide/tourSteps.js` | `QUICK_TOUR` (7 steps), `FULL_TOUR` (~22 steps); shape `{ id, title, body, route?, selector?, side?, align? }` |
| Engine (pure, injectable) | `src/lib/guide/guideController.js` | Route-aware step flow; `startTour(steps, opts)` → `{ destroy, ready }`; module singleton `_active`; `resolve()` navigates + waits for selectors + skips missing targets |
| React seam | `src/hooks/useGuide.js` | Supplies live `navigate`, telemetry, reduced-motion, `getPath`, and `onPopoverRender` (themes the body-level popover) |
| Entry points | `GuideCard.jsx` (Settings), `GuideOffer.jsx` (first-run) | Start quick/full tour |
| Theme CSS | `src/index.css` `.driver-popover.guide-theme` block | Token-driven popover styling |
| Library | `driver.js@1.4.0` (lazy) | Spotlight + popover |

**Verified driver.js@1.4.0 facts the design relies on:**
- `overlayClickBehavior?: 'close' | 'nextStep' | ((el, step, {config,state,driver}) => void)` — **accepts a custom function**. This is the Pause hook.
- `onPopoverRender?: (popover, {config,state,driver}) => void` — gives DOM refs (`popover.wrapper`, `.title`, `.description`, `.footerButtons`, `.progress`, etc.). Already used by `themePopover`. This is where we inject the Pause/Resume toggle, ▶ button, editable progress, and drag handle.
- `onDestroyStarted` must call `driver.destroy()` manually (the bug).
- `driverObj.moveTo(index)` / `drive(index)` exist — the basis for skip-to-step.
- CSS reality: `.driver-active *{pointer-events:none}` disables the whole page; `.driver-popover` and the active element are re-enabled (`pointer-events:auto`). The overlay is a `.driver-overlay` SVG; backdrop clicks are detected at the document level (not by the SVG capturing). `.driver-popover` is `position:fixed` (so it's freely repositionable for drag). `driver-active` (+ `driver-fade`) sits on the root element.

---

## 3. Architecture — extend the engine + add 3 thin layers

```
                         ┌─────────────────────────────┐
   tourSteps.js  ───────▶│  guideController.js (pure)   │
   pageGuides.js ───────▶│  • step flow (existing)      │
                         │  • + pause()/resume()        │  emits guideState
                         │  • + jumpTo(n)                │──────────────┐
                         │  • + fullPage(route)          │              │
                         │  • + fixed onDestroyStarted   │              ▼
                         └──────────┬──────────────────┘     ┌──────────────────────┐
                                    │ onPopoverRender          │ GuideHud (React host)│
                                    ▼ (DOM injection)          │ mounted in Layout    │
                         ┌──────────────────────────┐         │ • renders null idle  │
                         │ decoratePopover()         │         │ • DockZones (P2)     │
                         │ • Pause/Resume toggle     │         │ • GuidePointer (P3)  │
                         │ • ▶ Full Page button      │         │ subscribes to state  │
                         │ • editable progress       │         └──────────────────────┘
                         │ • drag handle (P2)        │
                         └──────────────────────────┘
       pure geometry helpers (unit-tested):
         dragDock.js (which zone? snap rect)   pointerGeometry.js (arrow path)
```

**Design principles**
- The **controller stays the single source of truth** for tour state. It gains a tiny observable (`subscribeGuideState`) so a React host can render full-screen chrome (dock zones, the big arrow) without the controller importing React.
- **Popover-internal controls** (Pause/Resume, ▶, editable progress, drag handle) are injected via the existing `onPopoverRender` DOM seam — same pattern as `themePopover`. No React inside the popover.
- **Pure geometry** (zone hit-testing, arrow path) lives in dedicated unit-tested modules, mirroring the app's `gestureModel.js` / `readerKeymap.js` convention.
- Everything new lands in the **lazy guide chunk**; `GuideHud` is cheap in the eager path (subscribe + render null) and lazy-imports `DockZones`/`GuidePointer` only when needed.

> Notation: `decoratePopover()` is the function exported from `popoverDecorations.js`. `type` blocks below describe object *shapes* (JSDoc-style) — this is a JS project, not TypeScript.

### 3.1 New / changed files

| File | New? | Phase | Purpose |
|---|---|---|---|
| `src/lib/guide/guideController.js` | change | 1,2,3 | Bug fix; `pause/resume`, `jumpTo`, `fullPage`; `subscribeGuideState` emitter; `decoratePopover` wiring |
| `src/lib/guide/popoverDecorations.js` | new | 1,2,3 | Pure-ish builders for the injected controls (Pause/Resume, ▶, editable progress, drag handle); takes callbacks, returns DOM nodes |
| `src/index.css` (`.guide-theme` area) | change | 1,2 | `guide-explore` veil-off + page-clickable rules; dock/minimize styles; drag-zone styles |
| `src/components/guide/GuideHud.jsx` | new | 2,3 | React host mounted in `Layout`; subscribes to guideState; renders DockZones / GuidePointer |
| `src/lib/guide/dragDock.js` | new | 2 | Pure: point→zone hit-test (4 edges + 4 corners), snap rect, detach threshold |
| `src/components/guide/GuideDockZones.jsx` | new | 2 | The translucent-green dashed drop-zone overlay shown while dragging |
| `src/lib/guide/pointerGeometry.js` | new | 3 | Pure: compute arrow path/points from popover rect → target rect |
| `src/components/guide/GuidePointer.jsx` | new | 3 | Animated SVG arrow (reduced-motion aware) |
| `src/lib/guide/pageGuides.js` | new | 3 | Per-route deep-dive content `{ [route]: PageGuideStep[] }` |
| `src/hooks/useGuide.js` | change | 1,3 | Thread new callbacks; expose `start`/`stop` unchanged + Full Page entry |

---

## 4. Phase 1 — Bug fix + Pause/Explore + Skip-to-Step

### 4.1 Bug fix
In `guideController.js`, `onDestroyStarted` must actually tear down. Replace the inline flag-flipping with a path that calls `driverObj.destroy()` exactly once (guarded against re-entry — driver.js fires `onDestroyed` after, not `onDestroyStarted` again, so a single guarded `destroy()` is safe):

```js
onDestroyStarted: () => {
  if (torn) return
  markDismissed()
  // MUST call destroy() — driver.js suppresses its own teardown when this hook
  // is overridden. Omitting it is what left the box mounted-but-dead (the bug).
  destroyDriver()          // sets torn, removes popstate, calls driverObj.destroy()
},
```

Once §4.2 changes `overlayClickBehavior` to a custom Pause function, the **backdrop no longer triggers destroy at all** — but Esc and programmatic teardown still route through here, so the fix is still required and gets its own regression test.

### 4.2 Pause / Explore mode

**Interaction model** (matches Kheshav's words: "the whole page will light up… clicking on the box again will darken the surrounding page and only highlight specific buttons"):

- **Spotlight mode** (default): page dimmed + locked, box spotlighting one target.
- **Click the dark area** → **Explore mode**: the dark veil fades out, the whole page becomes clickable (**including the bottom nav** — decided 2026-06-20: the user may wander to other pages while exploring), the box stays visible (now showing a **Resume ▶** affordance). The user explores freely.
- **Click Resume (or the box's Pause/Resume toggle)** → back to Spotlight mode at the *same step*; if the user wandered to a different route, Resume **navigates back to the step's route** and re-spotlights it.

**Primary control vs. enhancement (robustness):** the **Pause/Resume toggle button injected on the box is the guaranteed pause affordance** — it does not depend on driver.js internals. Backdrop-click → pause is an *enhancement* layered via `overlayClickBehavior`; Phase 1 verifies it fires reliably in driver.js@1.4.0, and if it doesn't, pause still ships fully functional via the button (no feature loss, just one fewer way to trigger it).

**Mechanism** (no driver teardown — state is preserved trivially):
1. Config: `overlayClickBehavior: () => controller.pause()` (the custom-function signature is confirmed in the driver.js@1.4.0 docs; that it *fires* on backdrop click is verified in Phase 1 — see the robustness note above).
2. `controller.pause()`: set `mode = 'explore'`; add class `guide-explore` to the root element that carries `driver-active`; update the injected toggle button to "Resume ▶"; emit `guideState`. **Guard:** if already `explore`, no-op (so page clicks in explore mode hit the page, never re-toggle).
3. `controller.resume()`: set `mode = 'spotlight'`; remove `guide-explore`; toggle button back to "Pause ⏸"; emit. The spotlight is still on the same step (driver was never destroyed), so it simply reappears.

**CSS** (added near the `.guide-theme` block; uses `!important` to beat driver's `.driver-active *` rule):
```css
/* Explore/pause: hide the dark veil and let the whole page receive clicks again.
   `guide-explore` is toggled on the same root element as driver-active. */
.driver-active.guide-explore .driver-overlay { opacity: 0 !important; }
.driver-active.guide-explore * { pointer-events: auto !important; }
/* re-allow page scroll while exploring (driver locks it during a tour) */
.driver-active.guide-explore :not(body):has(> .driver-active-element) { overflow: auto !important; }
.driver-popover.guide-theme { pointer-events: auto; } /* box always live */
```

**Edge cases**
- *Cross-route while paused (expected — bottom nav is clickable):* if the user navigates away during Explore, `resume()` re-enters at the same step index by running the existing route-aware `resolve(active, +1)` starting **at** `active` — which navigates back to the step's route, waits for its selector, and re-spotlights it. If that exact target is gone, it snaps to the nearest renderable step in travel order (never dead-end). The tour's own `pause()`/`resume()` use the app router (not `popstate`); genuine browser back/forward still tears down via `onPopState` (existing).
- *Esc while paused:* Esc closes the whole tour (routes through the now-fixed `onDestroyStarted`).
- *Reduced motion:* veil fade respects `prefersReducedMotion` (instant toggle).

### 4.3 Skip-to-Step

- In `decoratePopover` (run from `onPopoverRender`), replace the static `.driver-popover-progress-text` ("4 of 22") with a tappable control: the current-number becomes a small inline `<input type="number">` on click (min 1, max total). Enter/blur → `controller.jumpTo(value)`; Esc → revert.
- `controller.jumpTo(displayIndex)`: convert to 0-based list index; reuse a route-aware resolver to navigate to that step's route, `waitFor` its selector, then `landOn`. If the exact target is missing, resolve to the nearest renderable step in the direction of travel (mirrors existing skip-missing behavior). Guard against out-of-range. Emit `guide_jumped { tier, stepIndex }`.
- A11y: the input is labeled ("Go to step"); ≥44px tap area; change announced via the popover's live region.

### 4.4 Phase 1 telemetry
Add `guide_paused`, `guide_resumed`, `guide_jumped` — each carries only `{ tier, stepIndex }` (no user content; existing privacy invariant).

### 4.5 Phase 1 tests (red-proofed first)
- `guideController.test.js` (extend): (a) **regression** — `onDestroyStarted` now calls `driverObj.destroy()` and clears the singleton (watch it fail against current code first); (b) `pause()`/`resume()` preserve `active` index and toggle a mode flag; (c) `pause()` is idempotent; (d) `jumpTo(n)` navigates to step n's route then lands; (e) `jumpTo` out-of-range is clamped/ignored.
- e2e `tests/e2e/guide-pause-skip.spec.js` (uses the `bindStore` live-URL pattern): start a tour → click the overlay → assert box still interactive + page clickable (the **bug repro** that must now pass) → Resume → spotlight back → tap progress → enter a number → assert landed.

---

## 5. Phase 2 — Drag + Dock

### 5.1 Behavior
- A **drag handle** (the box header, injected by `decoratePopover`) starts a pointer drag. On `pointerdown`, capture the pointer; switch the popover to free positioning (it's already `position:fixed`; we set `left/top`, clear driver's inline placement, set `data-guide-dragged`).
- While dragging, `GuideHud` shows **`GuideDockZones`**: translucent-green, dashed-bordered drop targets on the 4 edges + 4 corners (the "book margins"). The hovered zone brightens.
- On `pointerup`:
  - Inside a zone (within snap threshold) → **dock**: snap the box to that edge/corner and add `guide-docked-{edge}` → **minimized** styling (compact bar/handle) that still exposes all controls (expand on hover/focus/tap).
  - Otherwise → leave the box floating where dropped (detached).
- Dragging a docked box back past the detach threshold → un-dock (restore full size, free float).
- In-session only (no STORE_VERSION bump). Position state lives in the controller + emitted to the HUD.

### 5.2 Pure geometry — `dragDock.js`
```
zoneForPoint(point, viewport, threshold) -> 'top'|'bottom'|'left'|'right'|
   'tl'|'tr'|'bl'|'br'|null
snapRectForZone(zone, boxSize, viewport)  -> { left, top }  (docked position)
shouldDetach(point, dockedZone, viewport, threshold) -> boolean
```
All pure, unit-tested — no DOM. Mirrors `gestureModel.js`.

### 5.3 Visuals & a11y
- Drop zones: `border: 2px dashed var(--color-green)`, `background: color-mix(in srgb, var(--color-green) 18%, transparent)`. Theme-token driven (works light/dark). Reduced-motion: no snap easing.
- **Keyboard parity:** a "Dock to…" menu in the box (or arrow-key nudge when the handle is focused) so non-pointer users can dock; mode/dock changes announced via aria-live. ≥44px handle.

### 5.4 Phase 2 tests
- `dragDock.test.js` (pure): zone hit-tests for edges/corners/center/none; snap rects; detach threshold.
- e2e: simulate a drag to an edge → assert docked + minimized + controls still reachable; drag out → detached.

---

## 6. Phase 3 — Full Page Guide (▶ deep dive)

### 6.1 Behavior
- A **▶ button** in the box (injected by `decoratePopover`) starts a **page-scoped** deep dive for the current route only.
- For each control on the page, the box spotlights it and an **animated arrow** (`GuidePointer`) draws from the box to the control, with copy: *what it does* + *a concrete example/use case*.
- Standard Next/Back/Pause/skip controls apply within the page guide. Exiting returns to wherever the user was (or just closes).

### 6.2 Content — `pageGuides.js` (refined Hybrid, approved 2026-06-20)
```ts
type PageGuideStep = {
  selector: string      // a stable [data-tour="…"] / [data-guide="…"] anchor (from live code)
  title: string
  body: string          // what it does
  example?: string      // a concrete sample/use case
  arrow?: 'from-box'|'none'
}
export const PAGE_GUIDES: Record<string /* route */, PageGuideStep[]>
```
- **Structure (selectors, order, arrow targets) is hand-derived from the live code — never AI** (AI would invent controls). New `[data-guide="…"]` anchors are added to page components where no stable anchor exists.
- **Prose**: hand-authored for the high-traffic pages; AI used only as a *first-draft accelerator for the long tail*, every line **rewritten to the app's voice and verified against the code before shipping** (learning-tool rule: confident-wrong content is the worst failure — cf. the Cikgu confidence gate). Shipped page-by-page.

### 6.3 Animated arrow — `pointerGeometry.js` + `GuidePointer.jsx`
- `pointerGeometry.js` (pure): given the popover rect and the target element rect, compute an arrow polyline/curve + arrowhead transform. Unit-tested.
- `GuidePointer.jsx`: a fixed full-viewport SVG (rendered by `GuideHud`) that draws the arrow with a stroke-dash "draw-on" animation; respects `prefersReducedMotion` (snap, no draw). Pointer never blocks clicks (`pointer-events:none`).

### 6.4 Phase 3 store/pref
- Optional "Don't offer the page guide again" pref → a small `guide.fullPageSeen` field → **STORE_VERSION bump + migration** (defer the decision to the Phase 3 plan).

### 6.5 Phase 3 tests
- `pointerGeometry.test.js` (pure): arrow endpoints for target above/below/left/right of the box; off-screen target clamps.
- `pageGuides.test.js`: every step has a non-empty title/body and a syntactically valid selector; route keys ⊆ `APP_ROUTES`.
- e2e: ▶ on a page → arrow appears pointing at the first control → Next advances.

---

## 7. Error handling & invariants
- **Never dead-end:** every new path (pause/resume across a route change, jumpTo a missing target, fullPage with a stale selector) falls back to the nearest renderable step or a clean close — reusing the existing `resolve()` skip-missing logic.
- **Idempotency:** `pause`/`resume`/`destroy` are guarded; double-invocation is a no-op.
- **Teardown safety:** the `_active` singleton + `onPopState` teardown are preserved; the React `GuideHud` unsubscribes on unmount.
- **Privacy:** telemetry carries only `{ tier, stepIndex }`.
- **Bundle:** new code stays in the lazy guide chunk; `GuideHud` is null-when-idle and lazy-imports heavy children. No eager `index` growth.
- **Accessibility:** all new controls keyboard-operable, ≥44×44px, state changes announced (parity with `tests/e2e/a11y-tap-targets.spec.js` + `FeedbackLive`).
- **Theming:** all colors via `var(--color-*)`; verified in dark + light.

## 8. Phasing & verification
- **Phase 1** (bug fix + pause + skip) is the first implementation plan, shipped behind the green gate (build + test + lint), README + tour data updated, `RESUME_HERE.md` refreshed in the same commit.
- **Phase 2** (drag/dock) and **Phase 3** (full page guide) each get their own plan; Phase 3's content is incremental per route.
- Each phase: red-proof new unit tests, add the e2e, then commit (which auto-pushes / deploys). Confirm Vercel READY after the push.

## 9. Open decisions (carried into plans, not blocking)
- Phase 2: persist box position/dock across sessions? (default: no.)
- Phase 3: which pages ship first; whether to add the `guide.fullPageSeen` pref (STORE_VERSION bump).
- Phase 3: AI provider for long-tail drafts (reuse the BYOK `instruct.js` router; never ships unreviewed).
