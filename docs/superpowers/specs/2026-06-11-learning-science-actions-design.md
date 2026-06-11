# Learning-science actions — Design & Research spec (2026-06-11)

**Session type:** Design & Research (Claims 6 & 4 — *no production code here*) + a record of the
two trivial fixes shipped inline this session (Claims 1, 2, 5).
**Source of truth:** `docs/research/2026-06-10-learning-science-validation.md` (REVIEWED, accepted).
**Scope:** the 4 validated findings that remained after Claim 3 (Option F re-framing) shipped 2026-06-11.
**Invariants (non-negotiable):** word-gloss→FSRS vocab core untouched · no paywall · free paths
byte-identical · don't break MS/EN toggles. See `[[project_invariants]]`, `[[project_sentence_reveal_research]]`.

Decisions follow the house rule: **learning quality > simplicity > convenience**, each with evidence +
a confidence grade (HIGH/MED/LOW) and "what would change my mind."

---

## Part 0 — Shipped inline this session (Claims 1, 2, 5)

These were small + uncontested → straight to Implementation (methodology "right-size it").

### Claim 1 — FSRS version label (was "FSRS-4.5")
- **Finding:** `src/lib/fsrs.js` never pins a weight array — it uses `ts-fsrs` `generatorParameters()`
  defaults. The installed `ts-fsrs` **5.3.2 already ships FSRS-6.0** (21-weight set;
  `FSRSVersion === "v5.3.2 using FSRS-6.0"`). The app was *never* on 4.5; the docs label was stale.
- **Shipped:** corrected the label in `CLAUDE.md` (×3) + `docs/PHASE_1_SUPABASE_MIGRATION.md` + a
  RESOLVED note in the research doc; added a guard in `fsrs.test.js`
  (`default_w.length === 21`, `FSRSVersion =~ /FSRS-6/`) so the label can't drift from the library again.
- **Decision:** do NOT pin explicit weights — tracking the library default is strictly better for a
  no-maintenance app (future ts-fsrs improvements arrive for free). Veto note: pinning would freeze us
  on today's set. Confidence: **HIGH** (direct runtime evidence).

### Claims 2 & 5 — feedback salience / hypercorrection
- **Verification:** every production mode already shows the correct answer after a miss (Type `❌ {EN}`,
  Cloze `❌ {MS}`, Quiz highlights the right option green, Listen `💡 {MS} = {EN}`, Speak keeps the
  target word in big bold + per-word diff). **Claim 2 = satisfied, no change.**
- **The one real gap (Claim 5):** the orange hypercorrection callout (`WrongExtras.jsx`) told the user
  to *"read the correct answer"* but did **not** contain it — the answer sat in a small red `❌` line
  that reads as "wrong," not "study this." Research is explicit the correction must be salient, *"not a
  tiny gloss."*
- **Shipped:** `WrongExtras` now takes an `answer` prop and renders it **prominently inside** the
  hypercorrection callout (`data-testid="hypercorrect-answer"`, big/bold, high-contrast). Wired from
  Type/Cloze/Quiz/Listen. Speak left alone (it deliberately doesn't auto-penalise FSRS on noisy STT
  misses — sound choice). +1 unit (FSRS guard) → 803 green; new e2e `hypercorrection-salience.spec.js`
  (3 cases: confident-wrong shows answer in callout · confident-right no callout · unsure-wrong shows
  answer but no callout). Confidence: **HIGH**.

---

## Part A — Claim 6: make the reveal-gate a *desirable* difficulty (DESIGN)

### Problem + who it's for
The PDF reader defaults to **Malay-only**; English is revealed by a deliberate one-tap (word glosses
primary; sentence reveal secondary/off-by-default; "Show all" bulk hatch). For text **near the
learner's level** this is a *desirable difficulty* (Bjork) — attempt meaning before revealing =
retrieval practice. **But** Cognitive Load Theory (Sweller) says difficulty only helps *within reach*:
for a too-hard passage (most words unknown) Malay-only makes a genuine beginner flounder, disengage, or
guess-and-entrench. The research's "always-visible = crutch" framing is **too absolute** (HIGH that
gating helps; LOW that always-visible is bad). **Who:** genuine beginners; anyone importing a passage
well above their level.

### Already right — do not touch
- Reveal is cheap + non-punitive (one tap, machine-marked). ✓
- Word-gloss→FSRS is the primary path. ✓ **INVARIANT.**
- User copy already frames it as a "comprehension aid," not a crutch (only `CLAUDE.md` said "crutch" —
  reworded as part of this work).

### The gap
Nothing **eases** the gate when the text is demonstrably too hard. A floundering reader must manually
discover "Show all." No signal-driven nudge; no accommodation for a self-identified beginner.

### Options considered (diverge → converge)
- **A — Density-triggered nudge (per page).** Compute unknown-word density; above a threshold, surface a
  gentle, dismissible nudge offering to reveal English as they read. Default gate unchanged for normal
  text. *Additive, opt-in at the moment of need, preserves the gate.* ✅ **chosen (primary).**
- **B — Persistent "beginner" preference (Settings).** A toggle that auto-applies the softer mode on
  dense pages (instead of asking). *Self-identified, durable, minimal.* ✅ **chosen (optional reinforcement, default OFF).**
- **C — Behavioural inference.** Watch reveal-rate on the doc; infer "too hard." *Rejected:* laggy (acts
  only after frustration), harder to test; density is proactive and free.
- **D — Status quo.** *Rejected:* the gate's default still fights the floundering beginner who doesn't
  know to hit "Show all" — exactly the research's worry.

### Chosen design
1. **Density signal** — pure `unknownDensity(tokens, dictionary, groundingIndex)` → unknown/total over
   *content* tokens (ignore punctuation, numbers, 1-char). Reuses existing `collectDocTokens` / gloss
   classification — **no new data**, per current page (already tokenized).
2. **Threshold** — flag "dense" at **≥ 40% unknown** (a deliberately conservative trigger; tunable
   constant). Nation: comprehension needs ~95–98% known words; unaided reading already strains beyond
   ~5–10% unknown. 40% is unambiguously beyond reach → minimises false nudges on healthy
   desirable-difficulty text. *(This exact % is the single riskiest assumption — see decision log.)*
3. **Nudge UX (non-punitive)** — when a freshly-rendered page crosses the threshold AND the learner
   hasn't already enabled a softer mode AND hasn't dismissed it for this doc → a one-line, dismissible
   banner: *"This page has a lot of new words. Want the English shown as you read? You'll still see the
   Malay first."* with **[Show English as I read]** (enables Show-all word glosses) and **[No, I'll try
   first]** (dismiss, remembered per-doc). Framed as help, never "you failed."
4. **Beginner preference (B)** — one Settings toggle (reading section): *"Starting out? Auto-show English
   help on dense pages."* ON → the dense-page nudge auto-applies the softer mode instead of asking
   (still Malay-first, still one-tap to hide). **Default OFF** (gate stays default for everyone).
5. **Framing** — reinforce "try first, reveal freely; revealing is not failure" in the nudge copy + the
   `CLAUDE.md` reveal-gate note (drop "crutch").

### Safety / quality bars
- Reveal-gating stays the DEFAULT for normal-density text; word-gloss→FSRS untouched. **INVARIANT.**
- Free + local: density and nudge need no key; free paths byte-identical.
- Dismissible + rate-limited (once per doc); never nags. EN docs (`docLang==='en'`) → no nudge.
- a11y: banner keyboard-reachable, dismissible, `aria-live="polite"`.
- Telemetry (if any) ships only an anonymous ratio/event, never document text.

### Decision log — Claim 6
| Decision | Evidence (+grade) | Confidence | What would change my mind |
|---|---|---|---|
| Keep reveal-gating as the default | Bjork desirable difficulties + generation/testing effect; research Claim 6 "directionally right" | **HIGH** | evidence gating hurts in-reach readers |
| Ease (not remove) the gate for too-hard text | Sweller CLT; research Claim 6 (MED-HIGH gating-helps, LOW "always-visible bad") | **MED-HIGH** | data that beginners do better fully gated |
| Unknown-word **density** is the "too-hard" signal | Nation ~95–98% known for comprehension; density is the direct, computable proxy (reuses token classification) | **MED-HIGH** | a better proxy (e.g. learner-rated difficulty) outperforms |
| **40%** unknown threshold (conservative, tunable) | Nation thresholds → >5–10% unknown already strains; 40% = clearly beyond reach | **LOW-MED** | telemetry shows nudge fires too rarely/often |
| Nudge = opt-in banner (default), not auto-reveal | preserves desirable difficulty + agency; research "reveal freely, never reveal=failure" | **MED** | learners ignore the banner → make it the default for dense pages |
| Beginner toggle, default OFF | research item (b) "self-identified beginners"; minimal new state | **MED** | onboarding could infer level instead |
| Reject behavioural-only (C) | laggy (post-frustration), harder to test | **MED** | density proves a poor proxy in practice |

### Open questions for Kheshav (defaults in brackets)
- **Q6.1** Threshold: **[40% unknown]** to start — or more eager (30%)? *(constant, tune later.)*
- **Q6.2** Ship the beginner toggle **[yes, default OFF]** or density-nudge only for v1? *(toggle ≈ 10 lines.)*
- **Q6.3** Softer mode the nudge enables: **[Show-all word glosses]** vs sentence-reveal-on. *(Default
  Show-all — it's the primary vocab path; sentence-reveal is comprehension-secondary.)*

### Test plan — Claim 6
- **Pure:** `unknownDensity()` — empty → 0; all-known → 0; all-unknown → 1; punctuation/numbers/1-char
  ignored; grounding-index respected; boundary at the threshold.
- **e2e:** dense fixture PDF → nudge shown; sparse fixture → none; dismiss persists per-doc; accept
  enables softer mode + Malay still shown first; EN doc → no nudge; beginner-toggle ON auto-applies;
  light + dark screenshots.

---

## Part B — Claim 4: interleaving reframe + within-skill imbuhan (DESIGN)

### Problem + who it's for
The app frames mixed/smart sessions as an **"interleaving win"** (`tourSteps.js:131`: *"Interleaves
vocab, grammar and speaking in short cycles — the science-backed way to retain more."*). The evidence is
**softer**: Libersky 2025 — for *vocabulary* the interleaving benefit largely reduces to a **spacing**
effect (it vanished once a rest break was added); Hwang 2025 — for **low-achieving** learners
interleaving is an *undesirable* difficulty and **initial blocked** practice matters for building
declarative knowledge. Mechanistically interleaving helps most for **similar, confusable** items
(meN-/ber-/di- imbuhan), not for mixing wildly different activities (vocab→speaking→grammar =
category-switching — weaker, mostly the spacing/variety effect). **Who:** weaker IGCSE revisers
(block-first); everyone (honest framing); grammar learners (within-skill confusable interleaving is the
highest-leverage change and is currently absent).

### What's true now (code)
- **Two engines.** `src/lib/interleave.js` `buildMixedSession` does true round-robin across
  vocab/grammar/comprehension (the MixedSession). `src/lib/study/interleavedQueue.js` is the Smart
  Session at `/smart-study`: **thematic micro-cycles per focal word** (recognition→recall→production —
  escalation within ONE word). The micro-cycle engine is a sound *within-concept* design — **leave it.**
- **Grammar Imbuhan tab.** `sortDrillsBySRS` orders due→unseen→not-due; `IMBUHAN_DRILLS` is authored
  **grouped by prefix** (all `meN-`, then `ber-`, then `di-`…). So absent SRS shuffling it's *blocked by
  prefix* — no deliberate confusable interleaving. Drills carry a `prefix` field → reordering is a pure
  data operation, **no new content**.
- **Overclaiming copy:** `tourSteps.js:131` (the strong one) and `dailyPlan.js:139` ("Interleaving …
  keeps practice effortful and memorable").

### Chosen design (three changes, all low-risk)
1. **(a) Reframe copy → "spacing + variety," not a pure interleaving win.** Reword `tourSteps.js:131` +
   `dailyPlan.js:139` to claim what the evidence supports — distributed practice + task variety keep it
   effortful — dropping "the science-backed way to retain more." Pure copy. Evidence: Libersky 2025.
   Confidence **HIGH** (honesty fix).
2. **(b) Block-then-interleave for weak/new types.** For a drill type the learner is *new to or weak at*
   (no SRS history, or recent mistake-heavy), serve an initial **blocked** run (a few same-type items)
   *before* mixing. Hwang 2025: block-first builds declarative knowledge for low achievers; interleave
   once basics are in. Gate interleaving behind "≥ N correct in this type" (default N small). Confidence
   **MED** (single study, directional, low risk).
3. **(c) Within-skill interleaving of CONFUSABLE imbuhan — the highest-leverage change.** This is where
   interleaving's evidence is *strongest* (discrimination of similar items). Add an **opt-in "Mixed
   prefixes" ordering** in the Imbuhan tab that interleaves meN-/ber-/di- so the learner must *choose
   which prefix applies* rather than grinding one prefix in a block. Pure reorder over the existing
   `prefix` field; gated behind (b) so a weak learner gets blocked exposure first. **Malay-imbuhan only**
   (English `CONFUSABLE_DRILLS_EN` has no `prefix` field — guard it). Confidence **MED-HIGH**.

### Safety / quality bars
- Keep the thematic micro-cycle engine (per-word escalation) — it's not what the evidence questions.
- No new content; (c) reorders existing drills by `prefix`.
- Don't break MS/EN grammar toggles; (c) is guarded to the Malay imbuhan source.
- Block-first must be conservative (small N) so strong learners aren't forced to grind.

### Decision log — Claim 4
| Decision | Evidence (+grade) | Confidence | What would change my mind |
|---|---|---|---|
| Reframe copy to "spacing + variety" | Libersky 2025 (vocab interleaving ≈ spacing) | **HIGH** | a vocab-specific replication restoring a large interleaving-over-spacing effect |
| Block-then-interleave for weak/new types | Hwang 2025 (block-first for low achievers) | **MED** | replication showing interleave-from-start is fine for low achievers |
| Within-skill confusable-imbuhan interleaving (opt-in) | Rohrer & Taylor (interleaving aids discrimination of confusables); strongest interleaving evidence | **MED-HIGH** | evidence Malay imbuhan isn't "confusable" enough to benefit |
| Keep the thematic micro-cycle engine | sound within-concept escalation; not the thing questioned | **HIGH** | — |
| (c) Malay-imbuhan only (guard EN tab) | EN confusable drills lack a `prefix` field | **HIGH** | add prefix metadata to EN drills later |

### Open questions for Kheshav (defaults)
- **Q4.1** (c) packaging: a **[NEW "Mixed prefixes" toggle]** in the Imbuhan tab vs replacing the default
  order. *(Default: additive toggle — opt-in, never forces a weak learner to mix.)*
- **Q4.2** Block-first threshold: **[N = 3 correct in a type]** before interleaving. *(Tune later.)*
- **Q4.3** Scope of (b): **[grammar drills only]** vs also the mixed vocab/grammar/comp session.
  *(Default grammar — that's where confusable discrimination lives; the mixed session is mostly
  spacing/variety anyway.)*

### Test plan — Claim 4
- **Pure:** `interleaveByPrefix(drills)` (no two same-prefix adjacent where possible) — empty,
  single-prefix (no-op), 3-prefix alternation, stable order within a prefix; `shouldInterleave(type,
  grammarCards, N)` gate (below N → false; at/above → true).
- **e2e:** "Mixed prefixes" toggle alternates prefixes; a new/weak type stays blocked until N correct;
  reframed copy visible; EN tab unaffected; light + dark.

---

## Prioritisation (Impact × Confidence ÷ Effort, 1–5 each)
| Change | I | C | E | Score | Order |
|---|---|---|---|---|---|
| 4(a) copy reframe | 2 | 5 | 1 | **10** | 1st — trivial honesty fix |
| 4(c) confusable imbuhan | 4 | 4 | 2 | **8** | 2nd — highest learning leverage |
| 6 beginner toggle | 2 | 3 | 1 | **6** | bundled with 6 |
| 4(b) block-first | 3 | 3 | 2 | **4.5** | 3rd — pairs with 4(c) |
| 6 density nudge | 4 | 3 | 3 | **4** | 4th — most build, real value |

**Recommended build order:** 4(a) → 4(c) → 4(b) → 6 (density nudge) → 6 (beginner toggle). See the
companion plan `docs/superpowers/plans/2026-06-11-learning-science-actions.md` for TDD steps + the
paste-ready Implementation kickoff.

## Riskiest assumption (flagged honestly)
The **40% density threshold** (Claim 6) and **N=3 block-first** (Claim 4b) are product-judgment numbers,
not measured. They're exposed as tunable constants and graded LOW-MED / MED. The methodology stop-rule
applies: the *designs* don't change with the exact number, only the starting value — validate with
telemetry post-ship rather than gold-plating the research now.
