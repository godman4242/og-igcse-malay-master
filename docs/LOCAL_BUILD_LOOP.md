# Local build loop — on-demand, time-boxed (run as a `/loop` in a FRESH session)

A `/loop` you start in a **fresh** terminal session (no prior chat context → each cycle is cheap; it
reads the repo + queue fresh, like the cloud builder). It builds the top item of the **🤖 Autonomous
build queue** in `RESUME_HERE.md`, cycle after cycle, until a wall-clock cutoff, then stops itself.
Same quality bar as the cloud builder; ships to `main` (= prod deploy).

> ⚠️ **This spends YOUR session usage** (not the cloud routine's separate quota). It will likely hit
> your rate limit and stall **before** the cutoff — that's expected and is itself the lesson; the
> cutoff is only a backstop. Keep the Mac **plugged in and awake** (e.g. `caffeinate -dimsu` in a
> spare tab) or the loop pauses when the machine sleeps.

## Each cycle (one loop iteration) — do EXACTLY this, in order:

1. **TIME CHECK FIRST.** Run `date -u +%Y%m%d%H%M`. If the number is **≥ `202606142300`** (= 07:00 on
   Mon 15 Jun, Asia/Kuala_Lumpur), **STOP the loop** — do NOT schedule another cycle; print
   `TEST COMPLETE — 7am KL cutoff reached.` and end. Otherwise continue.
2. `git fetch origin` then `git pull --ff-only` — start every cycle from the latest `main`.
3. Read `RESUME_HERE.md` → the **🤖 Autonomous build queue**. Take the **first unchecked `[ ]`** item.
   If there is none, STOP: `queue empty — nothing to build`.
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

End each cycle's message with: the item shipped (or the SKIP/STOP reason) **and** the step-1 time-check
result, so progress is visible between cycles.
