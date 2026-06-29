# Eval-tuning loop — design (2026-06-29)

**Status: DESIGN, awaiting Kheshav's approval. No code until approved.**
The autoresearch *pattern* (iterate → measure → keep/discard against a fixed metric, bounded
edit surface, fixed budget) applied to the one place it's genuinely safe + useful here: **tuning
an AI-grader prompt against your existing eval metrics, off the ship path.**

## Why this surface (and not the app)

A bad autoresearch experiment is *discarded* — zero cost. A bad experiment on your **app** can
*ship to a student* (the app auto-deploys from `main`). So the loop must run where a bad iteration
is harmless: the **AI eval harness** (`scripts/ai-tier-eval/`). There the artifact under test is a
*prompt*, the metrics are already computed (`overPraiseRate`, `recallBySegment` in `score.mjs`),
and nothing reaches production until a human approves the winning variant.

## autoresearch → eval-loop mapping

| autoresearch | this loop |
|---|---|
| agent edits `train.py` | loop swaps a **candidate prompt fragment** (never the shipped file) |
| fixed 5-min wall-clock budget | fixed **API-call budget** (`MAX_CALLS`) — quota is the scarce resource |
| metric `val_bpb` (lower=better) | **lexicographic objective** (below) |
| keep if better, else discard | keep if it beats baseline on **tune AND holdout**, else discard |
| ~100 runs overnight | bounded `MAX_VARIANTS` (default small — quota-gated) |
| `program.md` = human-tuned instructions | the **strategy list** of prompt-variant ideas (human-curated) |

## The objective function (the `val_bpb` analog) — lexicographic, guardrail first

Over-praise is a **safety** metric: a grader that praises an off-topic/weak essay is the
worst failure for a learning tool (confident-wrong — CLAUDE.md). Recall is the **quality** metric.
So the score is NOT a single blend (a blend lets a variant "buy" recall with over-praise):

1. **Guardrail (hard):** `overPraiseRate` must be **≤ baseline** (target 0). Any variant that
   raises over-praise is **rejected outright**, regardless of recall.
2. **Among guardrail-passing variants:** maximize **judge/semantic recall** (`recallBySegment`),
   tie-broken by lower over-praise then fewer false-positives (`aggregateWriting`).

A variant "wins" only if it strictly improves recall with over-praise still 0 — on **both** the
tune split and the held-out split.

## Tunable surface (bounded, non-shipping)

- The agent edits **only** the examiner-instruction text — specifically the anti-over-praise /
  trait-rubric / band-descriptor sections that `buildWritingGradePrompt({ formatHints, metrics,
  findings, task, lang })` (`src/lib/writingGradePrompt.js`) assembles.
- It does this via a **candidate override** passed into the eval harness — it does **NOT** write
  to `src/lib/writingGradePrompt.js`. The shipped prompt's **parity invariant** (no-task/no-lang
  text byte-identical, pinned by `src/lib/__tests__/writingGradePrompt.test.js`) is untouched
  during tuning.
- Output keys stay fixed (the harness + app parse `content_band`, `task_coverage`, `req_i`, …) —
  the loop tunes *wording/rubric/few-shot*, never the JSON contract.

## The loop (deterministic orchestration; the agent only proposes wording)

```
baseline = run_eval(shipped_prompt)            # over-praise + recall on tune & holdout
for each variant in strategy_list (until MAX_VARIANTS or MAX_CALLS):
    candidate = apply(variant, shipped_prompt) # e.g. "add explicit off-topic→floor rule"
    m = run_eval(candidate)                    # subset, low N, paced
    keep if m.overPraise <= baseline.overPraise AND m.recall > best.recall
           AND holds on BOTH tune + holdout
    else discard
emit: ranked log + winning variant as a DIFF PROPOSAL (+ measured deltas)
```

Seed `strategy_list` (human-curated, the "program.md" of this loop): explicit
"off-topic answers score to the floor", tightened band boundaries, one canonical few-shot
(on-task vs fluent-off-task), reordered rubric, an explicit "do not reward fluency alone" line.

## Overfitting guard (the biggest risk — be honest)

- Split each gold set into **tune** and **holdout** (e.g. 60/40). A win must hold on **both**.
- **Caveat:** gold sets are small (~10 essays). A win on 6 tune + 4 holdout is *suggestive, not
  proven* — the spec's honest limit. A trustworthy loop wants a **bigger gold set first**
  (authored, Kheshav-reviewed for Malay). Flagged, not hidden.

## Cost guardrail (the fixed-budget discipline — money + quota)

- Each eval run ≈ `essays × EVAL_N` Gemini calls. Free tier ≈ 9 calls/day → a multi-variant loop
  is **infeasible on free quota** and **costs real money on a paid key**.
- Therefore: **hard `MAX_CALLS` cap**, tiny subset (e.g. 5 essays), `EVAL_N=1` during search
  (re-validate the winner at `N=3`), reuse `EVAL_PACE_MS` pacing + `geminiClient.mjs`. The loop
  **logs calls spent + variants skipped** (no silent truncation) and stops at budget.
- Uses the **owner's key only** (BYOK; never the shared env key) — same rule as `instruct.js`.

## Safety boundary (propose, never apply)

- The loop is **read-only w.r.t. the app**: it emits a ranked log + the winning prompt **diff** +
  its measured deltas. It NEVER edits `writingGradePrompt.js` or deploys.
- Applying a winner is a **separate human-approved step**: edit the shipped prompt, deliberately
  re-pin `writingGradePrompt.test.js`, run the full gate, and re-run the eval at full `N` as the
  ship gate (same bar as the 2026-06-28 Malay Content gate).

## Non-goals (v1)
No auto-apply, no auto-deploy, no overnight unattended runs (deploy-path risk), no new model
training, no tuning of the JSON output contract. Start with **one** surface, not all.

## Decisions to confirm (Kheshav)
1. **Budget** (money/quota — yours to set): paid key + a `MAX_CALLS` cap (e.g. 60), or stay
   free-tier (then the loop is a 1–2-variant smoke, not a real search)?  *Recommend:* paid key,
   `MAX_CALLS=60`, 5-essay subset, `EVAL_N=1` search → `N=3` winner re-validate.
2. **First surface:** `content` (over-praise, the safety axis) or `writing` (recall)?
   *Recommend:* `content`/over-praise — it's the safety metric and already has a clean baseline
   (10/10 within ceiling, 0% over-praise) to beat without regressing.
3. **Gold-set growth** before trusting wins? *Recommend:* yes, but as a fast-follow — v1 proves
   the loop mechanics on the existing set, labelled "suggestive."

## Done criteria (for the eventual build, after approval)
Loop runs within `MAX_CALLS`, emits a ranked log + a winning prompt diff + tune/holdout deltas,
applies nothing, costs ≤ the set budget, and a dry-run (no key) validates the orchestration +
scoring without spending. Pure scoring/selection logic is unit-tested (red-proofed). Spec +
RESUME_HERE updated when built.
