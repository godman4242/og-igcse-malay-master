# First-Run Tour — Design Spec

**Author:** kheshav · **Date:** 2026-05-27 · **Status:** approved, pending plan

## TL;DR

A single inline card on the Dashboard, shown until the user rates their
first FSRS card, with one CTA: **Start studying →** to `/study`.
No identity prompts, no daily-goal setup, no multi-step walkthrough.
Activation only.

## Goal

Get new invitees from "I just signed up" to "I just rated my first
card" in one tap. Everything else (identity, daily goal, language
toggle, exam date) is intentionally deferred — it's already reachable
from Settings and can be discovered organically once the user is past
the activation threshold.

## Non-goals

- Blocking modal, spotlight overlay, multi-step tour.
- Identity / daily-goal / exam-date capture inside this card.
- Bilingual copy (the dashboard chrome is English-only today;
  matching that).
- Dismiss `X`. The CTA *is* the dismissal.

## Surface

A single React component, `<FirstRunCard />`, mounted at the **top** of
the Dashboard route above the existing streak / due-cards row.

```
┌──────────────────────────────────────────────┐
│  Your first session is ready                  │
│  Rate 5 cards · about 2 minutes               │
│                                               │
│                    [ Start studying → ]       │
└──────────────────────────────────────────────┘
[ existing Dashboard content unchanged below ]
```

- Reuses existing card visual vocabulary: `var(--color-card)`,
  `var(--color-accent)`, same border-radius and padding as the other
  dashboard cards.
- CTA pill matches the existing high-contrast button style (purple
  background, white text).
- No `framer-motion`. The card sits inside the existing
  `.page-transition` wrapper from Phase 4, so it animates in for free
  on first dashboard mount. No extra animation work.
- `prefers-reduced-motion` already handled by the wrapper.

## Gating logic

A new selector exposed on the store:

```js
getHasCompletedFirstReview: () => {
  const cards = get().cards || []
  // FSRS state: 0 = New (never reviewed). reps > 0 = at least one rating.
  return cards.some(c => (c.state !== undefined && c.state !== 0) || (c.reps && c.reps > 0))
}
```

- Pure derived state — **no STORE_VERSION bump**, **no new persisted
  field**.
- Same logic naturally handles "user cleared localStorage and came
  back" — they re-enter activation mode, which is the right behaviour.
- The check `(c.state !== undefined && c.state !== 0)` is defensive
  against any legacy cards that pre-date FSRS migration.

In `FirstRunCard.jsx`:

```jsx
const getHasCompletedFirstReview = useStore(s => s.getHasCompletedFirstReview)
const hasReviewed = getHasCompletedFirstReview()
if (hasReviewed) return null
```

(Per CLAUDE.md "Critical Zustand pattern" — extract getter ref, call
in component body. No infinite loops.)

In `Dashboard.jsx`, mounted once at the top:

```jsx
<FirstRunCard />
{/* existing dashboard content unchanged */}
```

## Files

| File                                          | Change |
|-----------------------------------------------|--------|
| `src/components/FirstRunCard.jsx`             | NEW    |
| `src/store/useStore.js`                       | MOD — add `getHasCompletedFirstReview` |
| `src/pages/Dashboard.jsx`                     | MOD — mount card at top |
| `src/lib/__tests__/firstRun.test.js`          | NEW — vitest pin for the gate logic |
| `tests/e2e/first-run-tour.spec.js`            | NEW — Playwright spec |

No CSS file changes (uses existing tokens). No new dependencies.

## Tests

### Vitest (`firstRun.test.js`)

Pure-leaf test against the selector contract:

1. Empty `cards: []` → `false`.
2. All cards with `state: 0` and `reps: 0` → `false`.
3. One card with `state: 1` (Learning) → `true`.
4. One card with `reps: 1` and `state: 0` → `true` (defensive
   coverage).
5. Mix of new + reviewed → `true`.

The selector is exposed via a tiny pure helper that takes a cards
array, so we can pin it without spinning up the full store.

### Playwright (`tests/e2e/first-run-tour.spec.js`)

3 cases, mirrors the structure of `mistake-promotion.spec.js`:

1. **Fresh state → card visible.** Clear localStorage, reload, expect
   `getByRole('region', { name: /your first session/i })` (or
   equivalent stable selector) to be visible on `/`.
2. **Rate a card → card unmounts.** Use the same `bindStore` pattern
   to invoke `useStore.getState().rateCard(...)` directly (skips the
   UI dance). Assert the card disappears.
3. **After activation, refresh → still hidden.** Persistence test —
   ensures the gate stays correct after Zustand rehydration.

## Edge cases handled

- **Empty deck.** If `cards.length === 0`, `some()` returns `false`
  → card is shown. CTA still goes to `/study`. `/study` itself
  handles the empty-deck state (already implemented, shows "Add
  words" CTA).
- **Cleared localStorage.** Re-activates the card. Intentional.
- **Pre-FSRS-migration cards** (if any persist). Defensive `state
  !== undefined` guard means we never falsely flag them as "new".

## Out of scope (for this spec)

Each item below is a candidate for its own future spec:

- Identity / ideal-self prompt capture during onboarding.
- Daily-goal setup step.
- Exam-date setup step.
- Welcome modal for returning users after a long break.
- Multi-language activation copy.

## Verification gates (commit-blocking)

1. `npm run lint` — 0 errors, 3 pre-existing warnings unchanged.
2. `npm run test:run` — 214 + 5 new vitest cases pass (target: 219).
3. `npm run test:e2e` — 9 + 3 new Playwright cases pass (target: 12).
4. `npm run build` — clean. `index-*.js` bundle should grow by no
   more than ~1 KB raw (`FirstRunCard.jsx` is eager-loaded inside
   Dashboard.jsx, which is itself the only eager route).

## Estimated effort

~1.5 hrs end-to-end, including writing the implementation plan.
