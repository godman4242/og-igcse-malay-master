# 🎯 Build-loop GOAL — the north-star the autonomous loop optimizes

> **This file IS the loop's intent.** Every cycle (`scripts/build-loop.sh` → each fresh process reads
> `docs/LOCAL_BUILD_LOOP.md`) reads THIS first and works toward the goal below.
> **To re-steer the loop, edit THIS file** — change the north-star or the axes and the next fresh cycle
> obeys it. No code change needed. Keep it tight and scannable (it is read every cycle).

## North-star

Make **IGCSE Malay Master** the best possible IGCSE **Malay (0546)** + **English (0500 / 0510)**
revision website — measured by how much it actually improves a student's exam outcome per minute spent.
**Keep improving until no axis below has a real, evidenced gap left.** "Best" = the axes below, **not
vibes**.

## How each cycle works against this goal (the anti-drift contract)

Before building anything, the cycle MUST:

1. **Assess** the live app against the 6 axes → a short **gap list**, each with **concrete evidence**:
   a real `file:line`, a reproducible behaviour, a **web-verified** wrong content item, or a measured
   number over budget. No evidence ⇒ not a gap.
2. **Pick the single biggest gap** by the priority order below that also passes the HARD invariant screen.
3. **Anti-hallucination gate** — you may ONLY build a gap that is ALL of:
   - **Real** — you can point to the concrete evidence above; never "this might help" or a guess.
   - **Measurable Done** — an observable pass/fail: a failing test that turns green, a number that moves
     past a stated threshold, a rendered element that now appears. **Never "make it nicer".**
   - **Verified** — every Malay/English gloss, grammar rule, or fact is checked against an authority on
     the web before shipping. A confident-**WRONG** change to a learning tool is worse than no change.
4. **If NO gap clears the bar → make NO commit.** Report `no gap above bar on any axis` + the closest
   candidate you considered, and let the shell back off. **This is the correct, desired outcome when the
   app is already good — it is the realization of "stop only when it cannot be improved." An idle, honest
   cycle BEATS a prod-deployed churn commit.**

## The 6 axes (priority order — break ties top-down)

1. **Correctness & content truth** *(highest)* — a broken study mode, crash, or state bug; OR a Malay/
   English gloss, grammar rule, or exemplar that is **verifiably wrong**. Gap = a reproducible defect or
   web-verified wrong content. Fixing a confident-wrong answer ALWAYS outranks any new feature.
2. **Learning efficacy (pedagogy)** — a surface that is passive where retrieval / spacing / immediate
   feedback would teach better, or a research-backed improvement to scheduling, scaffolding, or feedback.
   Must cite the principle (CLAUDE.md learning-science table) AND a real place it is missing today.
3. **UX & accessibility / low friction** — a **measurable** WCAG miss (target < 44px, missing live
   region, keyboard trap), or a real friction point that adds attention cost. This app is **ADD-first**:
   one clear next action, calm, short completable units. Gap = a specific violated rule or broken flow.
4. **Performance** — a per-route page chunk over the **70 KB raw** budget (CLAUDE.md Verification), a
   measurable TTI/runtime regression, or an infinite-render risk. Gap = a number over budget.
5. **Critical-risk test coverage** — an **untested path where a bug would silently corrupt user data or
   break the free path** (cloud sync/merge, FSRS scheduling, store migrations, money-free invariants).
   Gap = a critical path with no test AND a plausible failure mode. ⚠️ **NOT generic "add tests to
   pure-lib X".** Coverage of low-risk pure helpers is **busywork, not a gap** — prefer NO-OP over it.
6. **Bilingual completeness** — a surface broken or absent in ONE language that blocks a learner. Gap =
   a real MS/EN parity break (not cosmetic).

## HARD invariants — never cross without a human (screen EVERY candidate)

No paywall · individual-revision only · no native-app dependency · no `STORE_VERSION` bump without a
data-preserving migration · no Supabase-schema or free-path break · `instruct.js` public API
(`hasInstructProvider` / `callInstruct`) frozen · never delete a feature · no secrets in repo or logs ·
web-verify all content. (These mirror CLAUDE.md + `~/.claude` memory — the irreversible ones.)

## "Improve the loop, not just the app"

If a cycle's highest-value gap is in the **loop itself** — this file, `LOCAL_BUILD_LOOP.md`, or
`build-loop.sh` (e.g. the assessment is missing an axis, a guardrail is weak, a backoff is wrong) — that
is a legitimate axis-1 (correctness) or axis-3 (friction) improvement. Fix it surgically, gate-green,
then resume building the app. Bound it: stop when the next change would be churn, not improvement.
