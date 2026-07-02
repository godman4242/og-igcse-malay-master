# Research — focus audio + weak-model grading harness (2026-07-03)

> **Method note (honest):** a deep-research workflow fanned out searches and extracted claims with
> sources on 2026-07-02, but its *adversarial verification* phase died on a usage-limit crash (all 25
> verifier panels errored — infrastructure failure, not a research finding). The load-bearing claims
> below were therefore **re-verified manually against primary sources on 2026-07-03** (WebFetch/
> WebSearch). Each is marked ✅ verified or ⚠️ single-source. This grounds the decisions in
> `docs/superpowers/specs/2026-07-03-optimal-learning-environment-vision.md` §2.4 and §2.6.

## Part 1 — Focus audio for attention/ADHD

### White / pink / brown noise
- ✅ **Nigg et al. 2024, JAACAP** (systematic review + meta-analysis, 13 studies, N=335): white/pink
  noise gives a **small but significant benefit** to task performance for youth with ADHD or elevated
  attention problems — **Hedges g = 0.249** (95% CI 0.135–0.363, p<.0001). Low heterogeneity, no
  publication bias.
  Source: https://www.jaacap.org/article/S0890-8567(24)00074-1/abstract (and ScienceDirect mirror
  https://www.sciencedirect.com/science/article/abs/pii/S0890856724000741)
- ✅ **Same meta-analysis, non-ADHD comparison** (11 studies): white/pink noise had a **small
  significant *negative* effect** — **g = −0.212** (95% CI −0.355 to −0.069, p=.0036). → noise is NOT
  a universal focus aid; it can slightly *hurt* neurotypical focus.
- ⚠️ **Within-subject studies agree it's profile-dependent** (helps inattentive, hurts attentive;
  ~⅓ of ADHD participants actively impaired). Sources: PMC2955636, PMC11585357, MDPI IJERPH 19/12/7283.
  (Extracted by the workflow; consistent with the meta-analysis; not each independently re-fetched.)
- ⚠️ **Mechanism (Moderate Brain Arousal / stochastic resonance) is contested** — a 100 Hz pure tone
  helped as much as pink noise in one 2024 study, challenging the "randomness is required" theory.
  Doesn't change the practical recommendation.

### Binaural beats / isochronic tones
- ⚠️ **Meta-analysis: g ≈ 0.45** overall for cognition/emotion across 35 effect sizes — BUT the
  **sustained-attention** effect specifically is minimal (studies found no attenuation of the vigilance
  decrement; robust EEG entrainment but little behavioral attention gain). Best supported for
  **anxiety/relaxation/sleep**, not focus. High heterogeneity → personalized, not reliable.
  Sources: PubMed 30073406 (meta), Nature Sci Rep s41598-025-88517-z (parametric attention study).

### Licensing
- ✅ **brain.fm ToS PROHIBITS embedding/streaming in another app:** "The Products shall be for private
  use only… use… in commercial or public settings is not permitted"; "The use or posting of the
  Product Content on any other website, application or otherwise… is expressly prohibited."
  Source: https://www.brain.fm/terms → **cannot use their tracks. Must self-synthesize.**

### → Design implication (spec §2.4)
Ship **Web Audio API self-synthesized** white/pink/brown noise (free, offline, no license) + optional
synthesized binaural labeled as relaxation. **Honest hedged copy**, never a blanket focus claim. Bound
to noise + a study timer; no third-party tracks.

## Part 2 — Making weak/BYOK models grade writing accurately

All techniques below are **client-side implementable over a BYOK HTTP API** (no server) — they are
prompt-architecture + multi-call orchestration, which `instruct.js` already supports.

- ✅ **Rubric decomposition — one trait per independent call (MTS).** Biggest single win. Llama2-13b-chat
  zero-shot essay QWK **0.205 → 0.560 on ASAP** (+0.355), **0.025 → 0.462 on TOEFL11** (+0.437);
  the small 13B model **beats ChatGPT (0.430)**. Ablation: independent per-trait calls = 0.492 avg QWK
  vs 0.306 (all traits in one conversation) vs 0.205 vanilla; adding retrieve-quotes-then-score adds
  ~+0.068 → 0.560. Source: https://arxiv.org/abs/2404.04941
- ✅ **Pairwise comparison (LCES).** Zero-shot pairwise scoring massively beats absolute scoring on weak
  models: Llama-3.1-8B ASAP **0.194 → 0.670 QWK**; GPT-4o-mini TOEFL11 0.122 → 0.658. Also **cuts
  model-sensitivity** (QWK SD across models 0.021 vs 0.072 MTS vs 0.122 vanilla). Source:
  https://arxiv.org/abs/2505.08498
  - ⚠️ **Caveat:** pairwise/forced-choice **overstates** quality differences — judges pick decisive
    winners even when their own scalar scores are statistically indistinguishable. Use pairwise for
    *ranking/anchoring*, not as proof of a real gap. Source: arXiv 2606.13685.
- ✅ **Multi-sample averaging/voting — but 2 samples is the sweet spot.** Reliability gain is concave:
  1→2 raters is the big jump, 2→3 adds almost nothing. (For hard *binary* judge verdicts, more trials
  help — 1 trial matches a 50-trial reference only 86.6% of the time — but essay *scores* saturate at
  ~2.) → **a 2-sample design captures most of the benefit cheaply.** Sources: arXiv 2507.19980,
  2606.13685.
- ⚠️ **Rubric self-refinement vs human samples.** Prompting the model to reflect on discrepancies with
  human scores improved agreement **+0.19–0.47 QWK**; an auto-refined rubric matched hand-authored
  ones. Needs a set of human-scored samples → a *later* phase, not v1. Source: arXiv 2510.09030.
- ✅ **Structured/JSON output + chain-of-thought-before-score** are standard, cheap, and stack with the
  above (evidence-quote step ≈ CoT). Already used by the app's graders.

### Ceiling reality (frame every grade as approximate)
- ⚠️ Even frontier LLMs grade **below trained humans**: AP Chinese generalizability coef **0.71 (AI)
  vs 0.81 (human)**; general AES **QWK ~0.68 vs human ~0.75+**. Sources: arXiv 2507.19980, ACM
  10.1145/3709026.3709030. → grades are **practice feedback, not authority.**

### → Design implication (spec §2.6)
Build a **budget-aware** harness behind `instruct.js`: default cheap (single/few-call), opt-in thorough
(per-trait decomposition + 2-sample + evidence-quote); the free-Gemini ~9–10 call/day cap means
call-count is the real constraint, so degrade gracefully and disclose the tradeoff. Gate every change
on `scripts/ai-tier-eval` (QWK up, over-praise not worse). Same decompose-and-verify pattern upgrades
Cikgu Maya's confidence-gate into a self-check.

## Raw workflow output (for archaeology)
Full extracted-claims JSON (pre-crash, unverified verifier phase):
`/private/tmp/.../tasks/wh1e4qhro.output` (session-local; 25 claims, all with sources).
