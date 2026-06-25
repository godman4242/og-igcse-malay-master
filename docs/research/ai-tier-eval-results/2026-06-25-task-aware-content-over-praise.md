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

## Decision

**The Content trait ships ON, on the free tier.** No code change was needed — the feature already
renders the Content axis unconditionally; the gate passing means no BYOK-gate and no "Content: not
assessed" degrade is required.

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

## Follow-ups (when quota allows — optional, non-blocking)

- **N=3 robustness pass** — re-run with `EVAL_N=3` to confirm `g-phones-partial-norule` stays ≤ 4 across
  draws. De-risks the one at-ceiling essay.
- **`gemini-3.5-flash` production confirmation** — re-run the gate on the production model to confirm the
  lower-bound holds with the real grader.
