# Act-on-feedback re-attempt — improvement-detection ship-gate result (English 0510, v1)

**Date:** 2026-06-27
**Feature:** Act-on-feedback loop (Writing, English 0510) — the "Improve your answer" re-attempt that,
on resubmit of the same task, shows an honest **before→after** (Content band change + which ✗ flipped
to ✓) and reports "you improved" **only on a real, earned change**.
**Question this gate answers:** can the free-tier grader be **gamed by a cosmetic edit** — a trivial
re-wording that does NOT newly satisfy the missed requirement — into raising the Content band or flipping
a requirement ✗→✓? If it can, the "you improved" claim would be over-praise and must **degrade** to a
neutral "re-graded — review your requirements". If it can't, the confident claim ships.

This is the improvement-layer twin of the **2026-06-25 Content over-praise gate**
(`2026-06-25-task-aware-content-over-praise.md`), which proved the grader scores *absolute* off-task
answers correctly (0% over-praise). This gate tests a **different** property: cosmetic-*delta*
sensitivity (a grader can be accurate on absolutes yet noisy on small edits).

---

## Status — ⏳ KEYED GATE PENDING (owner's Gemini key)

The eval harness, gold set, and scoring are **built, unit-pinned, and dry-run-validated**. The **keyed
run was NOT executed in the build session** (no `GEMINI_KEY` was available to the implementer — house
rule: the run uses the owner's own key, his cost). The confident "you improved" copy is **live in code**
(`ReattemptPanel.jsx`) but is **NOT yet validated against this gate** — running it is the remaining ship
condition (see "How to run" + "Decision tree" below).

### What IS verified (no key needed)

| Check | Result |
|---|---|
| Gold-set well-formedness (vitest, in the gate) | ✅ 10 pairs, 6 cosmetic / 4 real, every pair → real task + valid `targetReq`, every real shares a `before`+`targetReq` with a cosmetic (the edit is isolated) |
| Scoring math (`reattemptVerdict` / `reattemptSummary`, vitest, mutation-tested) | ✅ 8 tests; `looksImproved` = band rose OR majority ✗→✓ flip; median band + majority coverage are robust to a single flaky sample (proven by a deliberate mutation that turned the robustness tests red) |
| Harness dry-run (`EVAL_SURFACE=reattempt`, no key) | ✅ built 16 unique parity prompts (~3920 chars avg) via the **shipped** `buildWritingGradePrompt` (parity invariant); gold-set integrity gate passed; cost math printed |

---

## Run config (for the keyed run)

| Field | Value |
|---|---|
| Eval surface | `reattempt` (`EVAL_SURFACE=reattempt`) — explicit-only; never part of the default all-surfaces run |
| Gold set | 10 pairs across the 3 IGCSE tasks (phones / bus / canteen), 6 `cosmeticEdit` + 4 `realImprovement`, weighted to subtle cosmetic edits |
| Unique essays | **16** (6 shared `before` + 10 `after`) — the harness grades each unique essay **once** (deduped) to conserve free quota |
| Samples per essay | `EVAL_N` (default 3); **N=1 = 16 calls**, N=3 = 48 calls |
| Contestant model | `gemini-2.5-flash` (free proxy); production is `gemini-3.5-flash` (zero free quota) |
| Thinking | minimal (per-family `thinkingConfigForGrade`) |
| Temperature | 0.3 |
| Pacing | `EVAL_PACE_MS=6000` between calls (free per-minute limit) |
| Comparison rule | per pair: median band before vs after + majority `req_{targetReq}` coverage; `looksImproved` = band rose OR ✗→✓ flip (the SAME real-change rule the product's `compareAttempts` uses) |

### Pinned ship gate (spec §4 / §5.4)

> **Cosmetic over-praise ≤ 1 of the 6 cosmetic pairs (≥ 5/6 cosmetic edits do NOT look improved)
> AND real-improvement recall ≥ 50%** → the "you improved" claim ships. Else **degrade** the comparison
> verdict to a neutral "re-graded — review your requirements" (no improvement claim), or BYOK-gate it.

---

## How to run the keyed gate

Free Gemini quota ≈ **9–10 calls/day** ([[reference_gemini_free_quota_eval]]). A full N=1 run is **16
calls** — just over one free day. Two ways to get the verdict:

**A. Quota-fitting smoke (free, one day) — a ~5-pair subset:**
```bash
GEMINI_KEY=AIza... EVAL_SURFACE=reattempt EVAL_N=1 EVAL_SAMPLE_N=5 EVAL_PACE_MS=6000 \
  node --import ./scripts/lib/extless-resolver.mjs scripts/ai-tier-eval/harness.mjs
```
`EVAL_SAMPLE_N=5` spreads 5 of the 10 pairs (≈8 unique essays ≈ 8 calls). Partial, not the final
decision — but it surfaces any gross cosmetic over-praise cheaply.

**B. Full N=1 (16 calls — run across two free days, or one paid day):**
```bash
GEMINI_KEY=AIza... EVAL_SURFACE=reattempt EVAL_N=1 EVAL_PACE_MS=6000 \
  node --import ./scripts/lib/extless-resolver.mjs scripts/ai-tier-eval/harness.mjs
```

Read the **`[Re-attempt · improvement detection]`** table + the `DECISION GATE` line it prints. The raw
artifact lands in `docs/research/ai-tier-eval-results/results.json` (`reattempt.summary` block).

---

## Decision tree (what to do with the verdict)

- **✅ Gate met** (`✅ SHIP — gate met.`): the confident "you improved" copy in `ReattemptPanel.jsx`
  is validated — **no code change**, the feature stands as shipped. Paste the table + over-praise/recall
  numbers into this doc's "Result" section.
- **⛔ Gate NOT met** (cosmetic over-praise > 1, or real recall < 50%): **degrade** — change the
  `ReattemptPanel` comparison line from "You now meet N more requirements" / "Unchanged…" to a neutral
  "Re-graded — review your requirements." (a one-line copy change, no logic change), and re-run the gate
  to confirm the absolute Content scoring still holds. Record the failing pairs here.

---

## Result — (paste after the keyed run)

> _Not yet run with a key. Fill this section with the per-pair table + over-praise rate + real-recall +
> the SHIP/DO-NOT-SHIP verdict once the keyed gate has been executed._

---

## Caveats (recorded honestly — do not omit)

1. **Keyed gate not yet run.** Everything except the live Gemini verdict is verified (gold set, scoring
   math with a mutation proof, dry-run parity prompts). The confident copy is unvalidated until the
   keyed run; real-world exposure is currently near-zero (the loop only triggers on a *second* analyze of
   the *same* task, on a 2-day-old opt-in feature), which is why the code shipped ahead of the verdict —
   but the verdict is the gate, not a formality.
2. **Free proxy ≠ production model.** Like the 2026-06-25 gate, the free run uses `gemini-2.5-flash`
   (production is `gemini-3.5-flash`, zero free quota). Minimal-thinking flash is *more* over-praise-prone
   than production, so a pass here is a **lower bound**.
3. **Median/majority across N.** At N=1 there is no robustness margin (one sample each). N≥2 (paid)
   gives the median/majority their intended noise-rejection; prefer it when paid quota is available.
4. **`EVAL_SAMPLE_N` subset is a smoke, not the decision** — it spreads a subset of pairs and may not
   include every cosmetic case; only the full 10-pair run is the gate of record.
