# In-App Guide Phase 3 — Full Page Guide (▶ deep dive)

**Status:** Design — ready for review 2026-06-20 (spec-first, then a TDD plan, then page-by-page build)
**Author:** Claude (Opus 4.8) with Kheshav
**Extends:** `docs/superpowers/specs/2026-06-20-guide-pause-drag-fullpage-design.md` §6 (the umbrella spec — this deepens §6 into a build-ready design and resolves its open decisions). Builds on Phase 1 (pause/explore + skip) and Phase 2 (drag + dock), both shipped 2026-06-20.

---

## 1. Problem & goal

The whole-app tour (`QUICK_TOUR` / `FULL_TOUR`) answers *"what is this app and where do I go?"*. It does **not** answer *"I'm standing on the Writing page right now — what does each button here do, and how would I actually use it?"*. A learner who lands on a feature-dense page (Study, Writing, PDF Reader) still has to guess.

**Goal (observable):** on any page that has a guide, the learner taps a **▶ "Tour this page"** affordance and gets a **page-scoped deep dive**: the page's controls are spotlighted one at a time, an **animated arrow** points from the guide box to each control, and the copy says **what it does + a concrete example** ("Tap *Analyze* → paste your essay → you get a band score and per-sentence fixes. e.g. paste a 120-word email and see where to add connectives"). Standard Next / Back / Pause / drag-dock / skip controls all apply. Exiting returns the learner to the page, untouched.

### 1.1 Success criteria
- ▶ on a page with a guide starts a deep dive scoped to **that route only** (no cross-route navigation mid-guide).
- Each step spotlights a control and draws an **animated arrow** (box → control) that respects `prefers-reduced-motion` (snap, no draw) and never blocks clicks.
- Every step's copy has a **what-it-does body** and (where useful) a **concrete example**, hand-verified against the live control — **zero confident-wrong content** (the worst failure for a learning tool — see §5).
- A missing/renamed control is **skipped gracefully** (reuses the engine's skip-missing path); the deep dive never dead-ends.
- All new controls are keyboard-operable, ≥44×44px, and announced (a11y parity with the rest of the app).
- Ships **page-by-page**, not all 21 routes at once. Phase 3a = the 3 highest-traffic pages.
- `npm run build` / `test:run` / `lint` green; new unit tests red-proofed; e2e covers the ▶ → arrow → Next flow for the first shipped page.

### 1.2 Non-goals
- No rewrite of the tour engine — Phase 3 is **additive** (reuses `startTour`, the controller's navigate/wait/skip, the Phase-2 `GuideHud`).
- No AI-authored content shipped unreviewed (AI is at most a first-draft accelerator for the long tail — §5).
- No new always-eager bundle weight — the arrow + page-guide data stay in the lazy guide chunk; `GuideHud` stays null-when-idle.
- Phase 3a does **not** auto-offer the page guide or persist "seen" state (decided in §6 — no `STORE_VERSION` bump in 3a).

---

## 2. Grounding (verified against live code 2026-06-20)

| Piece | File | What it gives Phase 3 |
|---|---|---|
| Tour engine (route-aware, skip-missing, pause, jumpTo) | `src/lib/guide/guideController.js` | `startTour(steps, opts)` already navigates + `waitFor`s selectors + skips missing + lands. A page guide is just steps that all share the current route. **Reused as-is.** |
| Step data shape | `src/lib/guide/tourSteps.js` | `{ id, title, body, route?, selector?, side?, align? }`; anchors are `[data-tour="…"]`; `APP_ROUTES` mirrors the route table. |
| HUD host (Phase 2) | `src/components/guide/GuideHud.jsx` | Eager, subscribes to `guideState` via `useSyncExternalStore`, lazy-renders overlays, announces via `FeedbackLive`. **The arrow mounts here**, exactly like `GuideDockZones`. |
| State observable (Phase 2) | `src/lib/guide/guideState.js` | `{ dragging, zone, docked, announce }` + `setGuideState`/`subscribeGuideState`. **Extended** with a `pointer` field. |
| Popover decorations (Phase 1/2) | `src/lib/guide/popoverDecorations.js` | Injects pause button, tap-to-jump progress, drag handle via `decoratePopover`. **The ▶ button is injected the same way** (and an in-popover entry is one of two entry points — §4). |
| Pure-geometry precedent | `src/lib/guide/dragDock.js`, `src/lib/gestureModel.js` | The unit-tested-pure-module convention `pointerGeometry.js` follows. |
| Routes | `src/App.jsx` (21 routes + catch-all) | **`App.jsx` has 21 routes; `tourSteps.APP_ROUTES` lists only 19** (omits `/dictation`, `/cloze-listening`). Reconcile in this phase (§7). |
| Existing anchors | grep `data-tour=` | Only ~6 real anchors exist (`dashboard-cta`, `streak`, `nav-study`, `nav-practice`, `guide-card`, `guide-offer`). **No `data-guide` anchors exist yet** — each shipped page must add them. |

**driver.js@1.4.0 facts relied on (already used by Phase 1/2):** multi-step `steps[]` each with an `element` selector; `onPopoverRender` DOM seam; popover is `position:fixed`. driver draws its own small popover-to-element arrow; the Phase-3 arrow is a **separate, larger, animated** full-viewport SVG (does not replace driver's).

---

## 3. Architecture — reuse the engine + 2 new files + 1 HUD extension + per-page anchors

```
  pageGuides.js  ──────▶  buildPageSteps(route)  ──▶  startTour(steps, {tier:'page'})
  (per-route content)        (pure: PAGE_GUIDES[route]      │  (existing controller —
                              → engine step shape,           │   all steps same route,
                              route stamped = current)        │   so no navigation)
                                                              ▼
                                          controller emits guideState.pointer
                                          { box: DOMRect-lite, target: DOMRect-lite } | null
                                                              │
                                                              ▼
                                              GuideHud (Phase 2, extended)
                                              • renders <GuidePointer> when pointer set
                                                              │
                              pointerGeometry.js (pure, unit-tested)  ◀── GuidePointer.jsx
                              arrowPath(boxRect, targetRect, viewport)     (animated SVG,
                              → { path, head, clamped }                     reduced-motion aware,
                                                                            pointer-events:none)
```

### 3.1 New / changed files

| File | New? | Purpose |
|---|---|---|
| `src/lib/guide/pageGuides.js` | new | `PAGE_GUIDES: Record<route, PageGuideStep[]>` + pure `buildPageSteps(route)` → engine step shape. Hand-authored content (§5). **Lazy** (loaded only when ▶ is tapped). |
| `src/lib/guide/pageGuideRoutes.js` | new | **Tiny zero-import eager seam** — `PAGE_GUIDE_ROUTES: string[]`, just the route keys that have a guide, so the eager header ▶ can decide visibility WITHOUT importing the heavy lazy `pageGuides.js`. Same trap/fix as Phase-2 `guideState.js`. A unit test asserts it stays in sync with `Object.keys(PAGE_GUIDES)`. |
| `src/lib/guide/pointerGeometry.js` | new | Pure: `arrowPath(boxRect, targetRect, viewport)` → polyline/curve points + arrowhead transform, off-screen clamp. No DOM. Unit-tested. |
| `src/components/guide/GuidePointer.jsx` | new | Full-viewport fixed SVG arrow with a stroke-dash "draw-on" animation; `prefers-reduced-motion` → snap; `pointer-events:none`. Lazy via `GuideHud`. |
| `src/lib/guide/guideState.js` | change | Add `pointer: { box, target } | null` to the shape + initial. |
| `src/components/guide/GuideHud.jsx` | change | Lazy-render `<GuidePointer>` when `pointer` is set (mirrors the `GuideDockZones` branch). |
| `src/lib/guide/guideController.js` | change | `startPageGuide(route)` helper; compute + emit `pointer` rects on each `landOn`/render; clear on teardown; inject the ▶ button via `decoratePopover`. |
| `src/lib/guide/popoverDecorations.js` | change | Inject the ▶ "Tour this page" button via the existing seam — takes an `onFullPage` callback + an `isPageGuide` flag so it's **suppressed while a page guide is already running** (no recursive ▶). |
| Per shipped page (e.g. `Dashboard.jsx`, `Study.jsx`, `Practice.jsx`) | change | Add `data-guide="{page}-{control}"` anchors to the controls the guide points at. |
| `src/index.css` | change | Arrow stroke/head styles (token-driven), the ▶ entry-button styles. |
| `src/hooks/useGuide.js` | change | Expose `startPage(route)` (thin seam, mirrors `start`/`stop`). |
| Entry point (decided §4) | change | A ▶ "Tour this page" affordance — placement decided in §4. |

### 3.2 Why reuse the engine (not a parallel "page driver")
A page guide is structurally identical to the whole-app tour minus cross-route navigation. `resolve()` already: navigates only when `step.route !== currentRoute` (a no-op when every step is the current route), `waitFor`s the selector, and **skips a missing target**. So page steps get skip-missing, pause/explore, drag-dock, and tap-to-jump **for free**. New surface area is just *content* + *the arrow* + *an entry point*.

---

## 4. Entry point (DECIDE-AND-FLAG)

A page guide needs a way to start that doesn't depend on a tour already running.

**Decision (Phase 3a):** add a compact **▶ "Tour this page"** button to the **`Layout` header**, shown **only when the current route has a guide** — checked against the tiny eager `PAGE_GUIDE_ROUTES` list (NOT `PAGE_GUIDES` itself). **Bundle trap (caught in review):** `Layout` is eager and currently nothing eager imports guide content; if the header checked `PAGE_GUIDES[route]` it would become the *first* eager importer and pull the whole lazy content chunk into `index` — the exact invariant Phase 2 protected with `guideState.js`. So the header imports only `PAGE_GUIDE_ROUTES` (route strings, zero deps); the heavy `pageGuides.js` loads only when ▶ is tapped (via `useGuide().startPage(route)`, which lazy-imports the controller + content). Rationale for the header: already eager, always visible, one consistent place; conditional render = zero clutter on unguided pages; scales as pages are added (the button lights up when a route joins `PAGE_GUIDE_ROUTES`). The ▶ is **also** injected into the guide popover by `decoratePopover` (suppressed while a page guide is already running) so a learner mid-tour can drop into a page deep dive — but the header button is the primary, always-reachable entry.

**Why flagged:** this is the one genuine UX-taste call. Alternatives I considered and rejected for 3a: (a) a floating pill like the theater-mode exit (more chrome on every page); (b) a row in the Practice hub only (less discoverable, and Practice isn't where you are when you want help on *this* page); (c) popover-only (no way to start without first launching a tour). **Veto note:** if you'd rather a floating pill, or want it in the bottom-nav "More" drawer, or popover-only — say so and I'll swap the entry; nothing else in the design changes.

---

## 5. Content — the load-bearing quality rule

**Confident-wrong content is the worst failure mode for a learning tool** (the same principle behind the Cikgu confidence gate). The page guide *teaches*, so every line must be true to the live UI.

### 5.1 Content shape
```ts
type PageGuideStep = {
  selector: string        // a stable [data-guide="…"] (or reused [data-tour="…"]) anchor that EXISTS in the live page
  title: string           // the control's name, learner-facing
  body: string            // what it does (one or two plain sentences, jargon defined)
  example?: string        // a concrete, realistic use case ("paste a 120-word email → band + fixes")
  side?: 'top'|'bottom'|'left'|'right'   // driver placement hint
  align?: 'start'|'center'|'end'
  arrow?: 'from-box' | 'none'            // default 'from-box'; 'none' for a centered intro/outro step
}
export const PAGE_GUIDES: Record<string /* route */, PageGuideStep[]>
export function buildPageSteps(route: string): EngineStep[]  // stamps route=current, maps to {id,title,body,selector,side,align}
```

### 5.2 Authoring guardrails (HARD rules)
1. **Structure is hand-derived from live code — never AI.** Selectors, order, and arrow targets come from reading the actual page component. AI invents controls that don't exist.
2. **Anchors are added to the code, not guessed.** Where a control has no stable anchor, add `data-guide="{page}-{control}"` to the component in the same change. Anchor names are kebab-case and page-prefixed.
3. **Prose is hand-authored for the shipped pages.** AI may draft the *long tail* later, but **every line is rewritten to the app's voice and verified against the code before shipping** (re-confirm the button label, what it actually does, and that the example is real).
4. **Examples must be real and runnable in the UI** — no invented numbers/screens. If an exact example can't be verified, omit `example` rather than fabricate.
5. **Ships page-by-page.** A page is "done" only when its anchors exist, its prose is verified, and its e2e (first anchor resolves + ▶ → arrow → Next works) is green.

### 5.3 Validation (tests, §8)
- A unit test asserts: every `PAGE_GUIDES` step has a non-empty `title` + `body`; every `selector` is a syntactically valid, `data-`-style attribute selector; every route key ∈ the **reconciled** route list (§7).
- A per-page e2e asserts the **first** step's anchor actually resolves in the live page (catches a renamed/removed control) and that ▶ → arrow appears → Next advances.

---

## 6. Open decisions — RESOLVED (decide-and-flag)

1. **Which pages ship first?** **Decision:** Phase 3a = **Dashboard (`/`) → Study (`/study`) → Practice (`/practice`)** — the highest-traffic surfaces (home is unavoidable; Study is the core loop; Practice is the hub that opens everything else). Dashboard already exposes the `dashboard-cta` tour anchor to reuse; the rest of each page's controls still need `data-guide` anchors added (§5.2). Subsequent increments by value: Writing, PDF Reader, Roleplay, Grammar, then the long tail. **Veto note:** reorder freely — you know what you demo most; this only sets build order, not design.
2. **Auto-offer the page guide + persist a `guide.fullPageSeen` pref (STORE_VERSION bump)?** **Decision: NO for 3a.** The ▶ is purely user-initiated (no nag), so no "seen" state is needed — which keeps 3a a clean, **no-`STORE_VERSION`-bump** change (matches the Phase-2 in-session-only discipline and avoids a migration). Revisit an auto-offer + pref in a later increment if you want first-visit prompting. **Veto note:** if you want it to auto-offer once per page on first visit, that's a +1 increment with a `STORE_VERSION` bump + migration — say so and I'll fold it into the plan.
3. **AI for long-tail prose drafts?** **Decision:** hand-author the first 3 pages entirely (no AI). For the long tail later, AI may draft via the BYOK `instruct.js` router, but **never ships unreviewed** (guardrail §5.2). **Veto note:** fine as-is, or tell me to keep it 100% hand-authored forever.

---

## 7. Route reconcile (small, do-it-here)

`App.jsx` defines **21** routes; `tourSteps.APP_ROUTES` lists **19** (missing `/dictation`, `/cloze-listening`). Since `pageGuides.js` route keys must validate against the real routes, this phase either (a) extends `APP_ROUTES` to the full 21 and points the validator at it, or (b) introduces one shared `APP_ROUTES` source both consume. **Decision:** extend `APP_ROUTES` to 21 (smallest change; keeps the existing single list authoritative) and have `pageGuides`'s validator import it. Pure-data change, unit-tested. **Note:** `tourSteps.test.js` may assert `APP_ROUTES`'s contents/length — update that test in the same step (red→green) when extending the list.

---

## 8. Pointer geometry & the arrow

### 8.1 `pointerGeometry.js` (pure, unit-tested)
```
arrowPath(boxRect, targetRect, viewport) -> {
  start:  {x,y},      // a point on the box edge facing the target
  end:    {x,y},      // a point just outside the target edge facing the box
  path:   string,     // SVG path (a gentle quadratic curve start→end)
  headDeg: number,    // arrowhead rotation at `end`
  clamped: boolean,   // true if the target was off-screen and end was clamped to the viewport edge
}
```
- `boxRect`/`targetRect` are DOMRect-lite `{ left, top, width, height }` (serialisable — emitted through `guideState`).
- Chooses the box-edge anchor by direction (target above → start at box-top-centre, etc.), mirroring how `dragDock.snapRectForZone` switches by zone.
- Off-screen / scrolled-away target → clamp `end` to the viewport edge + set `clamped` (the arrow points "that way"; the engine's skip-missing handles truly-absent targets).
- Unit tests: target above / below / left / right of the box (correct start edge + head angle); off-screen target clamps; degenerate (overlapping rects) returns a safe short arrow.

### 8.2 `GuidePointer.jsx`
- A fixed full-viewport SVG (like `GuideDockZones`), `pointer-events:none`, `z-index` above the dark overlay.
- Draws `path` with a `stroke-dasharray` "draw-on" animation + an arrowhead `<polygon>` at `end` rotated `headDeg`.
- `prefers-reduced-motion: reduce` → no draw animation (render the full arrow immediately).
- Stroke colour from a token (e.g. `var(--color-accent)`), works light/dark.

### 8.3 Controller wiring
- `startPageGuide(route)`: `startTour(buildPageSteps(route), { tier: 'page', navigate, onEvent, getPath, prefersReducedMotion, onPopoverRender })`. All steps carry `route = current`, so `resolve()` never navigates.
- A page-guide step emits `pointer` rects: `box = popoverEl().getBoundingClientRect()` + `target = document.querySelector(step.selector)?.getBoundingClientRect()` → `setGuideState({ pointer: { box, target } })` (or `pointer: null` for an `arrow:'none'` step / a missing target).
- **Smooth-scroll timing (caught in review — driver sets `smoothScroll: true`):** the spotlighted element animates into view, so a rect captured at `onPopoverRender` time is **mid-scroll → the arrow points at the wrong spot**. Fix (3a, not deferred): (1) compute the rects on a `requestAnimationFrame` after land/render (one frame after layout settles), and (2) while a page step is active, **re-emit `pointer` on `scroll`/`resize`** (a throttled listener, torn down on step change/teardown) so the arrow tracks the element as it settles and as the user scrolls. This single mechanism covers both the initial smooth-scroll settle and ongoing tracking. (Guard all of this on a real DOM — the node-env controller tests have no `window`/`rAF`.)
- Clear `pointer` + remove the scroll/resize listener on teardown (extend the Phase-2 `resetGuideState` + the existing drag `cleanup` pattern).

---

## 9. Telemetry
Add `guide_page_started { tier:'page', route }` and reuse the existing `guide_step` / `guide_completed` / `guide_dismissed`. Route is not user content (privacy invariant holds — no card text, no PII).

---

## 10. Error handling & invariants
- **Never dead-end:** a missing anchor is skipped (engine reused); an off-screen target clamps the arrow; an empty `PAGE_GUIDES[route]` means the ▶ simply doesn't show.
- **Idempotency / teardown:** the ▶ injection is idempotent (guards like the pause/handle injectors); `pointer` is cleared on teardown; `GuidePointer` unmounts with the HUD.
- **Bundle:** `pageGuides.js`, `pointerGeometry.js`, `GuidePointer.jsx` live in the lazy guide chunk; the ONLY new eager byte is the tiny zero-import `PAGE_GUIDE_ROUTES` string list the header reads (mirrors the Phase-2 `guideState` seam). `GuideHud`'s eager cost stays ~null-when-idle (only the lazy branch grows). Per-page content is the main size driver — keep prose tight; if it grows, split `PAGE_GUIDES` per route into lazy sub-chunks.
- **a11y:** the ▶ entry + popover ▶ are ≥44px, labelled, keyboard-operable; step changes announce via `FeedbackLive`; the arrow is decorative (`aria-hidden`) since the popover copy carries the meaning.
- **Theming:** arrow + ▶ colours via `var(--color-*)`; verified dark + light.

## 11. Phasing & verification
- **Phase 3a (this plan):** engine wiring (`startPageGuide`, `pointer` state, `GuidePointer`, `pointerGeometry`), the ▶ entry point, route reconcile, and **content + anchors for Dashboard / Study / Practice**. Behind the green gate; README + the tour data note + `RESUME_HERE.md` updated in the same commits; Vercel READY confirmed.
- **Phase 3b+:** one increment per additional page (or small batch) — anchors + verified prose + a per-page e2e. Optional later: auto-offer + `guide.fullPageSeen` (STORE_VERSION bump), AI-accelerated long-tail drafts.

## 12. Test plan (red-proofed first)
- `pointerGeometry.test.js` (pure): arrow endpoints/head angle for target above/below/left/right; off-screen clamp; degenerate overlap.
- `pageGuides.test.js`: every step has non-empty title/body + valid selector syntax; route keys ⊆ reconciled `APP_ROUTES`; **`PAGE_GUIDE_ROUTES` (eager list) === `Object.keys(PAGE_GUIDES)`** (they can't drift); `buildPageSteps(route)` stamps the current route on every step + maps to the engine shape.
- `guideState`/`GuideHud` (extend): `pointer` set → `GuidePointer` renders; cleared → it unmounts.
- `guideController` (extend): `startPageGuide(route)` builds same-route steps (no navigate) + emits `pointer` on land; teardown clears `pointer`.
- e2e `tests/e2e/guide-full-page.spec.js`: on `/` (Dashboard), ▶ "Tour this page" → arrow appears pointing at the first control → Next advances → Pause/drag still work (no Phase 1/2 regression).

---

## 13. Decisions log (for the plan + veto)
| Decision | Choice | Veto cost |
|---|---|---|
| Entry point | ▶ in `Layout` header (when route has a guide) + ▶ in popover | swap placement — isolated change |
| First pages | Dashboard → Study → Practice | reorder — build-order only |
| Auto-offer + `fullPageSeen` pref | **No** in 3a (user-initiated, no STORE_VERSION bump) | +1 increment + migration if wanted |
| AI prose | Hand-author 3a; AI long-tail later, never unreviewed | keep 100% hand-authored if preferred |
| Route reconcile | Extend `APP_ROUTES` to 21 | — (clearly correct) |
| Arrow | Separate animated SVG in `GuideHud` (not driver's) | — (driver's is too small/static for "what it does") |
