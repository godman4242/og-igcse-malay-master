# 2026-05-27 — First-Run Tour shipped

**One-line:** Inline activation card on Dashboard, gated by FSRS
`last_review`, branching empty-deck (→ `/word-families`) vs populated
(→ `/study`). Pure derived state, telemetry wired, 5 new e2e cases.

## Context

The 2026-05-27 e2e harness session locked the Playwright suite. With
a permanent test surface in place, the next priority from
`RESUME_HERE` was activation for new invitees. Brainstormed v1 → v2
→ v3 spec at `docs/2026-05-27-first-run-tour-design.md`, then
implementation plan at `docs/2026-05-27-first-run-tour-plan.md`
(commit `228dde1`). This session executed the plan via
subagent-driven-development with two-stage review per task (spec
compliance, then code quality) plus an independent code-reviewer
sweep on the full diff before final commits.

## What shipped

1. **`src/components/FirstRunCard.jsx`** (NEW, ~100 lines) — two
   variants:
   - **Populated deck** (`cards.length > 0`): "Your first session is
     ready" → `/study`, Sparkles icon.
   - **Empty deck** (`cards.length === 0`): "Welcome — let's build
     your deck" → `/word-families`, BookOpen icon.

   Gate is a pure Zustand selector on
   `cards.some(c => c.last_review != null)` — no store API change,
   no `STORE_VERSION` bump, no persisted flag, no new dependency.
   `role="region"` + `aria-labelledby` on the headline, real
   `<button>` with `useNavigate`, 44×44 touch target. No
   `framer-motion`.

2. **`src/pages/Dashboard.jsx`** — one import + one JSX line. Card
   mounted between `<Meta>` and the existing guest "Save Progress"
   banner. Activation precedes conversion in the value-delivery
   sequence — once the user rates their first card, the card
   unmounts and the guest banner naturally becomes the next focal
   point.

3. **Telemetry** — `first_run_card_shown` (once per mount) +
   `first_run_cta_clicked` (on click, before navigate). Variant
   payload (`'empty' | 'populated'`) lets us measure both branches
   of the funnel. Wired through the existing `trackEvent` helper at
   `src/lib/telemetry.js` (dual-writes localStorage + Supabase for
   queryability).

4. **`tests/e2e/first-run-tour.spec.js`** (5 cases) — empty-deck
   variant + nav, populated variant + nav, rate-card unmount,
   persistence after refresh, telemetry events fire.

5. **Visual verification** — manual Playwright screenshot capture
   at iPhone viewport (390×844) confirms both variants render
   correctly with the accent border, sit above the guest banner,
   and unmount cleanly after rating. Artifacts under
   `docs/sessions/screenshots/2026-05-27-first-run-tour/`.

## Commit chain

```
67c8d56 docs(first-run-tour): session note + RESUME_HERE refresh
7555dde feat(first-run-tour): telemetry events for activation funnel
e006d6f fix(first-run-tour): use --color-dim token for supporting text
97c46b7 feat(first-run-tour): FirstRunCard component + Dashboard mount
b1d4753 test(first-run-tour): failing e2e baseline (5 cases)
228dde1 docs(first-run-tour): implementation plan (PRIOR)
```

## Verification

- `npm run lint` — 0 errors, 3 pre-existing warnings unchanged
  (`RoleplayScorecard.jsx`, `Comprehension.jsx`, `Roleplay.jsx`).
- `npm run test:run` — 214/214 vitest pass.
- `npm run test:e2e` — 14/14 Playwright pass (9 prior + 5 new).
- `npm run build` — clean. `index-*.js` = **410.65 KB raw /
  131.74 KB gz** (Δ **+1.52 KB raw / +0.38 KB gz** vs `228dde1`'s
  409.13 KB / 131.36 KB baseline). The +1.52 KB raw lands well
  inside the plan's ≤3 KB budget and is dominated by the
  `BookOpen` + `Sparkles` Lucide icons + tree-shaken `useEffect`
  helper.

## Design choices revisited at implementation time

**Plan divergence 1 — `--color-dim` instead of `--color-text-muted`
(commit `e006d6f`).** The plan's verbatim code used
`var(--color-text-muted)` for the supporting line. That token does
not exist in `src/index.css`; the codebase convention is
`var(--color-dim)` (defined in each theme block). Without the fix
the supporting line would render at full text colour in all themes.
Caught by the code-quality reviewer for Task 2.

**Plan divergence 2 — `useEffect` placement (commit `7555dde`).** The
plan placed the telemetry `useEffect` AFTER the
`if (hasReviewed) return null` early-return. ESLint's
`react-hooks/rules-of-hooks` flags this as a hook called
conditionally — the implementer's first pass added an
`// eslint-disable-next-line react-hooks/rules-of-hooks` to silence
it, but disabling that rule is masking a real correctness concern
(hooks must be called in the same order on every render). The
landed fix moves `useEffect` BEFORE the early-return with an
internal `if (hasReviewed) return` guard inside the effect,
preserving "once per mount, only fires when the card actually
renders" semantics without disabling the safety rule. Functionally
equivalent; lint-clean without exceptions.

No other divergences from the spec.

## Independent code review notes

The independent reviewer pass on the full diff vs `228dde1`
surfaced three "Important" findings, all triaged as non-blocking:

1. **`first_run_card_shown` fires on every Dashboard remount, not
   once per session.** The behaviour matches the spec verbatim
   ("Once per mount, use a useEffect with `[]` deps") but the
   funnel metric will count navigation bounces as additional
   impressions. Dedup can be done in the SQL query downstream by
   `DISTINCT ON user_id`. The spec author chose per-mount
   semantics deliberately; not a bug, just a measurement
   characteristic to know about when reading the funnel.

2. **`event` (localStorage key) vs `event_type` (Supabase column)
   divergence in `src/lib/telemetry.js`.** Pre-existing concern in
   the telemetry helper; not introduced by this feature. FirstRunCard
   is the first consumer to make "data is queryable" a load-bearing
   claim. Worth a separate audit of the Supabase `telemetry_events`
   schema vs what the client writes — filed as a follow-up, not
   gating this PR.

3. **Zustand persist debounce vs `page.reload()` in e2e test 4.**
   Zustand v5's default debounce is 0 ms (synchronous flush), so
   the existing test pattern is safe today. If the project ever
   tunes the persist config to debounce writes, test 4 could
   become flaky silently. Theoretical risk; no action.

Plus three nits (semantic naming on `first_run_card_shown`,
redundant `role="region"` on `<section>`, `localStorage.removeItem`
inside test 5 rather than `resetState`). All left as-is — they
either match the spec verbatim or are sub-threshold.

## What's next

The two parked items from `RESUME_HERE` remain user-choose:

- **Nav restructure** — More-drawer → primary surfaces. Own
  brainstorm + IA work.
- **Full Walkthrough** — Settings button, re-callable spotlight
  tour. Own brainstorm.

And the P1 bug logged at the start of this session:

- **Settings sync loop** — `/settings` re-fires "syncing"
  indefinitely on logged-in users; mobile gets stuck. Recorded in
  `memory/project_bug_settings_sync_loop.md`.

Follow-ups surfaced by the independent reviewer this session:

- Audit Supabase `telemetry_events` schema vs `trackEvent`
  client-side payload (`event` vs `event_type` divergence).
- Decide whether to keep per-mount fire semantics or dedupe at
  collection (sessionStorage sentinel / module-level flag) for the
  activation funnel.
