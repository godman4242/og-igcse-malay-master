# Local build loop — on-demand, time-boxed (run as a `/loop` in a FRESH session)

A `/loop` you start in a **fresh** terminal session (no prior chat context → each cycle is cheap; it
reads the repo + queue fresh, like the cloud builder). It builds the top item of the **🤖 Autonomous
build queue** in `RESUME_HERE.md`, cycle after cycle. When the queue empties it does **not** stop — it
**self-sources** the next-best item (research your criteria → write + check a plan doc → build-and-ship
it if it's bounded/safe, or spec-and-queue it if it's big/forky), then keeps looping. The **only** hard
stop is the wall-clock cutoff (step 1). Same quality bar as the cloud builder; ships to `main`
(= prod deploy).

> ⚠️ **This spends YOUR session usage** (not the cloud routine's separate quota). It will likely hit
> your rate limit and stall **before** the cutoff — that's expected and is itself the lesson; the
> cutoff is only a backstop. Keep the Mac **plugged in and awake** (e.g. `caffeinate -dimsu` in a
> spare tab) or the loop pauses when the machine sleeps.

## Each cycle (one loop iteration) — do EXACTLY this, in order:

1. **TIME CHECK FIRST.** Run `date -u +%Y%m%d%H%M`. If the number is **≥ `202606141100`** (= 19:00 /
   7pm on Sun 14 Jun, Asia/Kuala_Lumpur), **STOP the loop** — do NOT schedule another cycle; print
   `TEST COMPLETE — 7pm KL cutoff reached.` and end. Otherwise continue.
2. `git fetch origin` then `git pull --ff-only` — start every cycle from the latest `main`.
3. Read `RESUME_HERE.md` → the **🤖 Autonomous build queue**. Take the **first unchecked `[ ]`** item.
   If there is none, enter **Self-source mode** (§ below) — research the next-best item, write + check
   its plan, then BUILD-and-ship it (if safe-to-solo) or SPEC-and-queue it (if big/forky). Do NOT stop
   on an empty queue; only the step-1 cutoff stops the loop.
4. Build ONLY that one item to the full quality bar:
   - Read `CLAUDE.md` + every file the item names. **Surgical diffs, never rewrites** (the big page
     files regress on partial rewrites).
   - **TDD red-proof first:** write the failing test, RUN it, confirm it fails for the right reason,
     THEN implement.
   - **Decide-and-flag** every call yourself (criteria stack: no-paywall > learning/pedagogy quality >
     low friction > convenience). Never ask questions. Log `Decision / why / one-line veto`.
   - **GROUND content:** web-verify any Malay gloss/grammar before shipping — a confident-WRONG answer
     is the worst failure for a learning tool. If you are not HIGHLY confident the change is correct
     AND complete → make NO commit and STOP (a no-op beats a bad prod deploy).
   - **HARD LIMITS:** no `STORE_VERSION` bump without a data-preserving migration; no Supabase-schema
     or user-facing free-path break; never delete a feature; `instruct.js` public API
     (`hasInstructProvider`/`callInstruct`) stays frozen; no secrets in repo/logs; keep the working
     tree to your ONE item before each commit (the pre-commit `git add -A` trap).
5. **GATE:** `npm run build && npm run test:run && npm run lint` — all green (0 errors; only the 3 known
   exhaustive-deps warnings allowed). Never `--no-verify`. (e2e/Playwright is fine to skip locally; CI
   covers it on push.)
6. **SELF-REVIEW** the diff as a hostile reviewer: Malay regression? cross-language class leak? broken
   study mode? dark/light theme? unverified claim? Fix findings; re-gate.
7. **SHIP:** one commit for the one item; in the **same commit** add a shipped-✅ section to
   `RESUME_HERE.md` AND check the queue item `[x]`; message ends
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push `main`. On non-fast-forward:
   `git pull --rebase`, re-gate, push once.
8. Write `docs/overnight/<UTC-date-hour>-local-report.md` (item, red→green evidence, decision log,
   gate result, deploy). Then **continue the loop** (next cycle → step 1).

## Self-source mode — when the queue is empty (the loop keeps working; it does not stop)

The step-1 cutoff is the ONLY hard stop. With an empty queue, the loop sources its OWN next item — but
through a routing gate so it never ships a large self-invented feature to prod unsupervised. Run these
in order, then fall back into the normal cycle:

- **3A · RESEARCH the next-best item (grounded, never from memory).** Read, in order: the open
  **`▶ NEXT` threads** in the recent `## ✅` shipped sections of `RESUME_HERE.md` (these are pre-thought —
  prefer them over net-new ideas); `docs/PROJECT_VISION.md` (the 5-phase product direction); the PRD +
  learning-science table in `CLAUDE.md`; and the invariants in `~/.claude` memory. **Web-verify** any
  external fact. Produce a short candidate list.
- **3B · SCORE + pick.** Rank candidates by the criteria stack (**no-paywall > learning/pedagogy quality
  > low friction > convenience**) AND screen each against the HARD invariants (step 4's HARD LIMITS +
  no-paywall / individual-revision-only / no native apps / Malay+English quality first). Pick the
  highest-value candidate that passes the invariant screen.
- **3C · WRITE + CHECK the plan doc FIRST (always, both routes).** Write a short spec + plan under
  `docs/superpowers/{specs,plans}/<UTC-date>-<slug>-{design,plan}.md`: problem, criteria-fit,
  **measurable Done** (observable pass/fail — never "make it better"), what-NOT-to-break, and the
  decide-and-flag forks pre-resolved. Then self-review it as a **hostile reviewer**: does it break an
  invariant? is Done measurable AND bounded to one cycle? is it genuinely the best use of effort? If it
  fails review, discard it and take the next candidate.
- **3D · ROUTE on size/risk:**
  - **Safe-to-solo** — bounded to ONE cycle, a clear "best" answer, no genuine product-fork / taste
    call, invariant-safe → **BUILD it.** Add a queue line for it (so step 7's `[x]` + shipped-section
    bookkeeping has an anchor) and fall into **step 4** (TDD → gate → review → ship → report) exactly as
    for a pre-vetted item.
  - **Big / genuine product-fork / taste-dependent / invariant-touching** → **DO NOT build.** Commit the
    plan doc and add it to the queue as a NEW `[ ]` item with a one-line rationale (docs-only → the
    pre-commit **docs fast-path** applies, no gate). This is the *spec-don't-solo-build* rule — the next
    human/cloud vet decides whether to build it. Then **continue the loop** (next cycle → step 1).
- **Time-box + safety.** The cutoff still wraps everything. If a self-sourced BUILD can't reach a green
  gate **and** a clean self-review with margin before the cutoff, make NO commit, leave the plan doc
  queued as `[ ]`, and stop. **A no-op — or a queued plan — always beats a rushed prod deploy**, doubly
  so for a self-invented feature.

End each cycle's message with: the item shipped, the self-sourced plan queued, **or** the SKIP/STOP
reason — **and** the step-1 time-check result, so progress is visible between cycles.
