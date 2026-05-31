# Friction #1 — Practice hub — design

**Date:** 2026-05-31
**Branch:** `feat/friction-polish`
**Source:** friction plan `docs/superpowers/specs/2026-05-30-friction-convenience-plan.md` §1 (option b)

## Problem

The bottom nav has 4 primary tabs (Home, Study, Grammar, Roleplay) + a **More**
*drawer* hiding 11 destinations — 7 of them core learning surfaces (Speaking,
Writing, Comprehension, Listening, Cikgu Maya, Word Families, Exam Rehearsal). A
student may never discover Speaking or Comprehension. A transient overlay drawer
is cramped, must be dismissed, and isn't a real destination.

## Decisions (locked with user)

- **Form:** Option A — the 5th nav slot becomes **"Practice"** and navigates to a
  real `/practice` **page** (not a drawer). The 4 primary tabs are unchanged;
  "More" is not a learning surface, so nothing becomes unreachable — the drawer's
  contents move onto the page, more visible than before.
- **Organization:** grouped by exam skill (chunking aids scanning) — headings:
  **Speaking, Writing, Reading & Listening, Grammar & Vocab, Review, Tools.**
- **Tiles:** launcher tiles with a few **cheap, already-computed status cues**
  (Study "N due", Mistakes "N to fix", Exam "N% ready"). No new heavy calc; most
  tiles are icon+label only — restraint is the point.
- **Preserve:** the unreviewed-mistake badge currently on the "More" tab moves to
  the new "Practice" tab (no silent regression).

## Why a page beats the drawer (research)

Same evidence base as friction #2 (UDL 3.0 / ADHD-UX / NN-g): a calm, scannable,
**persistent** page with real chunked headings reduces cognitive load and visual
search vs. a floating overlay the user must manage. Progress visibility on a few
tiles supports motivation (UDL engagement) without clutter.

## Surface map (every current destination appears exactly once)

| Group | Tiles |
|---|---|
| Speaking | Roleplay, Speaking, Cikgu Maya |
| Writing | Writing, Mistakes *(badge: N to fix)* |
| Reading & Listening | Comprehension, Listening, PDF Reader |
| Grammar & Vocab | Grammar, Word Families |
| Review | Study *(N due)*, Exam Rehearsal *(N% ready)* |
| Tools | Import Text, Settings |

This covers all of today's `NAV` (Study, Grammar, Roleplay) **and** `MORE_ITEMS`
(Exam Rehearsal, Cikgu, Comprehension, Listening, Writing, Speaking, Import, PDF
Reader, Word Families, Mistakes, Settings). Home/Dashboard stays a primary tab and
is intentionally NOT duplicated here (it's not a "practice" surface).

## Architecture

### Pure config — `src/lib/practiceSurfaces.js`
Exported `PRACTICE_GROUPS`: an array of `{ heading, items: [{ path, label, icon,
status? }] }`. `status` (optional) is a key naming which cheap cue to attach:
`'due' | 'mistakes' | 'readiness'`. Pure data → unit-testable.

Also export `allPracticePaths()` → flat list of paths, for the guard test.

### Page — `src/pages/Practice.jsx` (lazy-loaded in `App.jsx`)
- Maps `PRACTICE_GROUPS` → semantic sections (`<h2>` heading + a list of tile
  `<button>`s). Each tile: icon (`aria-hidden`) + label; if `status` is set,
  append the live value to the visible tile AND the accessible name
  (e.g. "Study, 3 due").
- **Status sourcing (cheap, already computed elsewhere):**
  - `due` → due-card count (same source the Dashboard uses).
  - `mistakes` → `mistakes.filter(m => !m.reviewed).length` (as in `Layout`).
  - `readiness` → `getExamReadiness()`.
- **Critical Zustand pattern (from CLAUDE.md):** store getters
  (`getExamReadiness`, `getStudyPlan`, …) return new objects each call — extract
  the getter via `useStore(s => s.getX)` and CALL it in the component body; never
  inside a selector. Use primitive/`useMemo` selectors for counts. Avoids the
  infinite-render loop.
- Telemetry: `trackEvent('practice_hub_opened')` once per mount;
  `trackEvent('practice_tile_clicked', { surface })` on tap.
- Tap → `navigate(path)`.

### Nav — `src/components/Layout.jsx`
- Replace the 5th nav button (the "More" toggle) with a **"Practice"** tab
  (`LayoutGrid` icon) that `navigate('/practice')`. Active when
  `location.pathname === '/practice'`.
- Move the unreviewed-mistake badge onto the Practice tab.
- **Remove** the More drawer: `moreOpen` state, the outside-click effect for it,
  the `MORE_ITEMS` constant, and the drawer JSX. Keep everything else (search,
  account menu, sync pill, theater mode, Escape handler — drop only the
  `setMoreOpen(false)` line).
- `isMoreActive` logic is removed (the page has its own active state).

### Route — `src/App.jsx`
Add `const Practice = lazy(() => import('./pages/Practice'))` and a `/practice`
`<Route>` inside the existing `<Layout><Suspense>` wrapper. No eager import.

## Testing

- **TDD (red→green):** `src/lib/__tests__/practiceSurfaces.test.js`
  - every path in the old `NAV`(minus Home) + `MORE_ITEMS` appears in
    `PRACTICE_GROUPS` exactly once (the "nothing gets lost" guard);
  - no duplicate paths; every item has `path`, `label`, `icon`;
  - only the allowed `status` keys are used.
- **e2e smoke** (`tests/e2e/practice-hub.spec.js`): `/practice` renders all
  group headings and every tile; tapping a tile navigates to its route; the
  "Practice" tab is reachable from the bottom nav. Screenshot dark.
- **Verified, not unit-tested** (repo convention — no `@testing-library/react`):
  the page render + Layout edit, via `npm run build`/`lint` + the e2e smoke +
  a manual glance (dark + light; the 3 status numbers look right).

## Out of scope (noted — YAGNI)

- Per-tile status beyond the 3 cheap cues (e.g. Speaking "last band", Writing
  "last band") — add later only if a number is already free.
- Reordering tiles by telemetry/popularity (revisit once `practice_tile_clicked`
  data exists).
- Context-aware primary tabs (friction plan option a) — a different, riskier idea.
- Localising nav/hub labels (the whole nav chrome is English today).

## Verification checklist

- [ ] `practiceSurfaces` tests pass (red→green observed); nothing-lost guard green.
- [ ] `npm run test:run` all green (no regressions).
- [ ] `npm run lint` 0 errors; `npm run build` clean (Practice is its own lazy chunk).
- [ ] e2e: `/practice` shows all surfaces; tile click navigates; tab works.
- [ ] Manual: no infinite-render warning; mistake badge on Practice tab; dark+light OK.
