# Task-aware Writing — Content/over-praise ship-gate result (Malay 0546, v1)

**Date:** 2026-06-28
**Feature:** Task-aware Writing Assessment (Malay 0546, v1) — a "Adakah anda menjawab
tugasan?" / "Did you answer the task?" Content / task-fulfilment band, separate from the
writing-quality band. Mirrors the shipped English 0510 feature (`2026-06-28` build).
**Question this gate answers:** does the free-tier grader, given a **Bahasa Melayu Kertas 2
examiner** prompt, *over-praise* a fluent-but-off-task **Malay** answer? Malay is lower-resource
for LLMs, so this gate is genuinely load-bearing — if a fluent off-task essay beat its ceiling,
the Malay Content trait would have to be BYOK-gated or honest-degraded. **It did not → it ships ON.**

---

## Run config

| Field | Value |
|---|---|
| Eval surface | `content` (`EVAL_SURFACE=content`) |
| Language | **`malay`** (`EVAL_LANG=malay`) — Malay 0546 gold set + Bahasa Melayu Kertas 2 examiner prompt |
| Samples per essay | **N=1** (`EVAL_N=1`) — see caveat 1 |
| Contestant model | `gemini-2.5-flash` (free proxy) — see caveat 2 |
| Thinking | minimal (`thinkingConfigForGrade`) |
| Temperature | 0.3 |
| Pacing | `EVAL_PACE_MS=6000` to stay inside the free-tier rate limit |
| Judge | none (deterministic ceiling check, not an LLM-judge run) |
| Gold set | 10 essays across the 3 Malay tasks (surat rasmi / laporan / rencana), labelled `onTask` / `partial` / `offTopicFluent` |
| Pass rule | each essay's Content band ≤ its `expectedContentMax` ceiling, in ≥ 9/10 |

Command:

```bash
GEMINI_KEY=AIza... EVAL_LANG=malay EVAL_SURFACE=content EVAL_N=1 EVAL_PACE_MS=6000 \
  node --import ./scripts/lib/extless-resolver.mjs scripts/ai-tier-eval/harness.mjs
```

---

## Result — ✅ SHIP

**10/10 essays scored within their ceiling. Over-praise rate 0.0%. 0 parse misses.**

| Essay id | Label | Ceiling (`expectedContentMax`) | Band scored | Within ceiling? |
|---|---|---|---|---|
| `g-surat-ontask` | onTask | 6 | 6 | ✅ |
| `g-laporan-ontask` | onTask | 6 | 6 | ✅ |
| `g-rencana-ontask` | onTask | 6 | 6 | ✅ |
| `g-surat-partial-register` | partial | 4 | 1 | ✅ |
| `g-laporan-partial-drift` | partial | 4 | 1 | ✅ |
| `g-rencana-partial-norule` | partial | 4 | 2 | ✅ |
| `g-rencana-partial-halfdrift` | partial | 4 | 1 | ✅ |
| `g-surat-offtopic-terimakasih` | offTopicFluent | 2 | 1 | ✅ |
| `g-laporan-offtopic-naratif` | offTopicFluent | 2 | 1 | ✅ |
| `g-rencana-offtopic-sukan` | offTopicFluent | 2 | 1 | ✅ |

By label: onTask 3/3 within ceiling · partial 4/4 · offTopicFluent 3/3. The three genuinely
strong, on-task Malay essays were correctly awarded band **6**; **no** fluent off-task or
register-wrong essay was rescued by its fluency. The raw artifact is
`docs/research/ai-tier-eval-results/results.json` (`content` block).

---

## Observations & caveats

1. **N=1 (single sample).** Like the English v1 gate, this is a free-quota smoke (10 calls fit
   the ~9–10/day free cap). It is a strong signal but not a robustness measurement. **Follow-up
   (quota permitting):** an `EVAL_N=3` pass to confirm the bands are stable across draws.
2. **Free proxy model.** Run on `gemini-2.5-flash` (the only model with free quota); production
   uses `gemini-3.5-flash`. The free proxy is a reasonable lower bound — a stronger prod model is
   unlikely to over-praise *more*. **Follow-up:** a `gemini-3.5-flash` confirmation on paid quota.
3. **Grader is harsh on `partial`, not lenient.** The partial essays scored 1–2 against a ceiling
   of 4 — i.e. the grader *under-credits* on-topic-but-incomplete Malay answers rather than
   over-crediting them. For an over-praise gate this is the **safe** direction (the dangerous
   failure — false confidence on an off-task answer — did not occur). But under-scoring a 3/4-
   requirements answer at band 1 is its own calibration concern worth checking in the N=3 pass;
   it does **not** block shipping the trait (over-praise was the ship criterion, and it is 0%).

## Decision

**Ship the Malay 0546 Content trait ON.** Gate met (≥ 9/10 within ceiling; 0% over-praise).
No degrade / BYOK-gate needed. Honest-degrade paths (local band only, no fabricated Content
number) remain in place for the AI-unavailable case.
