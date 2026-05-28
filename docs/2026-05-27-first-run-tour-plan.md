# First-Run Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the First-Run Tour activation card on Dashboard — gated by FSRS `last_review`, branching on deck size, with telemetry — exactly as specified in `docs/2026-05-27-first-run-tour-design.md` (v3, commit `087a82d`).

**Architecture:** One eager-loaded React component `<FirstRunCard />` mounted at the first visible position in `Dashboard.jsx` (after `<Meta>`, above the existing guest "Save Progress" banner). Pure derived state via two Zustand selectors (`hasReviewed`, `deckCount`). No store API changes, no migrations, no new dependencies.

**Tech Stack:** React 19, Zustand 5 (existing store), React Router v7 (`useNavigate`), Tailwind CSS 4 (existing tokens), ts-fsrs (existing), Playwright (existing `tests/e2e/` harness from commit `7d719b6`).

---

## File structure

| File | Responsibility |
|------|---------------|
| `src/components/FirstRunCard.jsx` (NEW) | Self-contained activation card. Owns its selectors, branching logic, telemetry calls. ~80 lines. |
| `src/pages/Dashboard.jsx` (MOD) | One added import + one JSX line. No other changes. |
| `tests/e2e/first-run-tour.spec.js` (NEW) | 5 Playwright cases using the existing `bindStore` pattern from `mistake-promotion.spec.js`. |

No CSS file changes (uses existing `var(--color-*)` tokens). No new vitest file (the gate is a one-liner; e2e covers it). No store changes.

---

## Task 1 — Write the failing e2e spec (TDD baseline)

**Files:**
- Create: `tests/e2e/first-run-tour.spec.js`

- [ ] **Step 1.1: Create the spec file with all 5 cases**

Create `tests/e2e/first-run-tour.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Mirrors the bindStore pattern from mistake-promotion.spec.js (see
// CLAUDE.md "## E2E tests" for the Vite ?t= module-URL trap).
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

async function injectUnreviewedCard(page) {
  await page.evaluate(() => {
    window.__STORE.getState().addCard({
      m: 'sebab', e: 'reason', t: 'first-run-test',
    })
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('First-Run Tour — activation card on Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('Fresh empty-deck state shows empty-deck variant', async ({ page }) => {
    await expect(
      page.getByRole('region', { name: /welcome.*build your deck/i })
    ).toBeVisible()
    const cta = page.getByRole('button', { name: /add words/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/word-families$/)
  })

  test('Populated deck (never reviewed) shows study variant', async ({ page }) => {
    await injectUnreviewedCard(page)
    await expect(
      page.getByRole('region', { name: /your first session is ready/i })
    ).toBeVisible()
    const cta = page.getByRole('button', { name: /start studying/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/study$/)
  })

  test('Rating a card unmounts the card', async ({ page }) => {
    await injectUnreviewedCard(page)
    await expect(
      page.getByRole('region', { name: /your first session/i })
    ).toBeVisible()
    await page.evaluate(() => {
      // Rating.Good === 3 in ts-fsrs (verified via node REPL).
      window.__STORE.getState().reviewCardAction('sebab', 3)
    })
    await expect(
      page.getByRole('region', { name: /your first session/i })
    ).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: /welcome.*build/i })
    ).toHaveCount(0)
  })

  test('After activation, refresh keeps the card hidden', async ({ page }) => {
    await injectUnreviewedCard(page)
    await page.evaluate(() => {
      window.__STORE.getState().reviewCardAction('sebab', 3)
    })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(
      page.getByRole('region', { name: /your first session/i })
    ).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: /welcome.*build/i })
    ).toHaveCount(0)
  })

  test('Telemetry events fire with the right variant', async ({ page }) => {
    await injectUnreviewedCard(page)
    // Clear any pre-existing telemetry from the empty-mount window.
    await page.evaluate(() => localStorage.removeItem('igcse-malay-telemetry'))
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)
    await page.getByRole('button', { name: /start studying/i }).click()
    await page.waitForURL(/\/study/)

    const events = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('igcse-malay-telemetry') || '[]')
    })
    const shown = events.find(e =>
      e.event === 'first_run_card_shown' && e.payload?.variant === 'populated'
    )
    const clicked = events.find(e =>
      e.event === 'first_run_cta_clicked' && e.payload?.variant === 'populated'
    )
    expect(shown).toBeTruthy()
    expect(clicked).toBeTruthy()
  })
})
```

- [ ] **Step 1.2: Run the spec to confirm all 5 fail**

Run: `npm run test:e2e -- tests/e2e/first-run-tour.spec.js`

Expected: all 5 tests fail with locator-not-found errors (the `<FirstRunCard />` component doesn't exist yet, so neither variant renders).

- [ ] **Step 1.3: Commit**

```bash
git add tests/e2e/first-run-tour.spec.js
git commit -m "test(first-run-tour): failing e2e baseline (5 cases)

Spec at docs/2026-05-27-first-run-tour-plan.md task 1. Pins both
variants, activation unmount, persistence, and telemetry funnel.
Implementation follows in subsequent tasks."
```

The pre-commit hook (`.githooks/pre-commit`) does `git add -A` automatically. `git status` first to ensure no junk is staged.

---

## Task 2 — Build `FirstRunCard` + mount in Dashboard

**Files:**
- Create: `src/components/FirstRunCard.jsx`
- Modify: `src/pages/Dashboard.jsx` (one import, one JSX line)

- [ ] **Step 2.1: Create the component**

Create `src/components/FirstRunCard.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen } from 'lucide-react'
import useStore from '../store/useStore'

// First-Run Tour — single inline activation card on Dashboard.
// Design: docs/2026-05-27-first-run-tour-design.md (v3, commit 087a82d).
//
// Gate: shown until the user rates their first FSRS card. Pure derived
// state via Zustand selectors — no store API, no persisted flag, no
// STORE_VERSION bump.
//
// Variants:
//   - Populated deck (cards.length > 0): "Your first session is ready" → /study
//   - Empty deck    (cards.length === 0): "Welcome — let's build your deck" → /word-families
//
// Telemetry events are wired in Task 3.

export default function FirstRunCard() {
  const navigate = useNavigate()
  const hasReviewed = useStore(s =>
    (s.cards ?? []).some(c => c.last_review != null)
  )
  const deckCount = useStore(s => (s.cards ?? []).length)

  if (hasReviewed) return null

  const isPopulated = deckCount > 0
  const headlineId = 'first-run-card-headline'
  const headline = isPopulated
    ? 'Your first session is ready'
    : "Welcome — let's build your deck"
  const supporting = isPopulated
    ? 'A few cards · about 2 minutes'
    : 'Pick a topic to start learning Malay'
  const ctaLabel = isPopulated ? 'Start studying →' : 'Add words →'
  const ctaTarget = isPopulated ? '/study' : '/word-families'
  const Icon = isPopulated ? Sparkles : BookOpen

  const onClick = () => {
    navigate(ctaTarget)
  }

  return (
    <section
      role="region"
      aria-labelledby={headlineId}
      className="rounded-2xl p-5 shadow-md"
      style={{
        background: 'var(--color-card)',
        borderLeft: '4px solid var(--color-accent)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ background: 'rgba(124,58,237,0.12)' }}
          aria-hidden={true}
        >
          <Icon size={20} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id={headlineId}
            className="text-base font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            {headline}
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {supporting}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClick}
          className="text-sm font-bold px-4 py-2 rounded-full"
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2.2: Mount in Dashboard**

In `src/pages/Dashboard.jsx`, add the import near the existing component imports (around lines 1-15):

```jsx
import FirstRunCard from '../components/FirstRunCard'
```

Then locate the `return (` block at line 232 and insert `<FirstRunCard />` between `<Meta>` and the guest banner. The block should look like:

```jsx
return (
  <div className="space-y-4 animate-fadeUp">
    <Meta
      title="Dashboard | IGCSE Malay Master"
      description="Your personalized IGCSE Malay study hub. Track your streak, review flashcards, and prepare for exams."
    />

    <FirstRunCard />

    {/* Guest "Save Progress" banner — only shown when not signed in */}
    {!authUser && (
      <button
        onClick={showAuthModal}
        ...
```

The exact change is: add one blank line + `<FirstRunCard />` between the closing `/>` of `<Meta>` and the `{/* Guest "Save Progress" banner ... */}` comment on line 239.

- [ ] **Step 2.3: Run lint**

Run: `npm run lint`

Expected: 0 errors. The 3 pre-existing warnings in `RoleplayScorecard.jsx`, `Comprehension.jsx`, `Roleplay.jsx` should be unchanged.

If new errors appear (unused imports, missing deps, etc.), fix inline before proceeding.

- [ ] **Step 2.4: Run the e2e suite and confirm 4 of 5 pass**

Run: `npm run test:e2e -- tests/e2e/first-run-tour.spec.js`

Expected: 4 pass, 1 fail (the telemetry case fails because we haven't wired the events yet). Specifically:
- ✓ "Fresh empty-deck state shows empty-deck variant"
- ✓ "Populated deck (never reviewed) shows study variant"
- ✓ "Rating a card unmounts the card"
- ✓ "After activation, refresh keeps the card hidden"
- ✗ "Telemetry events fire with the right variant" (expected — no telemetry yet)

If any of the first 4 fail, debug before continuing. Most likely failure mode: selector mismatch — verify the heading text in the rendered card matches the regex (`/welcome.*build your deck/i`, `/your first session is ready/i`).

- [ ] **Step 2.5: Commit**

```bash
git status
# Verify only src/components/FirstRunCard.jsx (new) and src/pages/Dashboard.jsx (modified) are pending.
git add src/components/FirstRunCard.jsx src/pages/Dashboard.jsx
git commit -m "feat(first-run-tour): FirstRunCard component + Dashboard mount

Two variants: populated-deck (→ /study) and empty-deck (→ /word-families).
Gate: cards.some(c => c.last_review != null). Pure derived state, no
store API change. Mounted above the guest banner so activation precedes
conversion in the value-delivery sequence.

4/5 e2e cases pass; telemetry case waits on Task 3."
```

---

## Task 3 — Wire telemetry events

**Files:**
- Modify: `src/components/FirstRunCard.jsx`

- [ ] **Step 3.1: Add the telemetry import and effect**

Edit `src/components/FirstRunCard.jsx`. Add the `useEffect` import and `trackEvent` import at the top:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen } from 'lucide-react'
import useStore from '../store/useStore'
import { trackEvent } from '../lib/telemetry'
```

Inside the component, AFTER the `if (hasReviewed) return null` early-return guard and AFTER the `isPopulated` constant is computed, add:

```jsx
  const variant = isPopulated ? 'populated' : 'empty'

  useEffect(() => {
    trackEvent('first_run_card_shown', { variant })
    // Once per mount — matches spec §Telemetry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

Update the `onClick` handler to fire the click event BEFORE navigating:

```jsx
  const onClick = () => {
    trackEvent('first_run_cta_clicked', { variant })
    navigate(ctaTarget)
  }
```

**Why `useEffect([])` and not `useEffect([variant])`:** the spec is explicit — once per mount. The transient Pro-tier-sync flicker case (empty → populated) is documented as acceptable. If a future requirement needs per-variant accuracy, generalise then.

**Why `eslint-disable-next-line`:** the rule wants `variant` in the dep array, but the intent is exactly to fire once. The disable comment localises the exception so it doesn't poison the file.

- [ ] **Step 3.2: Run lint**

Run: `npm run lint`

Expected: 0 errors, 3 pre-existing warnings unchanged.

- [ ] **Step 3.3: Run e2e — all 5 should pass**

Run: `npm run test:e2e -- tests/e2e/first-run-tour.spec.js`

Expected: 5/5 pass.

If the telemetry case fails:
- Verify `trackEvent` writes synchronously to `localStorage` (confirmed at `src/lib/telemetry.js:25-40`).
- Verify `page.waitForURL(/\/study/)` resolves before the localStorage read (it should, because the click handler fires `trackEvent` synchronously BEFORE `navigate()`).
- Inspect the events: `await page.evaluate(() => localStorage.getItem('igcse-malay-telemetry'))` and print the raw string for debugging.

- [ ] **Step 3.4: Run the full e2e suite to confirm no regression**

Run: `npm run test:e2e`

Expected: 14/14 pass (the 9 prior cases + the 5 new ones).

- [ ] **Step 3.5: Commit**

```bash
git status
git add src/components/FirstRunCard.jsx
git commit -m "feat(first-run-tour): telemetry events for activation funnel

first_run_card_shown (once per mount) + first_run_cta_clicked (on
click, before navigate). Variant payload is 'empty' | 'populated'.
Wired through the existing trackEvent helper — dual-writes
localStorage + Supabase telemetry table for queryability.

All 5 first-run-tour e2e cases pass; full e2e suite 14/14."
```

---

## Task 4 — Final verification gates + RESUME_HERE refresh

**Files:**
- Modify: `RESUME_HERE.md` (new LATEST SESSION block on top)
- Create: `docs/sessions/2026-05-27-first-run-tour-session.md`

- [ ] **Step 4.1: Run the four commit-blocking gates from the spec**

Run each in order:

```bash
npm run lint        # 0 errors, 3 pre-existing warnings unchanged
npm run test:run    # 214/214 vitest pass
npm run test:e2e    # 14/14 Playwright pass
npm run build       # clean
```

Expected `index-*.js` bundle size after build: **≤ 412 KB raw / ≤ 133 KB gz** (the spec budgeted ~1 KB raw growth on top of the 409.13 KB / 131.37 KB baseline; widening to ~3 KB here to account for the two Lucide icons, `Sparkles` + `BookOpen`, which were not yet costed when the spec was written).

If the actual delta exceeds 3 KB raw: drop the empty-deck icon (`BookOpen`) — the empty-deck variant is the lower-traffic branch — and re-run the build. Both icons add visual polish but neither is load-bearing on functionality.

If any other gate fails, STOP and debug — do not commit until all four are green.

- [ ] **Step 4.2: Write the session note**

Create `docs/sessions/2026-05-27-first-run-tour-session.md`:

```markdown
# 2026-05-27 — First-Run Tour shipped

**One-line:** Inline activation card on Dashboard, gated by FSRS
`last_review`, branching empty-deck (→ /word-families) vs populated
(→ /study). Pure derived state, telemetry wired, 5 new e2e cases.

## Context

The 2026-05-27 e2e harness session locked the Playwright suite. With a
permanent test surface in place, the next priority from RESUME_HERE
was activation for new invitees. Brainstormed v1 → v2 → v3 spec at
`docs/2026-05-27-first-run-tour-design.md`, then implemented via the
plan at `docs/2026-05-27-first-run-tour-plan.md`.

## What shipped

1. `src/components/FirstRunCard.jsx` — ~90 lines. Two variants, two
   selectors (`hasReviewed`, `deckCount`), telemetry on mount + click.
   No `framer-motion`, no new dependencies, real `<button>`,
   `role="region"` + `aria-labelledby`.
2. `src/pages/Dashboard.jsx` — one import + one JSX line. Card
   mounted above the existing guest "Save Progress" banner so
   activation precedes conversion.
3. `tests/e2e/first-run-tour.spec.js` — 5 cases: empty-deck variant,
   populated-deck variant, rate-card unmount, persistence after
   refresh, telemetry-events-fire.

## Verification

- `npm run lint` — 0 errors, 3 pre-existing warnings.
- `npm run test:run` — 214/214 vitest pass.
- `npm run test:e2e` — 14/14 Playwright pass (9 prior + 5 new).
- `npm run build` — clean; `index-*.js` should be ≤410.5 KB raw.

## Design choices revisited at implementation time

(Fill in any divergences from the spec discovered during build.
If none, write: "Spec was complete; no divergences.")

## What's next

The two parked items in RESUME_HERE remain user-choose:
- **Nav restructure** — More-drawer → primary surfaces. Own brainstorm.
- **Full Walkthrough** — Settings button, re-callable tour. Own brainstorm.

And the P1 bug logged this session:
- **Settings sync loop** — `/settings` re-fires "syncing" indefinitely
  on logged-in users; mobile gets stuck. See
  `memory/project_bug_settings_sync_loop.md`.
```

If implementation revealed divergences, document them in the "Design choices revisited" section before committing. Otherwise write the literal "Spec was complete; no divergences." sentence.

- [ ] **Step 4.3: Refresh RESUME_HERE.md top**

Read the current top of `RESUME_HERE.md` to confirm structure, then insert a new LATEST SESSION block above the existing `(2026-05-27, e2e)` block. Use this template, filling in real numbers from Step 4.1:

```markdown
> ## 📌 LATEST SESSION (2026-05-27, First-Run Tour) — Activation card shipped
>
> **0 lint errors · 214/214 vitest pass · 14/14 Playwright pass ·
> build clean · `index-*.js` <FILL_IN_KB> KB / gz <FILL_IN_KB> KB
> (<FILL_IN_DELTA> vs prior `087a82d`).**
>
> ### Shipped
>
> 1. **`src/components/FirstRunCard.jsx`** — single inline activation
>    card on Dashboard. Two variants: populated-deck →
>    `Start studying →` → /study; empty-deck →
>    `Add words →` → /word-families. Gate is a pure Zustand selector
>    on `cards.some(c => c.last_review != null)` — no store API
>    change, no STORE_VERSION bump, no new persisted field.
> 2. **`Dashboard.jsx`** — card mounted above the existing guest
>    "Save Progress" banner. Activation precedes conversion; once the
>    user rates their first card, FirstRunCard unmounts and the
>    guest banner naturally becomes the next focal point.
> 3. **Telemetry** — `first_run_card_shown` (once per mount) +
>    `first_run_cta_clicked` (on click, before navigate). Variant
>    payload (`'empty' | 'populated'`) lets us measure both branches
>    of the funnel.
> 4. **`tests/e2e/first-run-tour.spec.js`** (5 cases) — both
>    variants visible + navigate, rate-card unmount, persistence
>    after refresh, telemetry events fire.
>
> ### What to look at next (user picks)
>
> - **Nav restructure** — More-drawer → primary surfaces. Has its
>   own parked task (task #11). Needs brainstorm + IA work.
> - **Full Walkthrough** — Settings button, re-callable spotlight
>   tour. Own brainstorm.
> - **P1 — Settings sync loop** — `/settings` re-fires "syncing"
>   indefinitely on logged-in users; mobile gets stuck. Logged in
>   memory (`project_bug_settings_sync_loop`).
>
> ### Read order for next session
>
> `docs/sessions/2026-05-27-first-run-tour-session.md` (this) →
> `docs/2026-05-27-first-run-tour-design.md` (v3 spec) →
> `docs/sessions/2026-05-27-e2e-harness-session.md` (prior) →
> rest of this file (historical archive).
```

- [ ] **Step 4.4: Commit the docs**

```bash
git status
git add docs/sessions/2026-05-27-first-run-tour-session.md RESUME_HERE.md
git commit -m "docs(first-run-tour): session note + RESUME_HERE refresh

Closes the First-Run Tour work. Spec → plan → 4 implementation
commits → docs. Activation funnel telemetry live."
```

- [ ] **Step 4.5: Verify auto-push landed**

```bash
git status
# Expected: "On branch main · Your branch is up to date with 'origin/main'"
git log --oneline -6
# Expected to show the 4 new commits (Task 1, 2, 3, 4) on top of 087a82d.
```

If `git status` reports "Your branch is ahead of 'origin/main' by N commits", the post-commit hook didn't auto-push — run `git push` manually.

---

## Spec-coverage check

| Spec requirement | Plan task |
|---|---|
| `FirstRunCard.jsx` component | Task 2.1 |
| `last_review != null` gate | Task 2.1 (selector) |
| Populated-deck variant + `/study` CTA | Task 2.1 (rendering branch) |
| Empty-deck variant + `/word-families` CTA | Task 2.1 (rendering branch) |
| Dashboard mount above guest banner | Task 2.2 |
| `role="region"` + `aria-labelledby` | Task 2.1 |
| Real `<button>` + `useNavigate` | Task 2.1 |
| 44×44 touch target | Task 2.1 (`minHeight: 44, minWidth: 44`) |
| Visual weight > guest banner | Task 2.1 (border-left accent, shadow-md) |
| Two Zustand selectors, no combined getter | Task 2.1 |
| No store change | Task 2 file list — only component + Dashboard touched |
| Telemetry events with variant payload | Task 3 |
| 5 e2e cases | Task 1 |
| Session note + RESUME_HERE refresh | Task 4.2, 4.3 |
| Verification gates (lint, vitest, e2e, build) | Task 4.1 |

All spec sections are mapped. No gaps.
