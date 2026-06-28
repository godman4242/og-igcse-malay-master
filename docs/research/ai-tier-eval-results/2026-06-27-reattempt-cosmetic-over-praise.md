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

## Status — 🟡 SUBSET SMOKE CLEAN (2026-06-28); full gate of record still pending

A **subset keyed run** (5 of 10 pairs, `EVAL_SAMPLE_N=5`, N=1, owner's key, `gemini-2.5-flash`) ran on
2026-06-28 and came back **clean on quality**: **0/4 cosmetic over-praise, 1/1 real-improvement
detection** (full numbers + per-pair table in "Result" below). The harness printed ⛔ — but that is the
**sample-size floor** (`ships` requires `cosmeticTotal >= 6` in `harness.mjs`; the subset carried only 4
cosmetic pairs), **NOT** a quality failure (both quality clauses — over-praise ≤ 1, recall ≥ 50% —
passed). So the confident "you improved" copy in `ReattemptPanel.jsx` **STANDS (not degraded)** on strong
provisional evidence; the **full 10-pair run is still the gate of record** (16 unique-essay calls — needs
~2 free days or 1 paid day; the day's free quota was spent on this subset). The harness's verdict line was
also fixed this session to print `🟡 NOT A FULL DECISION` for a clean small subset, so it no longer reads
as a degrade trigger.

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

## Result — 2026-06-28 subset smoke (5 of 10 pairs, N=1) — 🟡 CLEAN, full gate of record still pending

Run with the owner's key: `EVAL_SURFACE=reattempt EVAL_N=1 EVAL_SAMPLE_N=5 EVAL_PACE_MS=6000` on
`gemini-2.5-flash` (10 Gemini calls — the day's free quota). 5 pairs sampled: **4 cosmetic + 1 real.**

| id | label | targetReq | band before→after | reqMet before→after | looksImproved | verdict |
|---|---|---|---|---|---|---|
| `phones-norule-cosmetic` | cosmeticEdit | 2 | 3→2 | false→false | no | ok |
| `phones-fence-cosmetic` | cosmeticEdit | 0 | 2→2 | true→true | no | ok |
| `bus-onerequest-cosmetic` | cosmeticEdit | 2 | 4→4 | true→true | no | ok |
| `bus-informal-cosmetic` | cosmeticEdit | 3 | 2→2 | false→false | no | ok |
| `canteen-noevidence-real` | realImprovement | 1 | 2→3 | false→true | **YES** | detected |

- **Cosmetic over-praise: 0/4 (0.0%)** — target ~0. The dangerous direction is **ZERO**: no cosmetic
  edit looked improved, and 3 of the 4 held or dropped the band (none rose).
- **Real-improvement recall: 1/1 (100%)** — the one genuine fix was detected (band 2→3, the missed
  requirement flipped ✗→✓).
- **Harness verdict: ⛔ — a SAMPLE-SIZE floor, NOT a quality failure.** `ships` requires
  `cosmeticTotal >= 6`; this subset had only 4 cosmetic pairs, so the gate correctly declined to call a
  full decision. Both QUALITY clauses (over-praise ≤ 1, recall ≥ 50%) **passed**.

### Decision — DO NOT degrade; complete the full run for the gate of record

The subset is a **smoke that came back clean** (caveat 4): positive evidence the confident copy is **not**
over-praising, but not yet the gate of record. The decision tree's ⛔-degrade branch is for a **quality**
failure (over-praise > 1 OR recall < 50%) — neither occurred — so the `ReattemptPanel.jsx` copy
**STANDS**. The gate of record is the **full 10-pair N=1 run (16 unique-essay calls)**; today's subset
spent the day's ~10 free calls, so complete it across two free days (drop `EVAL_SAMPLE_N`) or in one paid
day. Real-world exposure stays near-zero meanwhile (opt-in; fires only on a 2nd analyze of the same task).

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
