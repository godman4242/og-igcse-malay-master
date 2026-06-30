# Guide popover redesign — research-grounded, learning-science-aligned (2026-06-30)

**Decision owner:** Kheshav (chose a *fuller* redesign over a quick polish, asked it be
research-grounded — not from memory — and aligned to our learning-science criteria, with
measurable goals). Driven by Opus 4.8 + grounded research (see "Model question" below for why
not GLM).

**Scope guard (the one push-back, accepted):** "fuller redesign" = a bold *visual + structural
reskin*, NOT a feature rebuild. The popover carries load-bearing machinery (drag-to-dock/minimize,
pause/resume pill, progress dots↔bar + jump-to-step, ▶ "go deeper", keyboard nav, theater mode,
empty-state safety). All of it is **preserved** — see the Feature Contract. The redesign is
overwhelmingly **CSS + the existing `onPopoverRender` decoration layer** (`popoverDecorations.js`),
which is what makes a bespoke look low-risk (driver.js exposes `.driver-popover-*` hooks + a render
hook — no fork).

---

## Why this matters more here than for a generic SaaS tour

The two research streams converged on one load-bearing point: **for a learning app, "appealing" and
"effective" mostly MERGE.** The choices that lower cognitive load — fewer controls, calmer motion,
honest progress, generous spacing — are *also* the ones that read as premium. So this isn't a
beauty-vs-function trade; it's mostly the same direction. The only genuine tension is motion, cleanly
resolved by `prefers-reduced-motion`.

For our ADD-first / UDL audience the stakes are higher: the tour is itself a learning object, so
Mayer's **coherence** (cut clutter) and **signaling** (one clear focus) aren't aesthetic preferences —
they're working-memory management for the exact users we optimize for. A cluttered popover measurably
taxes them.

---

## Research basis (full briefs archived in chat 2026-06-30)

- **Visual/UX + learning science** — W3C-WAI (ARIA/WCAG), Nielsen Norman Group (motion timing), CAST
  (UDL), Mayer (multimedia learning), + corroborating design-system/practitioner sources (driver.js
  theming, Adobe Spectrum coach-mark, Carbon, UXPin, Userpilot, Duolingo teardowns). Key pins used
  below: NNG 200–300ms substantial-change motion / ease-out-in; UXPin 16px padding, 12–14px body,
  200–320px width; Mayer segmentation/signaling/coherence; WCAG 1.4.3 (4.5:1 text) / 1.4.11 (3:1
  non-text) / 2.5.5 (44px); W3C APG Dialog (not Tooltip) pattern; goal-gradient (Userpilot/UX Bulletin).
- **Model "taste" question** — GLM-5.2 verified (real, Zhipu flagship, June 2026, ~3–10× cheaper,
  #1 Design Arena / #2 Code-Arena-Frontend). See "Model question".

---

## Design thesis (frontend-design): the "calm coach-card"

One idea per card, generous breathing room, a **single** accent moment (the way forward + the
spotlight), honest progress. Spend the whole "premium budget" on **type, spacing, and one elevation** —
never ornament. Restraint *is* the premium signal here, and it's the pedagogically correct one.

**Signature element (the one memorable thing, and it fixes the empty box):** replace the full-width
faint grip-bar (`.guide-drag-handle`, today's "empty box") with a small **centered grabber pill** at
the top edge — the iOS-sheet-style affordance that says "drag me" in a universally-understood, premium,
minimal way. The **entire title row** becomes the drag region; the grabber is the only grip mark. This
kills the empty box, consolidates the drag affordance, and declutters the header in one move.

---

## Token system (derived from the app's existing `@theme`; no new palette invented)

Grounded in live tokens (dark / light): `--color-card` #181838 / #f0f0f5 · `--color-card2` #1e1e40 /
#e8e8f0 · `--color-border` #2a2a50 / #d0d0e0 · `--color-text` #e8e8f0 / #1a1a2e · `--color-dim`
#8f8fb3 / #62627e · `--color-accent` #ff4d6d / #c9184a · `--color-on-bright` #000 / #fff.

- **Color:** card surface + 1px border + ONE shadow; accent reserved for the primary action + the
  spotlight arrow only. (No second accent, no gradient border — coherence.)
- **Type:** title 17px / weight 700 (down from a heavy 800), letter-spacing −0.01em; body 14px /
  line-height 1.55 `--color-dim` (already 5.50:1 ✓); a utility 11px for any meta.
- **Layout:** max-width 320px, internal padding 16–18px, radius 16px (match the app's card radius —
  do not invent a new one).
- **Implementation note (light-mode trap):** driver.js mounts the popover under `<body>`, OUTSIDE
  the `.light` subtree, so it does NOT inherit `.light` overrides — the controller injects the token
  vars inline via `onPopoverRender`. **Any token used in popover CSS must be in that injection list.**
  `--color-on-bright` must be added there for the contrast fix below to resolve in light mode.

---

## Measurable goals (binary pass/fail — these ARE the definition of done)

| # | Goal | Measure |
|---|---|---|
| G1 | No empty/unstyled element in the header | 0 full-width faint bars; grabber pill is intentional |
| G2 | Header decluttered | ≤ 2 visible header affordances (grabber + ×); ▶ moved to footer |
| G3 | Primary button passes contrast in BOTH themes | `--color-on-bright` on accent ≥ 4.5:1 (dark ~6.4:1, light ~6.2:1) — replaces failing `#fff` (~2.3:1 dark) |
| G4 | All controls meet target size | footer buttons + dots + ▶ + close ≥ 44×44px (today footer = 32px) |
| G5 | Motion polished + safe | enter 200ms ease-out, exit 150ms ease-in, spotlight ≤300ms; `prefers-reduced-motion` → opacity-only crossfade, no spotlight glide |
| G6 | Text legible | title/body contrast ≥ 4.5:1 both themes (audit, fix any miss) |
| G7 | Copy: one idea/step | ≤ 14 words/body across ALL routes (finish rollout); lead with action/benefit |
| G8 | Zero feature regressions | every item in the Feature Contract still works; all `guide-*` e2e green |
| G9 | (Stretch) Dialog a11y | `role="dialog"` + `aria-labelledby` title; focus enters on open, returns on close; Escape dismisses |

---

## The redesign, by area (each tied to a research rec + today's baseline)

1. **Header / empty box (G1, G2).** Remove `.guide-drag-handle` full-width bar → centered grabber
   pill (~32×4px, `--color-border`, hover brightens). Whole title row draggable (`onDragStart` rebinds
   to the title row). Move `.guide-go-deeper` (▶) out of the header into the footer as a labelled
   **"Go deeper →"** action (text+icon, accent-subtle), shown only when `canGoDeeper`. Close × stays
   top-right. → *Mayer coherence; Duolingo/Spectrum restraint; rec "≤2 header affordances".*
2. **Primary button contrast (G3).** `.driver-popover-next-btn` `color:#fff` → `var(--color-on-bright)`;
   add `--color-on-bright` to the controller's injected-vars list. → *WCAG 1.4.3 + CLAUDE.md P2-U1 rule.*
3. **Tap targets (G4).** Footer buttons `min-height:32px` → `44px` (keep compact horizontal padding so
   the row still fits 390px). → *WCAG 2.5.5 + repo's own ≥44px invariant.*
4. **Type & spacing (G6).** Title 16→17px / 800→700; keep body 14px/1.55; one refined shadow
   (soften 0 12px 40px /.45 toward a tighter, less heavy elevation). → *UXPin specs; premium-via-restraint.*
5. **Motion (G5).** Add the timing/easing above; gate every transform/slide behind
   `prefers-reduced-motion: reduce` → opacity crossfade only. → *NNG; WCAG 2.3.3; Motion.dev.*
6. **Progress (keep).** Keep dots ≤7 / slim bar >7 + jump-to-step (research validates this exact
   pattern). **Deliberately KEEP dots-only-visible (no "3 of 7" number)** — the research's "always show
   the count" advice is overridden by our UDL/ADD decision; the count stays in the `aria-label` for
   screen readers (honest, non-daunting). Front-load nothing dishonestly (our metacognition rule).
7. **Content (G7).** Finish the micro-guide rollout to the 13 un-migrated routes (this is the bulk of
   the "too many words" complaint — the wordy dashboard tour Kheshav saw is un-migrated). Apply Mayer
   coherence/signaling/segmentation consistently; lead with the action/benefit verb.
8. **Dialog a11y (G9, stretch).** Verify/убавь the driver.js defaults: `role="dialog"` +
   `aria-labelledby`, move focus into the popover on open, return to the trigger on close, Escape
   dismisses. Phase 3 — only if it doesn't fight driver.js's own focus handling.

---

## Phased implementation plan (each phase = its own gate-green commit[s])

- **Phase 0 — Freeze fix.** ✅ SHIPPED 2026-06-30 (`a0ee69d`): paused-overlay pointer-events leak.
- **Phase 1 — Correctness (no taste debate, ship first).** G3 (contrast) + G4 (44px targets) + G6
  audit. Low-risk CSS; extend `a11y-tap-targets` / add a contrast assertion. *~Small.*
- **Phase 2 — Visual reskin (the redesign).** G1 + G2 (grabber pill, header declutter, ▶→footer) +
  G4 type/spacing/shadow + G5 motion. The "fuller redesign" pass. Update `popoverDecorations.js`
  (move ▶, grabber) + the `guide-theme` CSS; pin in `popoverDecorations.test.js` + a `guide-*` e2e.
  *~Medium.*
- **Phase 3 — Dialog a11y (G9, stretch).** Only if clean against driver.js. *~Small–Medium.*
- **Phase 4 — Content (G7).** Finish micro-guide rollout to the 13 remaining routes (continues the
  existing rollout: `/dictation` next), Mayer pass. *~Medium, route-per-commit.*

Order rationale: Phase 1 fixes real defects with zero subjectivity (ship immediately). Phase 2 is the
visual redesign Kheshav asked for, isolated so its taste iterations don't block the correctness wins.
Phase 4 (content) runs in parallel as the already-in-flight rollout.

---

## Feature Contract — MUST still work after every phase (G8)

drag-to-dock + minimize-to-edge; pause/resume + the "Resume tour" pill; progress dots (≤7) ↔ bar (>7)
with tap-to-jump; ▶ "go deeper" (now in footer); keyboard nav (roving + Enter/Escape); theater mode on
gated pages; empty-state safety (centered `arrow:'none'` cards never skip-hang); route-aware
skip-never-dead-end controller; the just-shipped paused-overlay click-through. Proof = all `guide-*`
e2e green each phase.

---

## Model question (GLM-5.2 vs Opus 4.8) — resolved

**Verdict: stay on Opus 4.8 + grounded research; do NOT stand up GLM-5.2 as a "taste" model for this.**
GLM-5.2 is real and strong (cheaper, tops *aggregate blind* leaderboards), but a tour popover is a
**small, bespoke, design-sensitive** component — the category where head-to-head reviews give Opus 4.8
the *better* visual judgment (GLM reads "clean but generic/template-style"), and GLM's real edges (cost,
high-volume scaffolding) don't apply to one component. Decisive point: **taste is mostly process-bound,
not model-bound** — the leverage is reference exemplars + a design-system constraint set + iterate/
critique (exactly this spec), not swapping models. *Optional near-zero-cost hedge:* one throwaway
OpenRouter call to GLM-5.2 with this same brief, compare the two popovers, keep the better — available
if Kheshav wants the A/B (needs his OpenRouter key to have GLM-5.2 access). Confidence: high on facts,
medium on the "Opus wins bespoke" nuance (analyst hands-on, not a controlled study).

---

## Open risks / notes

- **Light-mode token injection** (above) is the top implementation gotcha — verify `--color-on-bright`
  resolves on the under-`<body>` popover before claiming G3.
- The grabber-pill drag rebinding must not break the existing `onDragStart`/dock geometry
  (`dragDock.js`, `pointerGeometry.js`) — pin with `guide-drag-dock.spec.js`.
- Motion changes must not regress the reduced-motion path already used for page transitions.
