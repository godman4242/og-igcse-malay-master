# Interactive user guide ("App tour") — Implementation plan (2026-06-10)

Spec: `docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md`.
TDD, **pure logic first**. Surgical diffs. **INTERACTIVE build** — run the app and screenshot
light+dark at 390×844 + desktop as you go (game-like UI needs a visual loop).
**Cut line (detachable):** Tasks 1–7 + the Quick-tour anchors ship a complete, replayable Quick
tour + first-run offer on their own. The **Full tour** (its extra steps + per-route anchors, Task 8b)
is the detachable tail if the session runs long.

Hook points (verified live 2026-06-10):
- `src/components/FirstRunCard.jsx` — existing Dashboard activation card; **do NOT modify** (it owns
  the first-study-session moment; the guide is separate). `first-run-tour.spec.js` must stay green.
- `src/pages/Settings.jsx:161` — render root; first card is Stats (~:174). GuideCard mounts BEFORE it.
- `src/store/useStore.js:36` (`STORE_VERSION = 25`), `:1681` (`migrate`), `:1998` (`_version` set).
- `src/components/Layout.jsx` — global toast mounts + bottom-nav + More drawer (data-tour anchors).
- `src/index.css` — `@theme` tokens + `.light` overrides (the `.guide-theme` block goes here).
- Telemetry: `trackEvent` (ids/indices only).

---

## Task 1 — `src/lib/guide/tourSteps.js` (data, pure, TDD)
**Test first** (`src/lib/guide/__tests__/tourSteps.test.js`): export `QUICK_TOUR`, `FULL_TOUR`,
`APP_ROUTES` (or import the route list). Assert: every step has non-empty `title` + `body`; every
step with no `selector` is intentional (modal intro/outro); every `route` is a real app route;
`FULL_TOUR` covers every primary route at least once; `QUICK_TOUR` ⊆ concepts of `FULL_TOUR`;
`QUICK_TOUR.length` is 6–8. **Then implement** the two arrays (Quick: dashboard intro → Start review
→ a study mode → streak pill → More drawer → Settings/replay → outro; Full: superset, one key control
per route in nav order).

## Task 2 — `src/lib/guide/waitForElement.js` (TDD)
**Test first**: `waitForElement(selector, { timeoutMs, now })` resolves with the node when present;
rejects/〔resolves null〕after timeout when absent (injected clock + a fake document/querySelector).
Decide resolve-null vs reject and pin it in the test (controller treats "not found" as skip).
**Then implement** (poll + MutationObserver, ≤3 s cap; cleanup on resolve).

## Task 3 — `src/lib/guide/guideController.js` (TDD, the heart)
**Test first** (`__tests__/guideController.test.js`) with a **stubbed driver factory + stubbed
navigate + stubbed waitForElement**: `startTour(steps,{navigate,driverFactory,waitFor,onEvent,now})`
- same-route next → `moveNext()` immediately, no navigate;
- cross-route next → calls `navigate(route)`, awaits `waitFor(selector)`, then `moveNext()`;
- `waitFor` miss → skips (advances past) without dead-ending;
- `destroy()` tears down the driver + any pending waits;
- starting a new tour while one is active destroys the first;
- `onEvent` fires `guide_started`/`guide_step`/`guide_completed`/`guide_dismissed` with `{tier,
  stepIndex}` only;
- `prefers-reduced-motion` (injected) → `animate:false` in the driver config.
**Then implement**, dynamic-importing `driver.js` inside `startTour` (lazy chunk). No `useStore`
import (controller is pure infra; the React layer passes `navigate`/`onEvent`).

## Task 4 — driver.js dep + theming
- `npm i driver.js` — **confirm the installed version is MIT** (check `node_modules/driver.js/
  package.json` license) before committing; if not MIT, STOP and flag.
- `.guide-theme` block in `src/index.css` mapping driver popover/overlay/buttons to `var(--color-*)`;
  verify it flips correctly under `.light`.

## Task 5 — store `guide` slice (TDD)
**Test first** (extend the store test): initial `guide:{seenQuick:false,seenFull:false}`;
`markGuideSeen('quick'|'full')` flips the right flag; **migration** from a v25 persisted blob yields
the slice with defaults and preserves all existing fields. **Then implement**: add slice + action,
bump `STORE_VERSION` 25→26, add the migrate case. (It rides the existing `pushStateBlob`; no new sync
event needed.)

## Task 6 — `src/components/GuideCard.jsx` + mount at top of Settings
Card titled "App guide", help line, two buttons "Quick tour (60 sec)" / "Full tour" → call a
`useGuide()` hook (thin React wrapper that supplies `navigate` via `useNavigate` and `onEvent` via
`trackEvent`, and calls `guideController.startTour`). Mount as the FIRST child in `Settings.jsx`
(after the toast, before Stats). `var(--color-*)`; both themes.

## Task 7 — `src/components/GuideOffer.jsx` first-run offer + Layout mount
Shows once when `!guide.seenQuick`, debounced ~2 s after mount (don't fight FirstRunCard); "Take the
tour" → start Quick; "Maybe later" → dismiss; BOTH call `markGuideSeen('quick')`. Mount in
`Layout.jsx` beside the other toasts. `aria-live`, keyboard-dismissible, no `Date.now()` in render.

## Task 8 — data-tour anchors
**8a (Quick, required):** add `data-tour` to the Quick targets — bottom-nav items, the Start-review/
study CTA, streak pill, More drawer, Settings entry. Pin exact selectors against the live DOM.
**8b (Full, DETACHABLE):** add one `data-tour` anchor per remaining route's key control + the Full
steps. Cut here if long — Quick ships complete without it.

## Task 9 — go-wild e2e + verification + ship
- `tests/e2e/user-guide.spec.js` (bindStore + live-`?t=` URL): Quick tour end-to-end across routes;
  Settings "App guide" is the FIRST card + both buttons start; first-run offer once-only (persists
  across reload); **GO WILD** — nav-away mid-step (clean destroy, no crash), theme-swap mid-tour,
  spam Next/Prev/Close, resize 390↔desktop, missing anchor skips, Quick→Full back-to-back, offline,
  reduced-motion, light+dark screenshots. `first-run-tour.spec.js` stays green.
- Gate: `npm run build` (eager `index` chunk byte-stable; new lazy guide + driver chunks small) ·
  `npm run lint` (0 new warnings) · `npm run test:run` · `npm run test:e2e` (SOLO/serial).

## Commit & ship
- Atomic commits per task (pre-commit gate runs build→test→lint; hook `git add -A` — keep the tree
  single-task before each commit, per the 2026-06-10 hook-trap lesson).
- Final commit refreshes `RESUME_HERE.md`. Repo auto-pushes; confirm PUBLIC `upg-…vercel.app` READY.
- Bounded self-review of the controller + Settings diff before the final commit; honest verdict.
- If a baseline moves (bundle size from the driver.js chunk), note it under a `BASELINE CHANGE` line
  so the quality-watch routine doesn't false-alarm.
