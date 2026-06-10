# Learning-science validation of IGCSE Malay Master's pedagogy — 2026-06-10

**Status: CITATION-VERIFIED 2026-06-10** (claims 1, 3, 4 hardened with live meta-analytic
sources via a targeted web pass; claims 2, 5, 6 rest on textbook-settled findings). The
original automated harness died on a usage limit (its "all refuted" output was a failure
artifact, discarded); this is the recovered, source-grounded version. The one citation I could
NOT fully pin is the exact numerical result of the specific Rassaei & Folse (2024) paper the app
cites — it's paywalled (ScienceDirect 403) — but a **meta-analysis of many L1-vs-L2 gloss
studies** decisively outweighs that single paper, and it points the *opposite* way (see Claim 3).
Confidence grades: HIGH = settled + cited, MEDIUM = real but qualified, LOW = contested/overstated.

The point of this exercise (the project's #1 invariant is learning quality): find where the
app's stated pedagogy is **wrong or overstated**, not to rubber-stamp it. The two findings that
matter most are #3 and #6 — both are **overstated** in the current framing.

---

## Claim 1 — FSRS-4.5 beats fixed/SM-2 intervals for retention
**Verdict: SUPPORTED (now well-cited). Confidence: HIGH.**

- The spacing effect itself (distributed > massed/fixed review) is one of the most robust results
  in cognitive psychology (Cepeda et al. 2006 meta-analysis). Not in doubt.
- FSRS out-predicting SM-2 is now confirmed by the open benchmark on **~700M anonymised Anki
  reviews**: FSRS log-loss **0.291 vs SM-2 0.354**, retention RMSE **5.3% vs 16.2%**, and FSRS needs
  **20–30% fewer reviews** for the same retention (open-spaced-repetition benchmark; diane.app /
  DeepWiki summaries, 2024–2025).
- **Caveat the app should internalise:** FSRS's edge is *scheduling efficiency* (fewer reviews for
  the same retention), not a guarantee of better exam outcomes. The dominant lever remains "spaced +
  retrieval at all," which the app already has.
- **New, minor:** the app is on **FSRS-4.5**, but **FSRS-5 and FSRS-6** shipped (2024–2025) with
  refined parameter sets. Worth checking whether `ts-fsrs` has a newer version to adopt — low effort,
  small accuracy gain. *(Verify against the installed `ts-fsrs` before acting.)*
- **App is correct here.** No change beyond the optional ts-fsrs bump and not overselling FSRS vs SM-2.

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
**Verdict: MIXED — the app's CORE vocab design is SUPPORTED; only Option F's *L2-sentence rung* is on shaky vocab ground for beginners. Confidence: MEDIUM-HIGH.**

*(Correction note: an earlier draft of this section said the premise was "backwards." That
overstated it — it conflated the app's primary word-level glosses with the Option F rung. Corrected
below after re-reading the actual design in `[[project_sentence_reveal_research]]`.)*

- **What the app actually does** (per the design memory): the **primary vocabulary path is L1
  (English) word-level glosses** → FSRS; the English *sentence* reveal is explicitly a
  **comprehension** scaffold (the memory already does NOT claim it builds vocab); Option F adds an
  optional **L2 simpler-Malay sentence rung** as an involvement-load vocab booster, BYOK-gated, with
  English escalation beneath, degrading to English when unavailable.
- **The meta-analysis SUPPORTS the app's core.** Kim, Lee & Lee (2024), a meta-analysis of L1-vs-L2
  glossing, found **L1 glosses beat L2 glosses for vocabulary (Hedge's g = 0.33, p < .001), strongest
  for BEGINNER learners** — and these are predominantly *word-level* glosses. The app's primary path
  *is* L1 word-level glosses, so for its beginner IGCSE audience the core design is **on the right
  side of the evidence.** Good.
- **Where it casts doubt — Option F's L2-sentence rung.** The Involvement Load Hypothesis
  (Laufer & Hulstijn 2001) makes the L2 rung *plausible* (deeper processing), and Rassaei & Folse
  (2024) is the one study supporting L2-sentence > word-level. But (a) that's a single study, its
  exact numbers paywalled (ScienceDirect 403, unconfirmed), and (b) the broader meta-analytic tide
  is **L1 > L2 for beginners.** So the spec's implicit assumption that the L2 rung is a *strong vocab
  win* is **overstated for beginners** — for them it may be no better, or worse, than just reading
  the English. It's most defensible for intermediate+ learners.
- **Honest bottom line:** the app's vocabulary core is evidence-aligned; the *only* overstatement is
  selling the Option F L2 rung as a vocab win for everyone. Low harm in practice — Option F is
  optional, BYOK-gated, and degrades to English — but the rationale shouldn't be oversold.
- **What to change (recommendation — needs your sign-off, since it touches a shipped feature's
  premise):**
  (a) In the Option F spec/marker copy, present the L2 rung as an **optional involvement-load
  experiment, strongest for intermediate+**, not a proven universal vocab win.
  (b) Optionally default beginners to the English rung first (it's the stronger evidence-backed
  builder) and surface the L2 rung as the opt-in.
  (c) Leave the *core* word-gloss→FSRS path exactly as is — it's correct.
  This **sharpens** `[[project_sentence_reveal_research]]` rather than reversing it: that memory's
  "English sentence-reveal = comprehension, word-level = vocab" split is still right; the new datum
  is that the *L2-sentence vocab booster* is weaker for beginners than the spec implies.

## Claim 4 — Interleaving (mixing vocab/grammar/speaking) beats blocked practice
**Verdict: NUANCED — benefit is real but partly a spacing effect, and weakest for *dissimilar* categories. Confidence: MEDIUM.**

- Interleaving robustly helps *category learning* and *motor/math* tasks where items are confusable
  and the skill is discrimination (Rohrer & Taylor). For those, mixing > blocking.
- **Two honest caveats, now cited:** (1) **Libersky et al. (2025), "The effects of interleaving and
  rest on L2 vocabulary learning"** (Second Language Research): Experiment 1 found an interleaving
  benefit, but Experiment 2 — which added a midway *rest* break — erased it (all conditions
  performed similarly), so the authors conclude the benefit "may stem from a spacing effect," and
  note interleaving effects are **more limited for vocabulary** than for other domains. (2)
  **Hwang (2025), "Undesirable Difficulty of Interleaved Practice" (Language Learning):** for
  **low-achieving** learners, interleaving was an *undesirable* difficulty and **initial blocked
  practice** was important for building declarative knowledge. Both directly relevant: IGCSE
  revisers span the low-achieving band.
- Mechanistically, interleaving helps most for *similar, confusable* items (e.g. meN- vs ber-
  imbuhan); mixing *wildly different* activities (vocab → speaking → grammar) is "category-switching,"
  whose benefit is weaker and mostly the spacing/variety effect.
- **What to change:** (a) frame Smart Study as "spacing + variety," not a pure interleaving win;
  (b) for weaker/younger learners, let a new topic be **blocked first**, then interleaved once
  basics are in (Hwang 2025); (c) the higher-leverage interleaving is *within* a skill — interleave
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
1. **[HIGH] Don't oversell Option F's L2 rung (Claim 3).** The app's *core* vocab path (L1 word
   glosses → FSRS) is evidence-aligned and correct — leave it. The narrower fix: the Option F spec
   /marker frames the L2 simpler-Malay rung as a vocab win, but the meta-analysis (Kim/Lee/Lee 2024,
   L1 > L2, g=.33, strongest for beginners) says it's weaker for beginners than implied. Re-frame the
   rung as an optional involvement-load experiment (strongest for intermediate+); optionally default
   beginners to English-first. Copy/decision change touching a shipped feature's premise → **your
   call before anything changes.**
2. **[High] Reveal-gating (Claim 6):** soften "crutch" framing; ensure the gate eases for too-hard
   material / beginners so it stays a *desirable* difficulty (Bjork; Sweller cognitive load).
3. **[Medium] Interleaving (Claim 4):** reframe Smart Study as "spacing + variety" (Libersky 2025);
   block-then-interleave for weaker learners (Hwang 2025); add *within-skill* interleaving of
   confusable imbuhan types where the evidence is strongest.
4. **[Low] Feedback salience (Claims 2 & 5):** confirm every production mode and every hypercorrection
   item shows the correct answer prominently right after a miss.
5. **[Low/optional] FSRS (Claim 1):** check whether `ts-fsrs` offers FSRS-5/6 (app is on 4.5); small
   accuracy gain. Don't oversell FSRS-vs-SM-2 in copy — the real win is spaced retrieval.

## Citations (pinned 2026-06-10)
- **Claim 3 (decisive):** Kim, Lee & Lee (2024), *The relative effects of L1 and L2 glosses on L2
  learning: A meta-analysis*, Language Teaching Research — L1 > L2, g=0.33, p<.001, strongest for
  beginners. https://journals.sagepub.com/doi/10.1177/1362168820981394
  Single study the app cites (paywalled, result unconfirmed): Rassaei & Folse (2024), *System* 122,
  art. 103273. https://www.sciencedirect.com/science/article/abs/pii/S0346251X24000551
- **Claim 4:** Libersky et al. (2025), *The effects of interleaving and rest on L2 vocabulary
  learning*, Second Language Research. https://journals.sagepub.com/doi/10.1177/02676583251338768 ·
  Hwang (2025), *Undesirable Difficulty of Interleaved Practice*, Language Learning.
  https://onlinelibrary.wiley.com/doi/10.1111/lang.12659
- **Claim 1:** open-spaced-repetition benchmark (~700M Anki reviews; FSRS log-loss 0.291 vs 0.354,
  RMSE 5.3% vs 16.2%, 20–30% fewer reviews). https://deepwiki.com/open-spaced-repetition/fsrs-optimizer/7.3-comparison-with-sm-2
- **Settled (standard sources, not re-fetched):** Cepeda 2006 (spacing); Roediger & Karpicke 2006 +
  Adesope 2017 (testing effect); Laufer & Hulstijn 2001 (Involvement Load); Butterfield & Metcalfe
  2001 / Metcalfe 2017 (hypercorrection); Bjork (desirable difficulties); Sweller (cognitive load).

## How this was produced (honesty)
Knowledge-based draft (after the automated harness failed on a usage limit), then hardened with a
targeted live-citation pass for Claims 1/3/4. One gap remains: the *exact numbers* of the single
Rassaei & Folse paper (paywalled) — but the meta-analysis decisively outweighs it. Nothing here
changes app behaviour — these are recommendations for Kheshav to approve; acting on any is a
separate, signed-off step. The Claim 3 finding is significant enough that it deserves an explicit
decision before the shipped Option F framing changes.
