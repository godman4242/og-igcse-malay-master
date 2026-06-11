# Learning-science actions — Implementation plan (2026-06-11)

Companion to `docs/superpowers/specs/2026-06-11-learning-science-actions-design.md`. Build order is the
spec's prioritisation. **TDD throughout** (pure logic → unit test → wire → e2e → eyeball). Each step is
independently shippable & green. Claims 1/2/5 already shipped this session (see spec Part 0).

**Baseline to verify before starting:** git clean · `npm run test:run` green (803) · `npm run lint`
0 errors · prod (`upg-…`) READY.

---

## Step 1 — Claim 4(a): reframe the interleaving copy  *(trivial, do first)*
**Files:** `src/lib/guide/tourSteps.js` (~L131), `src/lib/dailyPlan.js` (~L139).
- Reword the SmartStudy tour step: drop *"the science-backed way to retain more"* → frame as
  **spacing + variety** (e.g. *"Mixes vocab, grammar and speaking in short, spaced rounds — variety
  keeps each rep effortful, and spacing is what makes it stick."*).
- Soften `dailyPlan.js:139` reason to spacing/variety language.
- **Test:** no logic change — covered by existing tour/daily-plan e2e (assert the new copy renders if a
  test pins it; otherwise eyeball). No new pure logic.
- **Done:** copy reframed, build/lint/test green, tour step reads honestly.

## Step 2 — Claim 4(c): within-skill confusable-imbuhan interleaving  *(highest leverage)*
**New pure logic:** `src/lib/study/interleaveByPrefix.js`
- `interleaveByPrefix(drills)` → reorders so no two adjacent drills share a `prefix` where possible
  (round-robin by prefix bucket; stable within a bucket). Single-prefix input → unchanged. Non-imbuhan
  drills (no `prefix`) → return as-is (guard).
- **Unit tests first** (`src/lib/__tests__/interleaveByPrefix.test.js`): empty; single-prefix no-op;
  3-prefix alternation (meN-/ber-/di- never adjacent); preserves set membership; deterministic.
**Wire (surgical):** `src/pages/Grammar.jsx`
- Add an **additive "Mixed prefixes" toggle** (Malay Imbuhan tab only — guard `!isEng`). When ON, the
  imbuhan drill order = `interleaveByPrefix(sortedImbuhan)`; when OFF, today's `sortDrillsBySRS` order.
- Gate availability behind Step 3's `shouldInterleave` once that lands (until then, plain toggle).
- **e2e** (`tests/e2e/imbuhan-interleave.spec.js`): toggle ON alternates prefixes; OFF = SRS order;
  EN tab shows no toggle; light + dark.
- **Done:** opt-in toggle alternates prefixes; EN guarded; tests green; eyeballed.

## Step 3 — Claim 4(b): block-then-interleave for weak/new types
**New pure logic:** `shouldInterleave(type, grammarCards, N = 3)` (add to `interleaveByPrefix.js` or a
sibling) → counts the learner's *correct* reps in that drill type (via `grammarCards` reps/state); below
N → `false` (keep blocked), at/above → `true`.
- **Unit tests:** 0 history → false; N-1 correct → false; N correct → true; mixed types counted
  independently.
- **Wire:** the "Mixed prefixes" toggle (Step 2) is only *offered/auto-on* when `shouldInterleave` for
  the imbuhan type is true; below threshold the learner gets blocked exposure first. Conservative N=3
  constant (exported, tunable).
- **Decide at build time:** confirm where `grammarCards` records per-drill correctness
  (`reviewGrammarDrill` in the store) so the count is real, not inferred. Resolve before wiring.
- **Done:** weak/new type stays blocked until N correct; tests green.

## Step 4 — Claim 6: density nudge  *(most build; real value)*
**New pure logic:** `src/lib/unknownDensity.js`
- `unknownDensity(tokens, dictionary, groundingIndex)` → `{ unknown, total, ratio }` over *content*
  tokens (ignore punctuation, numbers, ≤1-char). Reuse `normalizeWord` + the same known/unknown
  classification `collectDocTokens`/`buildGlossIndex` use (single source of truth — don't reimplement).
- `DENSE_THRESHOLD = 0.4` exported constant.
- **Unit tests first:** empty → ratio 0; all-known → 0; all-unknown → 1; punctuation/numbers ignored;
  grounding-verified words count as known; boundary at 0.4.
**Wire (surgical):** `src/pages/PDFReader.jsx`
- On a freshly-rendered page, if `ratio >= DENSE_THRESHOLD` AND not already in a softer mode AND not
  dismissed-for-this-doc → render a dismissible `aria-live="polite"` banner (var(--color-*) only) with
  **[Show English as I read]** (→ `setShowAll(true)` on the word gloss layer) and **[No, I'll try
  first]** (→ dismiss, remember per-doc id). EN docs (`docLang==='en'`) → never.
- Per-doc dismissal in component state (resets in `resetGloss`), not persisted — keep it light.
- **e2e** (`tests/e2e/dense-page-nudge.spec.js`, new dense + sparse fixtures via `scripts/gen-fixtures.mjs`):
  dense → banner; sparse → none; dismiss persists; accept reveals (Malay still first); EN doc → none;
  light + dark.
- **Done:** nudge fires only on dense pages, non-punitive, dismissible; tests green; eyeballed.

## Step 5 — Claim 6: beginner preference toggle  *(optional reinforcement)*
**Store (vN→N+1):** `pdfReader.autoHelpDensePages: false` (default OFF) + setter + migration (preserve
all existing fields). **Settings UI:** one toggle in the reading section, honest copy *"Starting out?
Auto-show English help on dense pages."*. **Wire:** when ON, the Step 4 nudge auto-applies the softer
mode instead of asking (still Malay-first; still one-tap hide).
- **Tests:** store migration unit (default present after upgrade); e2e toggle-ON auto-applies on a dense
  page, toggle-OFF asks; light + dark.
- **Done:** toggle persists, default OFF, auto-applies when ON; gate unchanged for everyone else.

## Step 6 — Framing cleanup (folds into the above commits)
- `CLAUDE.md` "Learning science foundation" + reveal-gate note: drop "crutch"; state the gate is
  "try first, reveal freely — revealing is not failure," and that it **eases on demonstrably too-hard
  pages** (link this spec). Already partly done for Claim 1; finish for Claim 6.

---

## Verification gate (every step)
`npm run build` (PAGE chunks <70 KB; PDFReader/Grammar stay under) · `npm run test:run` · `npm run lint`
(0 errors) · eyeball light + dark on 390×844 · new e2e green solo. Commit atomically; refresh
RESUME_HERE in the same commit; confirm PUBLIC Vercel (`upg-…`) READY after each shipped step.

## Out of scope (this plan)
- Inferring learner level from onboarding (beginner is *self-identified* for v1).
- Telemetry-driven auto-tuning of the 40% / N=3 constants (ship tunable constants; revisit later).
- Touching the word-gloss→FSRS core or the thematic micro-cycle engine.

---

## Paste-ready Implementation kickoff (Box B-style, lean)
```text
Continue IGCSE Malay Master (React/Vite SPA). IMPLEMENTATION session — build the approved spec
docs/superpowers/specs/2026-06-11-learning-science-actions-design.md (Claims 6 & 4) in the TDD order of
docs/superpowers/plans/2026-06-11-learning-science-actions.md. Claims 1/2/5 already shipped.

Read first: the spec + plan above, CLAUDE.md "Learning science foundation", and
docs/process/feature-development-methodology.md (Implementation expectations). Follow
[[feedback_make_clear_calls]], [[project_invariants]], [[project_sentence_reveal_research]].

Build order: Step 1 (copy reframe) → 2 (confusable-imbuhan interleave, opt-in) → 3 (block-first gate)
→ 4 (density nudge) → 5 (beginner toggle) → 6 (framing cleanup). Each step: pure logic + unit tests
FIRST, then surgical wiring, then e2e (go-wild), then eyeball light+dark. Resolve the open Qs by the
spec defaults unless they're a genuine product fork (then flag): Q6.1=40%, Q6.2=ship toggle default-OFF,
Q6.3=Show-all glosses, Q4.1=additive "Mixed prefixes" toggle, Q4.2=N=3, Q4.3=grammar-only.

Invariants: word-gloss→FSRS core untouched; reveal-gating stays the DEFAULT for normal text; no paywall;
free paths byte-identical; don't break MS/EN toggles; guard (c) to Malay imbuhan (EN drills lack prefix).

Done = every step green (build+lint+test:run SHOWN; light+dark eyeballed; e2e per step), STORE_VERSION
bumped+migrated if Step 5 lands, RESUME_HERE refreshed in the same commit, PUBLIC Vercel READY. Decide-
and-flag every product fork (learning quality > simplicity > convenience); log Decision/why/veto-note.
```
