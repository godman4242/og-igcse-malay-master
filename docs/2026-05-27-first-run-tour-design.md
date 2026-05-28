# First-Run Tour — Design Spec

**Author:** kheshav · **Date:** 2026-05-27 · **Status:** approved (v3 — final polish), pending plan

## TL;DR

A single inline card on the Dashboard, shown until the user rates their
first FSRS card. Branches on deck state: empty deck → **Add words to
your deck** CTA to `/word-families`; populated deck → **Start studying**
CTA to `/study`. Same component, derived from existing store state.
No identity prompts, no daily-goal setup, no multi-step walkthrough.
Activation only.

## Revision history

**v3 (this version) — final polish round.** Pinned the exact Dashboard
insertion point (after `<Meta>`, above the guest banner — reasoned
about activation-vs-conversion ordering). Added telemetry events
(`first_run_card_shown` / `first_run_cta_clicked`) plus an e2e case
that asserts they fire. Documented the Pro-tier new-device sync
transient as deliberately non-coupled to `sync.syncStatus` (the P1
sync-loop bug noted in memory makes coupling risky). Added a11y +
mobile touch-target notes, defended the "A few cards" vague copy
against the rejected smart-count branching, and described the
bilingual migration path.

**v2 — implementation grounding.** Switched gating from
`state !== 0 || reps > 0` to `last_review != null` (single FSRS
field, verified at `src/lib/fsrs.js`). Added empty-deck variant with
CTA to `/word-families` — v1's `/study` CTA was a dead-end on the
real initial `cards: []` state since the dictionary is NOT auto-
seeded. Replaced the proposed `getHasCompletedFirstReview` store
getter with a plain Zustand selector inside the component, keeping
the store API surface flat.

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
the Dashboard route above the existing streak / due-cards row. Branches
on deck size:

**Populated deck (`cards.length > 0`):**
```
┌──────────────────────────────────────────────┐
│  Your first session is ready                  │
│  A few cards · about 2 minutes                │
│                                               │
│                    [ Start studying → ]       │
└──────────────────────────────────────────────┘
```

**Empty deck (`cards.length === 0`):**
```
┌──────────────────────────────────────────────┐
│  Welcome — let's build your deck              │
│  Pick a topic to start learning Malay         │
│                                               │
│                    [ Add words → ]            │
└──────────────────────────────────────────────┘
```

The empty-deck CTA navigates to `/word-families` (curated topic-based
adds), which is more activating for a first-time user than `/import`
(paste/PDF — heavier, less guided).

- Reuses existing card visual vocabulary: `var(--color-card)`,
  `var(--color-accent)`, same border-radius and padding as the other
  dashboard cards.
- CTA pill matches the existing high-contrast button style (purple
  background, white text). Min `44 × 44 px` touch target for mobile
  per WCAG 2.5.5 — already standard in the existing pill style.
- Visually heavier than the guest "Save Progress" banner below it
  (larger padding, accent border) so the activation CTA wins the
  attention contest with the conversion CTA.
- Real `<button>` element wrapped with `useNavigate` (not a `<Link>`
  styled as button) for keyboard + screen-reader correctness.
- `role="region"` + `aria-labelledby` pointing at the `<h2>` headline.
  `region` is a landmark so screen-reader users can jump straight to
  the activation moment; the landmark disappears once activated.
- No `framer-motion`. The card sits inside the existing
  `.page-transition` wrapper from Phase 4, so it animates in for free
  on first dashboard mount. No extra animation work.
- `prefers-reduced-motion` already handled by the wrapper.

**Copy choice — "A few cards · about 2 minutes":** intentionally
vague-but-honest. First-time users will have a small deck (whatever
they added during their first `/word-families` visit, typically
1–10 cards), so the phrase is accurate without false precision.
Adding count branching ("5 cards" / "47 cards" / generic-fallback)
was considered and rejected — the failure modes of an inaccurate
exact count (200 cards via paste import, instantly demoralising) are
worse than the failure modes of vagueness for a single-digit deck.

## Gating logic

**Source of truth:** the FSRS `last_review` field. New cards from
`createNewCardState()` ship with `last_review: null` (verified at
`src/lib/fsrs.js:23`); after the first `reviewCard()`, it becomes an
ISO-string timestamp (`src/lib/fsrs.js:57,101`). Single field, single
semantic, no defensive AND-OR mixing.

**Pattern:** plain Zustand selector inside `FirstRunCard.jsx`, no new
store API surface. Returns a boolean → React re-renders the card only
when the boolean flips.

```jsx
const hasReviewed = useStore(s =>
  (s.cards ?? []).some(c => c.last_review != null)
)
const deckCount = useStore(s => (s.cards ?? []).length)
if (hasReviewed) return null
```

- The selector evaluates on every store update, but `.some()` is
  short-circuiting and runs against tiny boolean output — Zustand's
  default shallow-equality only re-renders the card when the boolean
  actually changes (i.e. once, on activation).
- `!= null` (loose) catches both `null` and `undefined`, so legacy
  cards from any pre-FSRS migration round-trip safely.
- Pure derived state — **no STORE_VERSION bump**, **no new persisted
  field**, **no new selector exposed on the store**.
- "User cleared localStorage and came back" re-enters activation
  mode. Intentional.

**Why two selectors instead of one combined:** they're independent
booleans; combining them into a getter that returns an object would
allocate a fresh object on every store change and break Zustand's
shallow-equality re-render gate (CLAUDE.md "Critical Zustand pattern"
forbids this). Two primitive selectors = two stable subscriptions.

**No hydration flicker.** Zustand `persist` + `localStorage` rehydrates
synchronously before first render (the store has no
`skipHydration: true` flag at `src/store/useStore.js:1527-1529`), so
returning users never see the card briefly flash.

In `Dashboard.jsx`, mounted at the **first visible position** — right after
the `<Meta>` element (which renders no DOM) and immediately above the
existing "Save Progress" guest banner at line 240:

```jsx
return (
  <div className="space-y-4 animate-fadeUp">
    <Meta title="Dashboard | IGCSE Malay Master" description="…" />

    <FirstRunCard />          {/* NEW — first visible element */}

    {!authUser && (           {/* existing guest banner unchanged */}
      <button onClick={showAuthModal}>…</button>
    )}
    {/* … rest of Dashboard … */}
  </div>
)
```

**Why above the guest banner:** the banner is a *conversion* CTA
(Sign up to save progress). FirstRunCard is an *activation* CTA (do
your first review). Activation precedes conversion in the value-
delivery sequence — a user who hasn't yet experienced one review has
no reason to convert. Once they activate, FirstRunCard unmounts and
the guest banner naturally becomes the next focal point. The two
never compete visually.

## Files

| File                                          | Change |
|-----------------------------------------------|--------|
| `src/components/FirstRunCard.jsx`             | NEW    |
| `src/pages/Dashboard.jsx`                     | MOD — mount card at top |
| `tests/e2e/first-run-tour.spec.js`            | NEW — Playwright spec |

**No store change.** The gate is a plain selector in the component,
not a new store action — keeping store API surface flat. No CSS file
changes (uses existing tokens). No new dependencies.

**No new vitest file.** The gate logic is a single-line `.some()`
predicate against an existing field; pinning it in isolation has no
real coverage value beyond what the e2e suite already gives. If a
future change generalises the gate (e.g. "show again after 30 days
of inactivity"), that's the moment to add a leaf module + vitest.

## Tests

### Playwright (`tests/e2e/first-run-tour.spec.js`)

5 cases, mirrors the structure of `mistake-promotion.spec.js`:

1. **Fresh empty-deck state → empty-deck variant visible.** Clear
   localStorage, reload `/`, expect heading "Welcome — let's build
   your deck" and CTA "Add words". Click CTA → assert URL ends in
   `/word-families`.
2. **Populated deck, never reviewed → study variant visible.** Inject
   one unreviewed card via the store's `addCard` action, reload,
   expect heading "Your first session is ready" and CTA
   "Start studying". Click CTA → assert URL ends in `/study`.
3. **Rate a card → card unmounts.** Use the `bindStore` pattern from
   the existing suite to invoke
   `useStore.getState().reviewCardAction(malayWord, Rating.Good)`
   directly. Assert the FirstRunCard region disappears within the
   default timeout.
4. **After activation, refresh → still hidden.** Persistence test —
   ensures the gate stays correct after Zustand rehydration on
   reload.
5. **Telemetry events fire.** After case 2 (populated variant shown
   + CTA clicked), read
   `localStorage.getItem('igcse-malay-telemetry')`, parse JSON, and
   assert it contains a `first_run_card_shown` event with
   `variant: 'populated'` AND a `first_run_cta_clicked` event with
   the same variant. This pins the activation-funnel signal so the
   metric doesn't silently break.

`reviewCardAction(malay, rating)` is at `src/store/useStore.js:909`.
`Rating` is re-exported via the fsrs module.

## Edge cases handled

- **Empty deck.** `cards.length === 0` → empty-deck variant of the
  card shows, CTA → `/word-families`. This avoids the v1 dead-end
  where the CTA pointed at `/study` on an empty deck.
- **Cleared localStorage.** Re-activates the card. Intentional.
- **Pre-FSRS-migration cards.** `last_review` is set by
  `migrateFromSM2` at `src/lib/fsrs.js:57` (uses `card.lastReview`
  if present, else `now`), so migrated cards correctly show as
  reviewed.
- **Cards added but never reviewed.** Populated-deck variant shows;
  CTA → `/study`. `/study` opens the FSRS queue which includes new
  cards.
- **Pro-tier new-device sync (acceptable transient flicker).** A
  signed-in user landing on a fresh device sees local `cards: []`
  for the brief window before Supabase sync delivers their cloud
  cards. During that window the empty-deck variant shows; once sync
  resolves with `cards: [...]` and `last_review` populated, the card
  either flips to populated-variant or unmounts. Deliberately NOT
  coupled to `sync.syncStatus` — the related P1 sync-loop bug
  (`project_bug_settings_sync_loop` memory) signals the sync layer
  is fragile, and adding load-bearing dependencies on it would risk
  the FirstRunCard hanging forever. CSS opacity transition (via
  `.page-transition`) softens any flip.
- **Walkthrough re-trigger (future).** Out of scope here. When the
  Settings "Walkthrough" button ships, it will be its own surface,
  not a re-mount of this card.

## Telemetry

Two events, fired through the existing `trackEvent` helper from
`src/lib/telemetry.js`:

| Event                    | Payload                              | When |
|--------------------------|--------------------------------------|------|
| `first_run_card_shown`   | `{ variant: 'empty' \| 'populated' }` | Once per mount (use a `useEffect` with `[]` deps inside `FirstRunCard`) |
| `first_run_cta_clicked`  | `{ variant: 'empty' \| 'populated' }` | On CTA click, before `navigate(...)` |

These let us measure the activation funnel — show-rate, click-rate,
and conversion to first review — without coupling the component to
any new analytics provider. The existing `trackEvent` dual-writes
localStorage + Supabase telemetry table, so the data is queryable.

## Internationalisation

English-only at launch. When the dashboard chrome gets a bilingual
toggle (no current spec, but anticipated), the migration path is
straightforward: extract the four copy strings (two headlines, two
supporting lines, two CTAs) into a small `firstRunCardCopy.js` map
keyed by `lang`, and pull the active language from the existing
`prefs.lang` field if it gets added — same pattern as the bilingual
roleplay/speaking/grammar surfaces use today.

## Out of scope (for this spec)

Each item below is a candidate for its own future spec:

- Identity / ideal-self prompt capture during onboarding.
- Daily-goal setup step.
- Exam-date setup step.
- Welcome modal for returning users after a long break.
- Multi-language activation copy.

## Verification gates (commit-blocking)

1. `npm run lint` — 0 errors, 3 pre-existing warnings unchanged.
2. `npm run test:run` — 214/214 vitest pass (no new unit tests in
   this spec; coverage delegated to e2e).
3. `npm run test:e2e` — 9 + 5 new Playwright cases pass (target: 14).
4. `npm run build` — clean. `index-*.js` bundle should grow by no
   more than ~1 KB raw (`FirstRunCard.jsx` is eager-loaded inside
   Dashboard.jsx, which is itself the only eager route).

## Estimated effort

~1 hr end-to-end, including writing the implementation plan.
v2's "no store change, no vitest file" simplifications shaved ~30
minutes off the v1 estimate.
