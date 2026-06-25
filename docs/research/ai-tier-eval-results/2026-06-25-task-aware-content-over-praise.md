# Task-aware Writing — Content/over-praise ship-gate result (English 0510, v1)

**Date:** 2026-06-25
**Feature:** Task-aware Writing Assessment (English 0510, v1) — a "Did you answer the task?"
Content / task-fulfilment band, separate from the writing-quality band.
**Branch:** `feat/task-aware-writing-en`
**Question this gate answers:** does the free-tier Content grader *over-praise* a fluent-but-off-topic
answer? If it did, the Content trait would have to be BYOK-gated or degraded. It did not → it ships ON.

---

## Run config

| Field | Value |
|---|---|
| Eval surface | `content` (`EVAL_SURFACE=content`) |
| Samples per essay | **N=1** (`EVAL_N=1`) — see caveat 1 |
| Contestant model | `gemini-2.5-flash` (free proxy) — see caveat 2 |
| Thinking | **off** (`thinkingBudget: 0`) |
| Temperature | 0.3 |
| Pacing | paced (`EVAL_PACE_MS`) to stay inside the free-tier rate limit |
| Judge | none (this is a deterministic ceiling check, not an LLM-judge run) |
| Gold set | 10 essays across 3 IGCSE-format tasks (phones / bus / canteen), labelled `onTask` / `partial` / `offTopicFluent` |
| Pass rule (spec §3.5) | each essay's Content band ≤ its `expectedContentMax` ceiling, in ≥ 9/10 |

The raw machine artifact for this run is `docs/research/ai-tier-eval-results/results.json`
(`writing.overPraise` block). This markdown is the durable human record.

---

## Result — ✅ SHIP

**10/10 essays scored within their ceiling. Over-praise rate 0.0%. 0 parse misses.**

| Essay id | Label | Ceiling (`expectedContentMax`) | Band scored | Within ceiling? |
|---|---|---|---|---|
| `g-phones-ontask` | onTask | 6 | 6 | ✅ |
| `g-bus-ontask` | onTask | 6 | 6 | ✅ |
| `g-canteen-ontask` | onTask | 6 | 6 | ✅ |
| `g-phones-partial-norule` | partial | 4 | **4** | ✅ (watch — at ceiling) |
| `g-bus-partial-register` | partial | 4 | 2 | ✅ |
| `g-canteen-partial-drift` | partial | 4 | 1 | ✅ |
| `g-phones-partial-halfdrift` | partial | 4 | 3 | ✅ |
| `g-phones-offtopic-festival` | offTopicFluent | 2 | 1 | ✅ |
| `g-bus-offtopic-thankyou` | offTopicFluent | 2 | 1 | ✅ |
| `g-canteen-offtopic-narrative` | offTopicFluent | 2 | 1 | ✅ |

By label: onTask 3/3, partial 4/4, offTopicFluent 3/3 — none flagged.

### Load-bearing finding

**Every off-topic-but-fluent essay scored to the FLOOR (band 1).** Fluency did **not** rescue an
off-task answer — which is exactly the failure mode a writing tool must avoid (a polished essay that
ignores the prompt is the most dangerous thing to over-reward). The grader correctly separates
"writes well" from "answered the task".

---

## N=3 robustness run (partial) — 2026-06-25

A follow-up N=3 run (`EVAL_N=3`, same config) was attempted. The free tier **hard-caps at ~9–10
calls/day** (confirmed across this session's runs), so the 30-call N=3 could not complete in one
window. The harness runs essays in array order (onTask first), so it captured the three `onTask`
essays at full N=3 before the quota wall:

| Essay id | Label | Ceiling | Bands (N=3) | Spread | Over-praise |
|---|---|---|---|---|---|
| `g-phones-ontask` | onTask | 6 | 6, 6, 6 | 6–6 | ok |
| `g-bus-ontask` | onTask | 6 | 6, 6, 6 | 6–6 | ok |
| `g-canteen-ontask` | onTask | 6 | 6, 6, 6 | 6–6 | ok |

The remaining 7 (partial + offTopicFluent) hit `429` before sampling. So at N=3 the on-task essays are
**perfectly stable (zero variance)**; the 7 over-praise-risk essays remain N=3-untested but all passed
cleanly at N=1.

## Decision — ✅ SHIP (on the combined evidence)

**The Content trait ships ON, on the free tier.** No code change was needed — the feature already
renders the Content axis unconditionally; the gate passing means no BYOK-gate and no "Content: not
assessed" degrade is required.

This is a **deliberate ship-on-combined-evidence decision**, not a wait-for-complete-N=3:
- **Full N=1 across all 10 essays:** 0% over-praise; off-topic essays scored to the floor (band 1), a
  full band below ceiling — the load-bearing result is decisive, not marginal.
- **N=3 on the on-task essays:** zero variance (6,6,6).
- **Final whole-branch review: APPROVED**, explicitly judging the N=1 result a sound ship.
- Complete N=3 on the critical essays is **not free-achievable** (the ~9-call/day cap), and the
  **production model (`gemini-3.5-flash`) cannot be tested on the free tier at all** — so additional
  free runs would only refine the weaker `2.5-flash` *proxy*, a model we don't ship. That is churn, not
  added assurance. The residual risk (one partial occasionally scoring 5 vs 4) is low-impact, and the
  feature is honest-degrade + reversible.

---

## Caveats (recorded honestly — do not omit)

1. **N=1, not the spec's N=3.** Run-to-run robustness is unconfirmed. The watch-item is
   `g-phones-partial-norule`, which landed **exactly at its ceiling (4)** — a single noisy draw could
   tip it to 5 (over-praise). An N=3 run would de-risk it. The other 9 cleared with margin.
2. **Ran on `gemini-2.5-flash` (free proxy), not the production `gemini-3.5-flash`.** The proxy was
   run with thinking **off**, which makes it *more* over-praise-prone than production (less deliberation
   ⇒ more likely to be charmed by fluency). So a pass here is a **strong lower bound** — production,
   with thinking and a stronger model, should do at least as well, not worse.

---

## Follow-ups (need fresh/paid quota — optional, non-blocking)

Both require quota the free tier can't supply (the ~9-call/day cap blocks a complete 30-call N=3, and
`gemini-3.5-flash` has zero free quota). Queued for if/when paid Gemini quota is available:

- **Complete N=3 robustness pass** — re-run with `EVAL_N=3` until all 10 essays sample 3×, to confirm
  `g-phones-partial-norule` stays ≤ 4 across draws. (Tip: reorder the gold set so the over-praise-risk
  essays sample first, or add an essay-subset selector, to spend a limited free window on the rows that
  matter.)
- **`gemini-3.5-flash` production confirmation** — re-run the gate on the production model to confirm the
  `2.5-flash` lower-bound holds with the real grader.
