# AuthModal dialog semantics + Escape-to-close — design

**Date:** 2026-06-15 · **Loop cycle:** self-sourced (queue empty → GOAL-driven assessment)
**Axis:** 3 (UX & accessibility / low friction) · **Priority:** after correctness + pedagogy

## Problem (the evidenced gap)

`src/components/AuthModal.jsx` is a real full-screen overlay modal — the sign-in / "Save Your
Progress" dialog, shown whenever `auth.showModal` is true (`store.showAuthModal()`), on the FREE
account path. It renders a `fixed inset-0 z-50` backdrop (`AuthModal.jsx:50`) over a card
(`:55`). Unlike **every other overlay dialog in the app** it lacks dialog semantics:

| Dialog | role="dialog" | aria-modal | accessible name | Escape closes |
|---|---|---|---|---|
| SearchModal | ✓ | ✓ | ✓ | ✓ (useFocusTrap) |
| WordFamilyTree | ✓ | ✓ | ✓ | ✓ |
| SavedWordPopover | ✓ | — | ✓ | ✓ |
| GuideOffer | ✓ | — | ✓ | ✓ |
| PDFReader vision-consent | ✓ | ✓ | ✓ | n/a |
| **AuthModal** | **✗** | **✗** | **✗** | **✗** |

So a screen-reader user is not told a dialog opened (WCAG 4.1.2 Name, Role, Value), the page is
not marked inert for AT (the app's own `useFocusTrap.js:13` comment states `aria-modal="true"` is
how inertness is covered), and a keyboard user cannot dismiss with Escape (every sibling can — an
internal-consistency / WCAG 2.1.2-convention miss). The close `✕` button IS tab-reachable, so this
is not a hard keyboard trap, but it diverges from the established app pattern.

## Measurable Done (observable pass/fail)

1. When `auth.showModal` is true, the rendered dialog node exposes `role="dialog"`,
   `aria-modal="true"`, and an `aria-labelledby` that resolves to the visible heading.
2. Pressing **Escape** while open sets `auth.showModal` back to `false` (modal closes).
3. New unit tests in `src/components/__tests__/authModalA11y.test.js` assert (1) and (2) and were
   **RED before** the fix (no `role="dialog"`; Escape left `showModal` true).
4. Gate green: build + `test:run` + lint (0 errors, only the 3 known exhaustive-deps warnings).

## Plan (surgical diff to `AuthModal.jsx` only)

- Import `useEffect, useCallback`.
- Wrap the existing close logic in `handleClose` as a `useCallback` (deps: `[hideAuthModal]` —
  `setStatus`/`setErrorMsg` are stable useState setters) so the Escape effect can depend on it
  without a new exhaustive-deps warning. Mirrors GuideOffer's `dismiss` pattern.
- Add a `useEffect` **before** the early `return null` (React hook-order rule), guarded on the
  open condition, that registers `window.addEventListener('keydown', onKey)` where
  `onKey = e => e.key === 'Escape' && handleClose()` and cleans up on unmount — the exact idiom in
  `GuideOffer.jsx:36-40` / `WordFamilyTree.jsx:105-107`.
- On the inner card div (`:55`): add `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby="auth-modal-title"`.
- Add `id="auth-modal-title"` to both `<h2>` headings ("Save Your Progress" / "Check your inbox").
  Only one renders at a time (the `status === 'sent'` ternary), so the id is unique in the DOM at
  any moment; `aria-labelledby` resolves to whichever heading is present.

## Decide-and-flag

- **Decision:** match the GuideOffer/WordFamilyTree overlay pattern (role + aria-modal +
  aria-labelledby + Escape). **Why:** brings the sole non-conforming overlay dialog to parity.
- **Veto (add `useFocusTrap` + focus-return-to-trigger like SearchModal):** rejected — that's a
  deliberate SearchModal-only choice; `aria-modal="true"` is the app's documented inertness
  mechanism, and AuthModal (store-driven, no trigger ref) has no trigger element to return focus
  to. The existing `autoFocus` on the email input already moves focus into the dialog on open.
  Adding it would be scope creep beyond the established sibling pattern.

## What NOT to break

- No `STORE_VERSION` bump (no persisted-state change). No Supabase-schema / free-path change
  (improves the free auth path). No `instruct.js` touch. No feature deleted. No content authored
  (pure a11y markup — nothing to web-verify). The early `return null` guards
  (`!showModal` / `!SUPABASE_CONFIG.enabled`) and all auth logic stay byte-identical.
