# AI-tier eval — free (rule-based) vs BYOK (LLM)

**Date:** 2026-06-12 · **Type:** eval (a measuring instrument, not a feature) · **Status:** free-tier dry run DONE; BYOK columns pending a keyed run (see *How to run*).

## TL;DR

The app defaults to **free / rule-based** AI tiers on most surfaces. The quality-debt ledger (#2) called this "BYOK-mitigated" — an *assumption* we never measured. This eval turns it into a number, per surface, and ends in a **decision**: free tier is fine / nudge BYOK harder / improve the free default.

**What the free-tier dry run already proves (no API key, deterministic):** on the writing surface the free Malay grader catches **100% of the errors it is designed for (11/11 regex-catchable) but 0% of semantic grammar errors (0/24)** — wrong-but-valid imbuhan, missing `-kan`/`-i`, comparison `dari/daripada`, cohesion. 24 of 35 realistic planted errors (69%) pass through silently. So the free writing tier isn't a *lesser grammar tutor* — it's a different kind of tool (a spelling + slang checker). That reframes the decision (see §7).

**The BYOK question the keyed run answers:** does the LLM catch those 24 semantic errors **without hallucinating corrections** on already-correct text (the `s-perfect` control)? And on Cikgu, does the LLM's fact-recall beat the free knowledge base's confidently-irrelevant canned answers?

---

## 1. Why eval design is the skill here

This is deliberately built as a worked example of eval design — your #1 frontier skill — so the *how* matters as much as the result. Each choice below names the principle under it. The through-line: **an eval is a measuring instrument; if you don't trust the instrument, you can't trust the number.** Most of the work is making the instrument trustworthy.

## 2. The surfaces and the exact comparators (grounded, not assumed)

The kickoff named comparators that turned out to be wrong — so the first job was grounding against live code (principle: **measure what the app actually does, not a plausible strawman**).

| Surface | FREE tier (what most users get) | BYOK tier (bring-your-own-key) |
|---|---|---|
| **Writing feedback (MS)** | `score()` in `src/lib/writingGrader.js` → findings from `findIssuesMalay` (`writingErrorsMalay.js`) + tips | `writing-feedback-v2` action → an LLM running `buildWritingFeedbackV2Prompt('ms')` (mirrored in `prompts.mjs`) |
| **Cikgu answers** | `searchKnowledge()` → `formatKnowledgeResponse()` (`src/data/cikguKnowledge.js`), as `CikguBot.getExpertResponse` wires it | `chatWithGemini` → `CIKGU_SYSTEM_PROMPT` (`src/core/agent/promptLibrary.ts`) — sent when the user brings a **Gemini** key. **(As of 2026-06-12 this is the unified prompt, identical to the OpenRouter path — was `PROMPT_SYSTEM_IDENTITY` when the dry run was authored; see §8 #2.)** |

Two corrections the kickoff's assumptions needed:
- Writing's AI path does **not** go through `instruct.js`/`callInstruct` (the kickoff's named seam). It goes through `ai.call()` → the edge function (`supabase/functions/ai-proxy/index.ts`). The BYOK prompt is therefore the edge function's `writing-feedback-v2` prompt, mirrored verbatim in `prompts.mjs` (it lives in Deno TS, can't be imported into a node harness — so it's pinned with a "keep in sync" note).
- Cikgu's BYOK path tries **Gemini first** (`chatWithGemini`). At dry-run time its system prompt (`PROMPT_SYSTEM_IDENTITY`) was much thinner than the OpenRouter fallback prompt — the asymmetry was a finding (§8 #2). **Resolved 2026-06-12:** both providers now share `CIKGU_SYSTEM_PROMPT`, so a future keyed run measures the unified (better) prompt.

Roleplay was excluded on purpose: its static evaluator is embedded in the page (`Roleplay.jsx`), hard to isolate as a pure function. Future work.

## 3. Gold sets with planted ground truth

> **Principle: an eval is only as trustworthy as its labels.** Scraped real essays would need manual annotation — subjective and noisy. Authoring synthetic essays with *deliberately planted, catalogued* errors removes annotation ambiguity entirely: we know every error because we put it there.

- **Writing** (`goldWriting.mjs`): 12 IGCSE-Malay essays, 3 ability levels, **35 planted errors**, each tagged `{span, category, correct, note, regexExpected}`. `intendedBand` is the design label.
- **Cikgu** (`goldCikgu.mjs`): 12 questions, each with a `keyFacts[]` checklist — the specific correct facts a good answer must contain (pedagogical ground truth, **not** "what the KB says" — the KB is the contestant, so it can't define its own answer key).

> **Principle: construct-relevant items.** A gold set must probe the *specific* failure mode you suspect, or it can't discriminate between the tiers. Reading `writingErrorsMalay.js` showed the free detector is a **fixed lookup table** (specific wrong-forms: `mempukul`, `disekolah`, `dari pada`, known misspellings, tense-conflict bigrams, formal slang). So every essay deliberately mixes:
> - `regexExpected: true` — errors the lookup *can* hit.
> - `regexExpected: false` — semantic errors it *structurally cannot* hit (wrong-but-valid imbuhan, missing `-kan`, comparison `daripada`, cohesion).
>
> The free-vs-BYOK gap lives almost entirely in the `false` rows. The dry run confirmed the split is clean: free recall was **100% on `true` rows, 0% on `false` rows** — exactly as predicted, which means the instrument cleanly separates the two failure modes.

Essay `s-perfect` has **zero** planted errors — a pure **false-positive control**. Any flag on it is, by construction, over-flagging. (The free tier produced **0** findings on it — good.)

## 4. Objective scoring, judge as validator

> **Principle: count, don't opine.** Scores are objective counts derived from booleans, not an LLM's holistic "which is better."

- **Writing:** *error-recall* = planted errors caught / total; *false-positive count* = corrections made to text that was actually correct.
- **Cikgu:** *fact-recall* = key facts present / total; *wrong-fact count* = incorrect claims made.

The LLM judge's **only** job is the semantic match: "does this feedback address planted error #3?" / "does this answer convey key fact #2?" — because the BYOK output is free-form prose we can't regex-match to the answer key. The judge renders **no** quality opinion.

> **Principle: validate the validator.** A judge you don't audit is a vibe with extra steps. Two safeguards:
> - The harness cross-checks the free tier's judge verdicts against **deterministic span-overlap** (does a free finding's char range overlap a planted error's range? — no model needed). If the judge disagrees with span-overlap on the free tier, the judge is suspect. Reported as `[Judge audit] … agreement`.
> - The **spot-check sheet** (`spot-check.md`) dumps 5 items/surface with both outputs + the judge's call, so you can read them and overrule the judge. That hands-on audit *is* the eval-design lesson.

## 5. Judge-bias controls

1. **Judge ≠ contestant.** `JUDGE_MODEL` defaults to the contestant model but the harness prints a loud ⚠ and stamps `judgeSelfPreferenceRisk: true` when they're equal (models over-reward their own outputs). For the credible run, set `JUDGE_MODEL` to a different — ideally cross-provider — model. The *free* contestant is rule-based (no model), so it carries zero self-preference risk; the risk is only judge-favouring-the-LLM.
2. **Independent ground-truth grading, not A/B** — *a deliberate deviation from the kickoff's "randomized A/B order."* Each candidate is graded **alone** against the answer key; there is no pairing, so position/order bias is structurally **impossible**. A/B randomisation only matters when the judge expresses a *preference* between two outputs. Here the judge only checks objective checklist presence, so independent grading is the *stronger* control. (Principle: **match the bias control to the scoring method.**)
3. **Blind labels.** The candidate is labelled neutrally ("CANDIDATE FEEDBACK"); the judge is never told rule-based vs AI, so it can't apply a prior.
4. **Temperature 0** on judge and contestant for reproducibility. *Deviation logged:* production runs at temp 0.7, so absolute recall may shift a little; the *relative* free-vs-BYOK gap (the decision driver) is robust to this.

## 6. Two metrics we deliberately do NOT use (and why)

> **Principle: know what your metric actually measures — a confound can masquerade as a quality signal.**

- **Band accuracy — EXCLUDED.** The free Malay grader bands every gold essay at **2**, including the near-perfect band-6 ones, because its `content` sub-band is gated on the IGCSE 200–350-word minimum and a hard cap floors short answers (our essays are 41–69 words). Comparing that length-gated band to an LLM's holistic band would measure *length*, not judgment. Essays are kept short on purpose to isolate *error-recall* cheaply; band is captured in `results.json` but not scored. (Side-finding: the free grader severely under-bands short answers — worth a UI note.)
- **Raw free "extra findings" as false positives — NOT the headline.** The free tier also emits valid *style nudges* (e.g. flagging the vague word "benda"). Those aren't errors-falsely-flagged. The headline FP metric is the **judge's** false-positive count (told to count only genuinely-correct text flagged as wrong); extra-findings counts are reported only for transparency.

## 7. Pre-registered decision rule (set BEFORE the keyed run)

> **Principle: pre-register thresholds.** Decide what each number *means* before you see it, so the decision can't become post-hoc rationalisation.

Thresholds (tunable; 15 points ≈ roughly one extra band of feedback coverage):

**Writing**
- Free error-recall within **15 pts** of BYOK **and** free FP ≤ BYOK → **free tier is fine.**
- Gap **≥ 15 pts** and BYOK FP acceptable (**≤ ~1 hallucinated correction/essay**, and **0** on `s-perfect`) → **nudge BYOK harder** + log "improve the free default."
- BYOK FP high (hallucinates corrections, esp. on `s-perfect`/strong essays) → **caution**: BYOK may *damage* learner confidence; do not nudge blindly — fix the prompt first.

**Cikgu**
- Free fact-recall within **15 pts** of BYOK **and** free wrong-facts ≤ BYOK → **free tier is fine.**
- Gap **≥ 15 pts** → **nudge BYOK harder** and/or **improve KB coverage** for the low-recall topics.
- ~~If BYOK (Gemini/`PROMPT_SYSTEM_IDENTITY`) *underperforms* the free OpenRouter-style answers → **fix the thin Gemini prompt** before nudging~~ → ✅ **DONE 2026-06-12**: prompt unified to the detailed `CIKGU_SYSTEM_PROMPT` for both providers (see §8 finding #2), so this asymmetry no longer exists.

**Given the dry run, the writing decision is already leaning:** free recall on semantic errors is 0%, so unless BYOK *also* fails them (it won't) the gap will be large. The real open question the keyed run settles is BYOK's **false-positive cost** — useless if it hallucinates.

## 8. Surprising findings

1. **The free writing tier doesn't attempt grammar.** "BYOK-mitigated" implied a *lesser grammar tutor*. Measured reality: it's a **spelling + slang checker** — 100% on its lookup patterns, 0% on semantic grammar (24/35 planted errors silent). Different *kind* of tool, not a weaker version. This is the headline.
2. **The Gemini BYOK Cikgu prompt is thinner than the free one. → ✅ FIXED 2026-06-12 (prompt unified).** `PROMPT_SYSTEM_IDENTITY` (sent when a user brought a **Gemini** key) was a vague teaching-philosophy identity with no syllabus specifics, no "always give an example" rule, no imbuhan rules — while the **free** OpenRouter `chatWithFreeModel` prompt was far more concrete and pedagogical. A learner who paid for a Gemini key got *worse-structured* tutoring than the free path. **Fix shipped:** both providers now import a single `CIKGU_SYSTEM_PROMPT` (`src/core/agent/promptLibrary.ts`) — the detailed direct-instruction prompt (lead with the answer + mandatory Malay example/EN gloss + name-the-rule + IGCSE 0546 focus); `PROMPT_SYSTEM_IDENTITY` deleted (Socratic stance stays only in the mistake flow, `feedbackGenerator.ts`). Guarded by `src/lib/__tests__/cikguSystemPrompt.test.js` (asserts both providers transmit the shared constant). `CIKGU_BYOK_SYSTEM` here updated to mirror it.
3. **The free grader under-bands short answers to 2 regardless of quality** (the length gate). Minor, but a real UX wart for anyone pasting a paragraph.
4. **A *free* BYOK key is barely usable for daily study — and that reshapes the decision.** Measured 2026-06-12: a free-tier Gemini key allows **20 `generateContent` requests per day, per model** (`quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier`, value 20); some models (`gemini-2.0-flash`) have a free limit of **0**. A student would exhaust 20 calls in one writing/Cikgu session. So "nudge users to bring a key" only mitigates ledger #2 if they bring a **paid** key — the free-key path is a dead end for sustained use. This is a first-class input to the §7 decision, independent of the recall numbers.

## 9. How to run

```bash
# Free tier only (deterministic, no key, no cost) — also QA's the gold set:
npm run eval:ai-tier

# Full comparison (your Gemini key, your cost):
GEMINI_KEY=AIza... JUDGE_MODEL=<a-different-model> npm run eval:ai-tier
```

- **Cost:** free tier = **0 calls / $0**. Full run = **72 Gemini calls** = 24 BYOK contestant (12 writing + 12 cikgu) + 48 judge (each tier's output judged, both surfaces: 2 × 24), ≈150k tokens → **$0 on the Gemini free tier** (within daily limits), **under ~$0.30** on a paid Flash tier. The estimate prints before any call fires.
- **Model quota note:** the newest models (`gemini-3.5-flash`, `gemini-3.x-preview`) have a near-zero *free-tier* allocation — a 72-call run 429s almost immediately on them. Use a workhorse model (`gemini-2.5-flash` contestant, `gemini-2.0-flash` judge) for a paid run.
- **Free-tier recipe (no billing):** a free key caps at **20 req/day/model**. Run a spread *pilot* with `EVAL_SAMPLE_N=4` (4 items/surface, evenly across weak/mid/strong) → 8 contestant + 16 judge calls. Put the contestant on one *fresh* model and the judge on a *different* fresh model so each stays ≤ 20/day:
  ```
  GEMINI_KEY=AIza... EVAL_SAMPLE_N=4 GEMINI_MODEL=gemini-2.5-flash JUDGE_MODEL=gemini-2.0-flash npm run eval:ai-tier
  ```
  A pilot is directional, not the final decision — but it produces a real `spot-check.md` to audit and a first read on the gap. Quota resets daily (~midnight Pacific), so you can also spread the full run across days/models.
- **Env:** `GEMINI_KEY` (or `GEMINI_API_KEY`); `GEMINI_MODEL` (default `gemini-2.5-flash`); `JUDGE_MODEL` (default = contestant — set it different for a credible judge). Keys are env-only, never committed.
- **Outputs** (`docs/research/ai-tier-eval-results/`): `results.json` (full), `results.csv` (per-item flat), `spot-check.md` (audit the judge). The console prints the win-rate tables.

## 10. Results

### Free-tier dry run (done, deterministic)

Writing, free-tier recall by error segment:

| Segment | Caught | Total | Recall |
|---|---|---|---|
| regex-catchable | 11 | 11 | **100.0%** |
| semantic (regex-blind) | 0 | 24 | **0.0%** |

False positives on the `s-perfect` control: **0**. Judge audit / BYOK columns / Cikgu fact-recall: **pending the keyed run.**

**Keyed run status (2026-06-12): attempted, BLOCKED by free-tier quota.** The harness ran correctly — 3 of 12 writing BYOK comparisons completed (real contestant + 2 judge calls each) before the key hit `RESOURCE_EXHAUSTED`. The free Gemini tier is **20 requests/day/model** (some models limit 0), and a full run needs ~24 calls on a single contestant model, so it cannot complete on a free key. **The full numbers need a billing-enabled key** (this run is ~$0.10–0.20 on paid Flash) **or** a multi-day, multi-model spread. The pipeline itself is verified end-to-end; only the quota is the blocker.

### Full comparison (fill after `GEMINI_KEY` run)

| Surface | Tier | Recall | False/Wrong | Decision |
|---|---|---|---|---|
| Writing | FREE | _ | _ | _ |
| Writing | BYOK | _ | _ | _ |
| Cikgu | FREE | _ | _ | _ |
| Cikgu | BYOK | _ | _ | _ |

_Judge audit agreement (free, judge vs span-overlap): ___ %  ·  Judge self-preference risk: ____

## 11. Limitations & future work

- **Synthetic, short essays** (41–69 words) isolate error-recall cheaply but aren't full IGCSE-length; band accuracy is therefore not measurable here. A longer-essay follow-up would let band be scored.
- **Mirrored prompts** (`WRITING_BYOK_SYSTEM`, `CIKGU_BYOK_SYSTEM`) are copied from product code that can't be imported (Deno TS / `.ts`); if those change, update `prompts.mjs` (pins say where).
- **Single judge model.** A credible run should set a cross-provider `JUDGE_MODEL`; an even stronger design would use a 3-judge majority (cheap to add — the judge call is already isolated).
- **Roleplay not covered** (page-embedded evaluator). Generalising the harness to it is the natural next eval.
