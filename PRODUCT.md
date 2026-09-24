# Product

## Register

product

## Users

IGCSE students (roughly 14–16) revising for Malay 0546 or English 0500/0510, alone, on their own device. The typical session is a phone in the evening — often a dim room, often in a 10–20 minute gap between other homework — and the student may well have ADD. Their job on any screen is one of: clear today's due cards, fix yesterday's mistakes, or rehearse one exam skill. Invite-only, individual revision; no teacher or classroom surface.

## Product Purpose

A free, offline-first revision tool that turns evidence-backed learning science (active recall, FSRS-6 spacing, interleaving, reveal-gated reading, a mistake journal that feeds straight back into review) into a short daily loop. Success is a student who opens it, knows the one next thing to do, does it, and retains it — not time-in-app. No paywall.

## Brand Personality

Calm, trustworthy, quietly encouraging — a good tutor, not a game show. The codename ("ooga da boogadamalay") carries the playfulness, so the interface itself doesn't have to shout. Correctness is sacred: a confident-wrong answer is the worst failure this product can have, and the visual tone should read as careful, not flashy.

## Anti-references

- The 2020–2023 AI/startup template: violet or indigo accents, purple-navy surfaces, pink→purple gradients, gradient-text logos.
- Neon on black (Material A400-style fully saturated greens/cyans) — eye strain in a dim room, and it makes every chip compete.
- Gamified slot-machine UI (Duolingo-style confetti everywhere, loud streak pressure, XP inflation).
- A primary button that looks like an error state. Feedback colours (correct / wrong / warning) belong to feedback only.

## Design Principles

1. **One clear next action.** Every screen leads with the single thing to do now; everything else recedes. Choice-overload is an attention tax.
2. **Colour means something.** Green = correct, red = wrong, orange = warning. The brand accent is for "go" and selection, never decoration, and never shares a hue with feedback.
3. **Calm beats exciting.** Short, completable units, desaturated colour, motion only to show a state change. The tool should disappear into the studying.
4. **Accessibility is the floor, not a mode.** AA contrast in every theme, ≥44 px targets, announced feedback, keyboard-operable reader — designed for the hardest case (the curb-cut effect), which makes it better for everyone.
5. **Try first, reveal freely.** Reveal-gated translation is a desirable difficulty, never a punishment; the UI must never make revealing feel like failing.

## Accessibility & Inclusion

WCAG 2.1 AA minimum in dark and light themes — every colour role ≥ 4.5:1 as text on the worst surface AND on its own chip tint (text-bearing tints are capped at 12%) — plus high-contrast dark and light themes at ≥ 7:1 on surfaces and ≥ 6:1 on tints. Pinned by `src/lib/__tests__/themeContrast.test.js` + `designTells.test.js`. Lexend dyslexia-friendly font mode. `prefers-reduced-motion` respected for every entrance/transition. ≥ 44 × 44 px tap targets (`tests/e2e/a11y-tap-targets.spec.js`). Drill feedback announced through a polite live region. Colour is never the only signal (labels/icons accompany every semantic colour); the accent sits on the blue-green axis so it stays distinct from red/green feedback under the common red-green colour-vision deficiencies. Vocabulary picture icons are pedagogy (picture-superiority effect), not decoration.
