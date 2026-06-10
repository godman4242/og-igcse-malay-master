# Learning-science validation of IGCSE Malay Master's pedagogy — 2026-06-10

**Status: FIRST-PASS, KNOWLEDGE-BASED.** The automated deep-research harness was
launched for this but died on a usage limit after fetching 1 of ~15 sources, so its
output (a spurious "all claims refuted") is a failure artifact, NOT evidence — discarded.
This assessment is written from established cognitive-science / SLA findings. Claims marked
**[VERIFY]** should be hardened with live citations when budget allows (or by the autonomous
research routine once the web-access probe confirms cloud search works). Confidence grades are
honest: HIGH = textbook-settled, MEDIUM = real but qualified, LOW = contested/overstated.

The point of this exercise (the project's #1 invariant is learning quality): find where the
app's stated pedagogy is **wrong or overstated**, not to rubber-stamp it. The two findings that
matter most are #3 and #6 — both are **overstated** in the current framing.

---

## Claim 1 — FSRS-4.5 beats fixed/SM-2 intervals for retention
**Verdict: SUPPORTED, with a right-sizing caveat. Confidence: spacing HIGH; FSRS>SM-2 MEDIUM-HIGH.**

- The spacing effect itself (distributed > massed/fixed review) is one of the most robust results
  in cognitive psychology (Cepeda et al. 2006 meta-analysis). Not in doubt.
- FSRS specifically out-predicting SM-2: supported by the open spaced-repetition benchmark (FSRS's
  ML-fitted 3-component memory model achieves lower prediction error than SM-2 across large review
  datasets). **[VERIFY]** the current magnitude/benchmark numbers.
- **Caveat the app should internalise:** FSRS's edge over SM-2 is *scheduling efficiency* (fewer
  reviews for the same retention), not a guarantee of better exam outcomes. The dominant lever is
  "spaced + retrieval at all," which the app already has. Don't over-attribute results to FSRS
  specifically.
- **App is correct here.** No change needed beyond not overselling FSRS vs SM-2 in copy.

## Claim 2 — Active recall / testing effect (type-answer, cloze, speaking > passive review)
**Verdict: STRONGLY SUPPORTED. Confidence: HIGH.**

- The testing effect (retrieval practice) is extremely well-replicated (Roediger & Karpicke 2006;
  Adesope et al. 2017 meta-analysis). Producing an answer beats re-reading.
- The generation effect (Slamecka & Graf 1978) backs production modes (type-answer, cloze, speaking)
  over recognition (multiple-choice). The app's mode mix is well-aligned.
- **Nuance the app should respect:** retrieval practice only pays off with **feedback after a failed
  attempt** — an uncorrected wrong retrieval can entrench the error. Free recall (type-answer) is
  more powerful but more error-prone for novices, so easier scaffolds (cloze, MCQ) earn their place
  for brand-new items. The app's FSRS New→Learning→Review progression already approximates this.
- **App is correct.** Only watch: ensure every production mode shows the correct answer immediately
  after a miss (verify type-answer/speaking do this, not just quiz).

## Claim 3 — Option F: an L2 (simpler-Malay) sentence gloss builds vocab better than an L1 (English) gloss
**Verdict: OVERSTATED / NUANCED — the strong version is not consensus. Confidence the strong claim holds: LOW-MEDIUM.**

- The Involvement Load Hypothesis (Laufer & Hulstijn 2001) is real: retention rises with *need +
  search + evaluation*. An L2 paraphrase that forces the learner to process Malay can induce more
  involvement than a one-tap L1 word. That part is defensible.
- **But the literature on L1 vs L2 glosses is genuinely mixed, and often favours L1 glosses**,
  especially for lower-proficiency learners: L1 glosses are fast, unambiguous, lower cognitive load,
  and several studies show they help vocabulary *and* comprehension. L2/elaborated glosses tend to
  help *higher*-proficiency learners. The specific Rassaei & Folse result the app leans on is one
  data point, not a settled ranking. **[VERIFY]** the exact Rassaei & Folse (2024) claim and find
  the counter-studies (L1-gloss-favourable) — this is the single most important citation to pin.
- **The honest framing (already half-acknowledged in CLAUDE.md):** the L2 rung is a *plausibly*
  vocab-superior option *for intermediate+ learners*, not a proven universal win, and the English
  reveal is **not merely a crutch** — for IGCSE beginners it may be the better builder.
- **What to change in the app:** (a) keep the L2 ladder, but stop implying it's strictly superior;
  (b) consider gating which rung is *default* on learner proficiency (beginners → English reveal is
  fine and maybe better; intermediate+ → L2 first); (c) soften any copy/marker that frames English
  as inferior. This matches the existing hedge in `[[project_sentence_reveal_research]]` — treat
  that memory as the source of truth, and this doc reinforces it.

## Claim 4 — Interleaving (mixing vocab/grammar/speaking) beats blocked practice
**Verdict: NUANCED — benefit is real but partly a spacing effect, and weakest for *dissimilar* categories. Confidence: MEDIUM.**

- Interleaving robustly helps *category learning* and *motor/math* tasks where items are confusable
  and the skill is discrimination (Rohrer & Taylor). For those, mixing > blocking.
- **Two honest caveats:** (1) interleaving inherently *spaces* items, and a chunk of its benefit is
  attributable to spacing rather than mixing per se — recent work suggests the vocab interleaving
  advantage can shrink/vanish when spacing is equated (a rest break substitutes for it). **[VERIFY]**
  the 2025 SAGE paper the harness half-surfaced (Journal of Second Language studies) on this.
  (2) Interleaving helps most for *similar, confusable* items (e.g. meN- vs ber- imbuhan); mixing
  *wildly different* activities (vocab card → speaking → grammar) is "category-switching," whose
  benefit is weaker and mostly the spacing/variety effect.
- **What to change:** Smart Study's value is real but should be framed as "spacing + variety," not a
  pure interleaving win. The higher-leverage interleaving is *within* a skill — e.g. interleave
  confusable imbuhan types in grammar drills — which the app could do more deliberately.

## Claim 5 — Hypercorrection: prioritise high-confidence errors ("certain but wrong")
**Verdict: SUPPORTED. Confidence: HIGH for the effect; MEDIUM that prioritisation is optimal scheduling.**

- The hypercorrection effect is well-established (Butterfield & Metcalfe 2001; Metcalfe 2017 review):
  errors made with *high* confidence are *more* likely to be corrected on a later test than
  low-confidence errors — surprise/attention drives deeper encoding of the correction.
- So the app's "certain but wrong → hypercorrection priority" is evidence-based and a genuinely
  smart feature.
- **Nuance:** the effect is about *that item* being fixed, not a general boost; it requires the
  learner to actually attend to and encode the correct answer (so the correction UI must be salient,
  not a tiny gloss). And low-confidence errors still need re-drilling — prioritise high-confidence
  ones, don't *neglect* the rest.
- **App is correct.** Minor: make sure the corrective feedback for a hypercorrection item is visually
  prominent (the effect rides on attention to the correction).

## Claim 6 — Reveal-gated translation (Malay-only default; English gated; always-visible = crutch)
**Verdict: DIRECTIONALLY RIGHT, but the "crutch" framing is OVERSTATED. Confidence: MEDIUM-HIGH for gating-helps; LOW for "always-visible is bad."**

- Grounded in desirable difficulties (Bjork), the generation effect, and the testing effect: making
  the learner attempt meaning before revealing = retrieval practice. For material *near the learner's
  level*, gating is beneficial. Defensible.
- **The overstatement:** Cognitive Load Theory (Sweller) says difficulty only helps when it's
  *within reach*. For a too-hard passage, hiding the translation produces an **undesirable**
  difficulty — the learner flounders, disengages, or guesses wrong and entrenches it. For genuine
  beginners, an always-visible gloss can *enable* learning that gating would block. "Always-visible
  translation is a crutch" is therefore too absolute.
- **What to change:** keep reveal-gating as the default, but (a) make the reveal cheap and
  non-punitive (it already is — good); (b) consider easing the gate for clearly-too-hard text or
  self-identified beginners; (c) frame the gate as "try first, reveal freely," never as
  reveal = failure. The current machine-marked, one-tap reveal is already close to right.

---

## What to change in the app — priority order
1. **[Highest] Re-frame Option F (Claim 3).** Stop implying the L2 rung is strictly vocab-superior;
   it's option-for-intermediate+, and the English reveal is not just a crutch. Align copy/markers
   with the hedged `[[project_sentence_reveal_research]]` memory. Consider proficiency-gating the
   default rung. *This is a copy/decision change, not a rebuild.*
2. **[High] Reveal-gating (Claim 6):** soften "crutch" framing; ensure the gate eases for too-hard
   material / beginners so it stays a *desirable* difficulty.
3. **[Medium] Interleaving (Claim 4):** reframe Smart Study as "spacing + variety"; add deliberate
   *within-skill* interleaving of confusable items (imbuhan types) where the evidence is strongest.
4. **[Low/verify] Feedback salience (Claims 2 & 5):** confirm every production mode and every
   hypercorrection item shows the correct answer prominently right after a miss.
5. **[Copy] FSRS (Claim 1):** don't oversell FSRS-vs-SM-2; the real win is spaced retrieval, which
   you already have.

## Citations still to pin (for the rigorous version)
- **[VERIFY]** Rassaei & Folse (2024) exact claim + the L1-gloss-favourable counter-studies (Claim 3).
- **[VERIFY]** The 2025 second-language interleaving/spacing-confound paper (Claim 4).
- **[VERIFY]** Current FSRS-vs-SM-2 benchmark magnitude (Claim 1).
- Settled enough to cite from standard sources: Cepeda 2006 (spacing), Roediger & Karpicke 2006 +
  Adesope 2017 (testing effect), Laufer & Hulstijn 2001 (Involvement Load), Butterfield & Metcalfe
  2001 / Metcalfe 2017 (hypercorrection), Bjork (desirable difficulties), Sweller (cognitive load).

## How this was produced (honesty)
Knowledge-based first pass after the automated harness failed on a usage limit. Treat the **[VERIFY]**
items as not-yet-fact-checked against live sources. Nothing here changes app behaviour — these are
recommendations for Kheshav to approve; acting on any of them is a separate, signed-off step.
