# Interactive in-app user guide ("App tour") — Design & Research (2026-06-10)

A game-style guided tour that **spotlights real UI elements and explains what each does**, so a
newcomer (Kheshav's teachers; first-time learners) can be handed the app cold and learn it by doing
— not by reading a manual. Two tiers (**Quick** for normal use, **Full** for power learners), both
**replayable from the top of Settings**, and the **Quick** tour auto-offered once to brand-new users.

Researched plan→research→implement per `docs/process/feature-development-methodology.md`; the engine
choice and its load-bearing API facts were verified against live docs (context7 `/websites/driverjs`,
2026-06-10). Companion plan: `docs/superpowers/plans/2026-06-10-interactive-user-guide.md`.

Approved live 2026-06-10 (Kheshav): design approved; first-run = auto-offer-once-skippable; build =
interactive next session.

---

## Problem + who it's for
The app has 19 routes and many modes (6 study modes, roleplay, Cikgu, comprehension, listening,
exam rehearsal, PDF reader, mistakes, word families, …). A newcomer can't discover that surface by
reading. The existing `FirstRunCard` (Dashboard activation card) nudges the *first study session*
but does NOT teach the app. Two audiences:
- **Normal user / a teacher being shown the app (primary):** wants the 60-second "what is this, how
  do I study, where's my streak" walkthrough — no reading.
- **Power learner (secondary):** wants to discover every feature to maximise the tool.

## Assumptions drafted up-front, then verified
1. **A lightweight, MIT, zero-dep library can spotlight arbitrary DOM elements with step popovers —
   VERIFIED.** driver.js (`/websites/driverjs`, context7 2026-06-10): vanilla JS, no dependencies,
   spotlight overlay + popover, programmatic `drive()/moveNext()/movePrevious()/destroy()/highlight()`.
   ~5 KB gz. **License must be confirmed MIT at install** (driver.js v1 is MIT; intro.js is
   AGPL/commercial and is therefore REJECTED — see options).
2. **A tour can cross SPA routes — VERIFIED, via the async-step pattern.** driver.js `onNextClick`
   overrides the default advance: a step can navigate (React Router) and then call `moveNext()` once
   the next target mounts. The "Async Tour" docs example confirms exactly this. → a route-aware
   controller (navigate → wait-for-element → highlight) is feasible without forking the library.
3. **Custom theming to match light/dark — VERIFIED.** `popoverClass` + the documented CSS variables
   let the popover/overlay be styled entirely with our `var(--color-*)` tokens; `animate:false`
   honours `prefers-reduced-motion`.
4. **No store secret risk; the only persisted state is two booleans** (seen-Quick, seen-Full). Safe
   in the Zustand store (it's progress, not a secret — unlike BYOK keys). Needs a STORE_VERSION bump.
5. **Resilience:** if a target element is missing (route changed, feature gated off, viewport hides
   it — e.g. the desktop-only Ollama card), the controller must **skip that step gracefully**, never
   dead-end. driver.js steps without an `element` render as a centered modal — usable as a fallback.

## Options considered

### Engine → **CHOSEN: driver.js (lazy-loaded)**
- **driver.js (CHOSEN).** MIT, ~5 KB, zero-dep, spotlight + popover, programmatic + async steps,
  themeable. Smallest footprint, exactly the "highlight the button" feel, framework-agnostic so it
  can't fight React 19. Lazy-loaded so it never enters the eager `index` chunk.
- **react-joyride (REJECTED).** MIT and popular, but larger, React-coupled, and heavier API; its
  beacon/spotlight model is more than we need. driver.js is leaner for the same outcome.
- **Shepherd.js (REJECTED).** Powerful but the biggest of the three (+ Floating-UI dep) — worst fit
  for the bundle budget.
- **intro.js (REJECTED — licensing).** Dual-licensed AGPLv3 / commercial. A free, publicly-deployed
  app must not take an AGPL runtime dep. Hard no.
- **Build from scratch (REJECTED).** A correct spotlight+overlay+focus-trap+positioning engine is
  weeks of work and a maintenance liability; driver.js is 5 KB and battle-tested.

### Tour interaction model → **CHOSEN: guided walkthrough (tour drives navigation), not "click-the-real-button-to-advance"**
- **Guided walkthrough (CHOSEN).** "Next" advances; the controller navigates between routes for the
  learner and spotlights each target. Robust across 19 routes, predictable, fully testable. The
  highlighted element stays visible so they *see* what it is.
- **Force-real-click (REJECTED as default).** Making the user click the actual highlighted control
  to advance is more "gamey" but fragile (every target must be reliably clickable + reachable on
  mobile, and a wrong click strands the tour). Kept as a possible per-step enhancement later
  (`disableActiveInteraction:false` already lets the real control work), not the v1 default.

### Tiers → **CHOSEN: Quick (~6–8 steps) + Full (~20+ steps), shared engine, shared step schema**
One step list per tour; each step tagged with a tier; the Full tour is a superset ordered by
the route nav. YAGNI: no per-feature mini-tours in v1 (a backlog idea).

### First-run behaviour → **CHOSEN: auto-offer Quick once, skippable (Kheshav sign-off)**
A non-blocking prompt on first visit ("New here? Take a 60-second tour" / "Maybe later"). Sets the
seen flag whether taken or dismissed, so it never nags. Always replayable in Settings.

### State storage → **CHOSEN: a small `guide` slice in the Zustand store (STORE_VERSION 25→26)**
`guide: { seenQuick: bool, seenFull: bool }` + actions `markGuideSeen(tier)`. Persisted, syncs
(harmless, even nice across devices). NOT localStorage — it's progress, not a secret, so it belongs
with the rest of the persisted prefs. Migration adds the slice with defaults.

---

## Chosen design (v1) + verified hook points
1. **`src/lib/guide/tourSteps.js` (data, pure).** Exports `QUICK_TOUR` and `FULL_TOUR` arrays. Each
   step: `{ route?: string, selector?: string, title, body, side?, align?, tier }`. No `selector`
   → a centered modal (intro/outro). Selectors target stable `data-tour="…"` anchors. Pure → unit-
   testable (every step has a title+body; every non-modal step has a selector; Full ⊇ Quick coverage).
2. **`src/lib/guide/guideController.js`.** Framework-agnostic wrapper that **dynamic-imports**
   `driver.js` (so it's a lazy chunk). Public API: `startTour(steps, { navigate, now, onEvent })`
   → returns a handle with `destroy()`. Internally:
   - builds driver steps; for each, `onNextClick`/`onPrevClick` check whether the *next* step's
     `route` differs from the current path; if so it calls the injected `navigate(route)`, **waits
     for the target selector to mount** (a `waitForElement(selector, timeoutMs)` helper: poll/
     MutationObserver, ~3 s cap), then `moveNext()`. Same-route steps advance immediately.
   - **missing element after timeout → skip the step** (advance again), never dead-end.
   - `prefers-reduced-motion` → `animate:false`. Theming via `popoverClass:'guide-theme'`.
   - emits telemetry via `onEvent` (`guide_started`/`guide_step`/`guide_completed`/`guide_dismissed`
     with `{tier, stepIndex}` — never any user content).
   - `now`/`navigate`/the driver factory are injected → pure-testable without a real browser.
3. **`src/lib/guide/waitForElement.js` (pure-ish, tested).** Resolves when `document.querySelector`
   finds the node, or rejects after a timeout. Isolated so the timing logic is unit-tested.
4. **Theming — `src/index.css`.** A `.guide-theme` block mapping driver's popover/overlay to
   `var(--color-card/-text/-accent/-border)`; works in `.light` automatically (tokens flip).
5. **`src/components/GuideCard.jsx` — mounted FIRST in Settings** (`Settings.jsx:163`, right after
   the `<h2>` / toast, **before** the Stats card). Title "App guide", one line of help, two buttons
   **"Quick tour (60 sec)"** and **"Full tour"**; starting a tour from here works from any device.
   The Quick tour's final step explicitly says "Replay this guide anytime from Settings → App guide."
6. **First-run offer — `src/components/GuideOffer.jsx`, mounted in `Layout.jsx`** beside the existing
   toasts. Shows once when `!guide.seenQuick` AND the user is past the very first paint (debounced ~2
   s so it doesn't fight FirstRunCard); "Take the tour" starts Quick, "Maybe later" dismisses; either
   sets `seenQuick`. `aria-live`, keyboard-dismissible, `var(--color-*)`.
7. **`data-tour` anchors.** Add to: bottom-nav items (Dashboard/Study/…/More) + the More-drawer items
   in `Layout.jsx`; the "Start review"/study CTA; the streak pill; the Settings entry; and, for the
   Full tour, one key control per route (Study mode picker, Roleplay start, Cikgu input, Comprehension
   passage, Listening play, Exam-rehearsal start, PDF import, Mistakes list, Word-families, Writing
   analyze, Saved-cloze, For-you). Anchors are additive (no behaviour change). Exact selectors pinned
   in the plan at build time against the live DOM.
8. **Store — `useStore.js`.** Add `guide:{seenQuick:false,seenFull:false}` to initial state +
   `markGuideSeen(tier)`; bump `STORE_VERSION` 25→26 with a migration case that adds the slice with
   defaults (preserve all existing fields). Wire `enqueue`/sync only if trivially free — otherwise the
   blob carries it (it's in-store, so `pushStateBlob` already includes it).

## Safety / quality bars
- **Bundle:** driver.js + step data load ONLY when a tour starts (dynamic import) → eager `index`
  chunk unchanged; the guide is its own small lazy chunk. Verify in the build output.
- **No paywall / free:** the guide is free for everyone; no gating, no account needed.
- **Both themes + responsive:** popover/overlay use `var(--color-*)`; tested light + dark at 390×844
  and a desktop width; the Full tour skips the desktop-only Ollama step on phones (missing-element
  skip path).
- **A11y:** keyboard control on (driver default), focus moves to the popover, `aria-live` on the
  first-run offer, `prefers-reduced-motion` disables animation.
- **Resilience (bounded, honest):** missing target → skip; tour never blocks the app; `destroy()` on
  unmount/route-away-not-driven-by-tour; starting a tour while one runs destroys the old first.
- **Purity (React 19):** no `Date.now()` in render; the controller takes `now`/`navigate` injected;
  no allocation in selectors (the `guide` slice is read with primitive selectors).
- **No secrets:** telemetry carries tier + step index only, never user content.

## Decision log
| # | Decision | Why / evidence | Confidence |
|---|---|---|---|
| G1 | **driver.js, lazy-loaded** | MIT, ~5 KB, zero-dep, spotlight + async steps (context7 `/websites/driverjs`, high) | High |
| G2 | **Reject intro.js** | AGPL/commercial dual license — unacceptable in a free deployed app (high) | High |
| G3 | **Guided walkthrough, tour drives navigation** | robust + testable across 19 routes vs fragile force-click (reasoning, med-high) | Med-High |
| G4 | **Route-aware via `onNextClick`→navigate→waitForElement→moveNext** | matches driver's documented async-tour pattern (high) | High |
| G5 | **Two tiers, Full ⊇ Quick, one schema** | covers both audiences with one engine; YAGNI on mini-tours | High |
| G6 | **Auto-offer Quick once + Settings replay (top)** | Kheshav sign-off 2026-06-10; hand-to-a-teacher use case | High |
| G7 | **`guide` slice in store, STORE_VERSION 25→26** | progress not secret; persisted+synced fine; standard migration | High |
| G8 | **Missing element → skip, never dead-end** | gated/responsive features (desktop-only Ollama) must not strand the tour | High |

## Open questions
None blocking. Two wording defaults stand unless vetoed at build review: the first-run offer copy
("New here? Take a 60-second tour" / "Maybe later") and the Settings card title ("App guide").

## Test plan
- **Unit (TDD, no browser):** `tourSteps` invariants (every step has title+body; non-modal steps have
  a selector; Full ⊇ Quick; routes are valid app routes); `waitForElement` (resolves on present node,
  rejects on timeout, injected clock); `guideController` step-flow with a **stubbed driver + stubbed
  navigate** — same-route advances immediately, cross-route calls navigate then waits then moveNext,
  missing element skips, destroy cleans up, switch event/telemetry payloads are ids/indices only.
- **e2e + GO WILD** (`[[feedback_go_wild_smoke_test]]`, bindStore + live-`?t=` URL per
  `[[project_e2e_config_invocation]]`): Quick tour runs end-to-end and navigates across routes;
  Settings "App guide" is the FIRST card and both buttons start their tour; first-run offer appears
  once then never again (seen flag persists across reload); **GO WILD** — start tour then click the
  bottom-nav away mid-step (controller destroys cleanly, no crash), theme-swap mid-tour, spam
  Next/Prev/Close, resize 390↔desktop mid-step, a deliberately-missing anchor skips, replay Quick then
  Full back-to-back, offline, `prefers-reduced-motion`, light + dark screenshots; existing
  `first-run-tour.spec.js` stays green (the FirstRunCard is untouched).
- **Gate:** `npm run build` (eager `index` chunk unchanged; new lazy guide chunk; driver.js chunk
  small) · `npm run lint` (0 new warnings) · `npm run test:run` · `npm run test:e2e` (serial).

---

## Paste-ready implementation kickoff (next session)
*(Lean per `[[reference_lean_kickoff_template]]`. Canonical copy — keep in sync with RESUME_HERE.md.)*

```text
Continue the IGCSE Malay Master app (React/Vite SPA). Implementation session — build the approved
interactive user guide ("App tour"). INTERACTIVE build: run the app and screenshot light+dark at
390x844 as you go (game-like UI needs a human/visual loop).

Read first: RESUME_HERE.md (top block),
docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md,
docs/superpowers/plans/2026-06-10-interactive-user-guide.md. Follow the memories the plan names.

Build in the plan's TDD order: pure units first (tourSteps, waitForElement, guideController with a
stubbed driver+navigate), then driver.js wiring, theming, GuideCard at the TOP of Settings, the
once-only first-run offer, and data-tour anchors. driver.js is lazy-loaded (never the eager chunk);
confirm it is MIT before adding the dep. Missing target → skip, never dead-end. STORE_VERSION 25→26
adds guide:{seenQuick,seenFull} with a migration.

Done means: build + lint + test:run + the new go-wild e2e green (show output); light AND dark
eyeballed at 390x844 + desktop; committed (gate runs the suite, repo auto-pushes); PUBLIC Vercel
(upg-…) READY; RESUME_HERE.md refreshed in the same commit. Decide the clear calls yourself; stop
only for product forks or destructive actions.
```

## Sources (graded)
- driver.js API — programmatic control, async/route steps, theming, config (context7
  `/websites/driverjs`, official docs mirror, **high**)
- Live hook points (read 2026-06-10): `src/components/FirstRunCard.jsx`, `src/pages/Settings.jsx:161`,
  `src/store/useStore.js:36,1681,1998` (STORE_VERSION + migrate), `src/components/Layout.jsx` nav
  (**high**)
