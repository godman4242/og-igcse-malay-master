# Friction #2 — "Add your own key" nudge — design

**Date:** 2026-05-31
**Branch:** `feat/friction-polish`
**Source:** friction plan `docs/superpowers/specs/2026-05-30-friction-convenience-plan.md` §2

## Problem

AI features are capped at 50 calls/day client-side (`getRemainingCalls()` in
`src/lib/ai.js`). When a student hits the cap — or AI is otherwise unavailable
(circuit breaker open, no server key, English roleplay) — they hit a dead end.
BYOK (shipped 2026-05-30) is the real answer: **paste a free OpenRouter key in
Settings and AI keeps going on your account.** But nothing points there. This
adds a one-line nudge from the dead-end to the key field.

## Decisions (locked with user)

- **Scope:** a single shared, reusable component, placed on every surface that
  surfaces an AI-unavailable dead-end. Today that is **Roleplay, CikguBot,
  Writing**. (Speaking's coach is already BYOK-gated → key-holders only, so a
  nudge is moot; Comprehension surfaces no unavailable state to attach to.)
- **Audience:** only users **without** their own key — gate on
  `!hasUserOpenRouterKey()`. A key-holder is never told to add a key they have.

## Component

`src/components/AddKeyNudge.jsx`

```
<AddKeyNudge surface="roleplay" message? />
```

- **Props:** `surface` (string, required — telemetry label); `message`
  (optional copy override).
- **Gate:** computes `show = shouldShowAddKeyNudge(true, hasUserOpenRouterKey())`
  (the pure helper below) and renders `null` when `!show` — i.e. hidden whenever
  the user already has a key. Single gate, no duplicated condition.
- **Render:** an inline, full-width tappable `<button>` (keyboard-focusable,
  ≥44px touch target) with a `KeyRound` icon, themed with `var(--color-*)`
  (orange accent, matching existing "AI unavailable" boxes). Default copy:
  *"Add your own free key to keep AI going →"*.
- **Action:** `navigate('/settings#byok')` + `trackEvent('add_key_nudge_clicked',
  { surface })`.
- **On mount:** `trackEvent('add_key_nudge_shown', { surface })` once (useEffect
  with an empty-dep guard), mirroring `FirstRunCard.jsx`.

### Pure decision helper (the TDD'd core)

`src/lib/addKeyNudge.js`

```js
// Show the BYOK nudge only when AI is unavailable AND the user has no key.
export function shouldShowAddKeyNudge(aiUnavailable, hasKey) {
  return Boolean(aiUnavailable) && !hasKey
}
```

Keeps the truth-table out of JSX and makes the one meaningful branch testable
without a DOM. The component calls
`shouldShowAddKeyNudge(true, hasUserOpenRouterKey())` (each surface only mounts
the component in an already-AI-unavailable branch, so `aiUnavailable` is `true`
at the call site; the helper still encodes both inputs for clarity + tests).

## Placements (one nudge per surface)

1. **Roleplay** (`src/pages/Roleplay.jsx`) — under the existing
   *"AI unavailable — using static roleplay mode"* banner. Because this branch
   means the daily quota is spent, pass the quota-specific copy:
   *"Out of AI for today — add your own free key to keep going →"*. Do **not**
   add it to each EN scenario card (avoids N copies; those keep their existing
   "Drill grammar instead →").
2. **CikguBot** (`src/pages/CikguBot.jsx`) — render above the composer when
   `getRemainingCalls() === 0` (cleaner than injecting into the chat-message
   stream). Default copy.
3. **Writing** (`src/pages/Writing.jsx` + `src/hooks/useWritingEvaluator.js`) —
   render under the `analyzeError` notice **only** when a new
   `aiGradeUnavailable` boolean is true (set in the AI-grade `catch`, reset on
   new analyze + reset). This keeps input-validation errors from showing a
   misleading "add a key" prompt. Default copy.

## Settings deep-link

`src/pages/Settings.jsx`:
- Add `id="byok"` to the BYOK field wrapper `<div>`.
- On mount / hash change, if `location.hash === '#byok'`, `scrollIntoView({
  behavior: 'smooth', block: 'center' })` the field and focus the key input.

## Copy

| Surface | Copy |
|---|---|
| Roleplay (quota spent) | Out of AI for today — add your own free key to keep going → |
| CikguBot, Writing (default) | Add your own free key to keep AI going → |

## Telemetry

- `add_key_nudge_shown` `{ surface }` — once per mount.
- `add_key_nudge_clicked` `{ surface }` — on tap.

Lets us measure conversion (shown → clicked) per surface, consistent with the
existing `*_shown` / `*_clicked` convention (`FirstRunCard`, `SpeakingProgress`).

## Testing

- **TDD (red→green):** `shouldShowAddKeyNudge` — `src/lib/__tests__/addKeyNudge.test.js`.
  Cases: unavailable+no-key → true; unavailable+has-key → false;
  available+no-key → false; falsy/edge inputs.
- **Verified, not unit-tested (repo convention — no `@testing-library/react`):**
  the `AddKeyNudge` component, the Settings anchor/scroll, and the Writing
  `aiGradeUnavailable` flag. Bar: `npm run build` clean, `npm run lint` 0 errors,
  and a manual smoke — toggle a key on/off (nudge hides when present), force
  `getRemainingCalls()===0` (nudge appears), tap → lands focused on the key
  field. Same bar friction #3 shipped at.

## Out of scope (noted, not built — YAGNI)

- A distinct "your key isn't working — check Settings →" message for key-holders
  whose own key fails (different flow).
- Suppressing the nudge when fully offline (adding a key can't help offline).
- The pre-existing bug that `getRemainingCalls()` gates BYOK key-holders at the
  50/day shared cap too (their own key has its own quota) — separate fix.
- Speaking / Comprehension placements (no AI dead-end surfaced today).

## Verification checklist

- [ ] `shouldShowAddKeyNudge` tests pass (red→green observed).
- [ ] `npm run test:run` all green (no regressions).
- [ ] `npm run lint` 0 errors.
- [ ] `npm run build` clean.
- [ ] Manual: nudge hidden with a key; shown without; deep-link focuses the field.
