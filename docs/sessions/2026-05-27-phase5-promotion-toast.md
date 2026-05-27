# 2026-05-27 — Session: Phase 5 (Tight Feedback Loops) — visible mistake → FSRS promotion

Closes Phase 5 of the Zero-Waste Cognitive Engine plan in `CLAUDE.md`.
The wiring from `addMistake` → `promoteMistakeToCard` → "Mistakes" deck
already worked but was silent. This session makes the promotion moment
*visible* — turning the spaced-rep architecture from invisible to
dopaminergic.

## Diagnosis

`src/store/useStore.js` already auto-promotes vocab/imbuhan mistakes
(Malay-only, severity ≥ med) into the FSRS "Mistakes" deck with
`promotedCardId` set on the mistake record. Two pre-existing UX surfaces
acknowledged the *logging* event:

- `MistakeToast` ("Saved to Mistakes" — purple, bottom-centre) on every
  `addMistake` call.
- Mistakes badge on the More-drawer + `/mistakes` route.

Neither surface celebrated the *promotion* event. The user could
inadvertently grind through Writing/Roleplay/Comprehension generating
mistakes that silently filled their FSRS queue — no visual feedback to
close the loop.

## Fix

### `addMistake` now returns the promoted card

```js
// src/store/useStore.js
addMistake: (mistake) => {
  // ... existing logic, plus:
  return { added, bumped, promotedCard };
}
```

`promotedCard` is the full FSRS card object (with `m`, `e`, `t: 'Mistakes'`)
when auto-promotion fires, or `null` otherwise. Resolved from
`get().cards.find(c => c.m === cardKey)` after `promoteMistakeToCard`'s
synchronous `set()` has flushed.

Back-compat: all six existing callers (RoleplayScorecard, useInterleavedSession,
Comprehension, Listening, Speaking, plus internal logMistakeBatch) ignored
the return value previously, so changing from `undefined` → object is safe.

### New `<MistakePromotedToast />`

`src/components/MistakePromotedToast.jsx` — mounted once in `Layout.jsx`
beside the existing `MistakeToast`. Detection via Set-diff on
`mistakes.filter(m => m.promotedCardId).map(m => m.id)` (vs. count + max
timestamp). The Set-diff approach gives the *exact* mistake that was just
promoted regardless of when it was originally logged — important because
manual promotion via Dashboard/MistakeJournal buttons can promote a
much-older mistake.

Visual contract:
- Position: bottom-right (16 px from edge; bottom 88 normal / 16 theater
  mode). Bottom-centre is taken by the logging toast — they coexist when
  one `addMistake` call fires both events.
- Palette: emerald gradient `rgba(16,185,129,0.97) → rgba(5,150,105,0.97)`.
  Signals "leveled up / added to deck" vs. the purple "saved for review"
  of the logging toast.
- Icon: `Layers` (lucide, deck metaphor) overlaid with a tiny `Sparkles`
  (celebration accent).
- Copy: "Added to your review deck" uppercase eyebrow → bold word →
  italic gloss. `+N` aggregation badge when multiple promotions land in
  the same 3.4 s window (e.g. `logMistakeBatch`).
- CTA: "Open deck" → `/study`.
- Auto-dismiss after 3.2 s with a 220 ms exit transition.
- Honours `prefers-reduced-motion` (kills translate, keeps opacity).
- Honours `theaterMode` (raises to 16 px when bottom nav is hidden).
- `role="status"` + `aria-live="polite"` for screen readers; `lang` attr
  on the word span.

### Why a global Layout-level toast vs. per-caller wiring

The spec called for wiring into three surfaces (Writing, Roleplay,
Comprehension). But `addMistake` is actually called from six places —
also Listening, Speaking, and `useInterleavedSession`. Mounting one
component in `Layout` that subscribes to the store delta is DRY across
all six (and any future caller) and removes the risk of forgetting a
surface. The new `addMistake` return value is still useful for explicit
trigger / test scenarios.

## Files changed

| File | Change |
|---|---|
| `src/store/useStore.js` | `addMistake` returns `{ added, bumped, promotedCard }`; resolves the promoted card object from the store after `promoteMistakeToCard` runs. |
| `src/components/MistakePromotedToast.jsx` | New. Detects promotion deltas via Set-diff and renders the emerald floating pill. ~165 lines. |
| `src/components/Layout.jsx` | Import + mount `<MistakePromotedToast />` adjacent to `<MistakeToast />`. |

## Verification

- `npm run lint` → 0 errors, 3 pre-existing warnings (unchanged from
  `12e9a84`).
- `npm run test:run` → **214/214 pass** in 629 ms.
- `npm run build` → clean. `index-*.js` 409.02 KB / 131.34 KB gz (was
  405.36 / 130.48 — net **+3.66 KB raw / +0.86 KB gz** for the new
  Layout-eager component, well inside budget). PWA precaches 78 entries.
- Manual code-walk:
  - Hydration guard: first effect run initialises `prevIds` from
    persisted state — does NOT pop a toast for previously-promoted
    mistakes on app load.
  - Re-render loops: Zustand selector returns `s.mistakes` (stable ref);
    `useMemo([mistakes])` rebuilds the snapshot only on store change;
    `prevIds.current` updates before the `newlyPromoted === []` early
    return so the `mounted` dep re-run is a no-op.
  - No allocation inside the Zustand selector (per CLAUDE.md
    performance-pitfall §1).

Live verification deferred — manual browser test recommended on the next
Writing/Roleplay/Comprehension session.

## State at end of session

- Working copy and `origin/main` in sync at the commit produced by this
  session (post-commit hook auto-pushes).
- All four Zero-Waste master-plan phases shipped or complete:
  1. **Architectural Detox** — done (custom hooks extracted).
  2. **Interleaved Practice** — done (`useInterleavedSession`).
  3. **Adaptive Scaffolding** — done (writing-feedback-v2 + roleplay
     adapt, learnerProfile).
  4. **Frictionless UX & Deep Work** — partially done (Theater Mode
     shipped; framer-motion page transitions still open per RESUME_HERE).
  5. **Tight Feedback Loops** — done **this session**.

## Open threads

- **Phase 4 polish** — `framer-motion` page transitions still on the
  punted list (`AnimatePresence` route wrap, subtle fade/slide).
- **B (Row 7 cosmetic gap)** — unchanged; punted.
- **D (Playwright auto-tester)** — unchanged; punted.
- **Doc drift** — CLAUDE.md claims `STORE_VERSION = 12`; reality on
  `main` is `20`. Not touched this session (per project memory: known
  drift, don't waste a turn investigating).
