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

## Research basis (evidence → decision)

The user's thesis — "design it for ADHD/executive-function and it works better for
everyone" — is the **curb-cut effect**. The evidence below converges on *less,
clearer, single-action*, so accessibility here sharpens scope rather than
expanding it.

| Source | Principle | What it changed here |
|---|---|---|
| CAST **UDL Guidelines 3.0** (Jul 2024) — reduce barriers; *minimize threats & distractions*; support **executive function** | Remove dead-ends; lower perceived threat; supply the next strategy | The nudge IS executive-function scaffolding (gives the next action at the wall). Non-blaming tone; the word "free" removes the cost-threat. |
| **ADHD / neurodivergent UX** (cognitive-load reduction, consistency, **recognition over recall**, control over motion) | One clear path, fewer clicks, land them where they can act, honour motion prefs | One line + one primary action; deep-link cuts clicks; **focus the key input on arrival** (recognition, not search); scroll respects `prefers-reduced-motion`. |
| **NN/g** microcopy, error-message & CTA guidelines (human, concise, constructive, don't blame; scanning +58%; **CTA = verb + object**; match destination wording) | Scannable, action-led copy that reads as a path, not a scold | Copy rewritten verb+object and echoes the Settings field label ("…your own AI key") so it's recognised on landing. |

**Anti-overbuild guard (the same evidence):** no modal, multi-step onboarding,
animation flourish, dismiss-state, or A/B variants — every one of those *adds*
cognitive load. Telemetry is the only invisible-to-user addition; it tells us
whether the curb-cut converts.

Sources: [UDL Guidelines 3.0](https://udlguidelines.cast.org/more/about-guidelines-3-0/) ·
[UDL: minimize threats & distractions](https://udlguidelines.cast.org/engagement/interests-identities/biases-threats-distractions/) ·
[Neurodiversity & UX (S. Walter)](https://stephaniewalter.design/blog/neurodiversity-and-ux-essential-resources-for-cognitive-accessibility/) ·
[NN/g Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)

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
  ≥44px touch target) with a decorative `KeyRound` icon (`aria-hidden`), themed
  with `var(--color-*)` (orange accent, matching existing "AI unavailable"
  boxes). The label is a **verb + object** CTA that echoes the Settings field
  wording. Default copy: *"Add your own free key to keep AI going →"*.
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
- On mount / hash change, if `location.hash === '#byok'`: scroll the field into
  view (`block: 'center'`) and **move focus into the key `<input>`** (via a ref).
  Focus is the recognition cue — the native focus ring + cursor land the user
  exactly where they act, so **no separate decorative highlight is needed**
  (recognition-over-recall without extra motion).
- **Reduced motion:** scroll uses `behavior: 'smooth'` only when
  `matchMedia('(prefers-reduced-motion: reduce)')` does **not** match; otherwise
  `'auto'` (instant). Focus is unaffected.

## Copy

| Surface | Copy |
|---|---|
| Roleplay (quota spent) | Out of AI for today. **Add your own free key →** |
| CikguBot, Writing (default) | **Add your own free key to keep AI going →** |

Rationale: present tense, non-blaming, scannable; verb+object CTA ("Add … key");
"free" defuses the cost objection (UDL: minimize threats); the wording echoes the
Settings field label so it's recognised on arrival (recognition over recall).

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
  `getRemainingCalls()===0` (nudge appears), tap → Settings opens scrolled to the
  field **with the key input focused** (keyboard + cursor land there); confirm
  the dark + light themes; with OS "reduce motion" on, the scroll is instant.
  Same bar friction #3 shipped at.

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
- [ ] Manual: nudge hidden with a key; shown without; deep-link scrolls to AND
      focuses the key input; dark + light OK; reduced-motion → instant scroll.
