# Local build loop — on-demand, time-boxed (run as a `/loop` in a FRESH session)

A `/loop` you start in a **fresh** terminal session (no prior chat context → each cycle is cheap; it
reads the repo + queue fresh, like the cloud builder). It builds the top item of the **🤖 Autonomous
build queue** in `RESUME_HERE.md`, cycle after cycle. When the queue empties it does **not** stop — it
**self-sources** the next-best item (research your criteria → write + check a plan doc → build, review,
and ship it; a feature too big for one cycle ships as bounded increments), then keeps looping. The
**only** hard stop is the wall-clock cutoff (step 1). Same quality bar as the cloud builder; ships to
`main` (= prod deploy).

> ⚠️ **This spends YOUR session usage** (not the cloud routine's separate quota). It will likely hit
> your rate limit and stall **before** the cutoff — that's expected; the cutoff is only a backstop. Keep
> the Mac **plugged in and awake** (e.g. `caffeinate -dimsu` in a spare tab) or the loop pauses when the
> machine sleeps.
>
> 🧠 **Context hygiene (long runs).** This runs in ONE growing session, so treat **`RESUME_HERE.md` as the
> durable state between cycles** — every cycle re-grounds from it, so a mid-run context compaction never
> loses the thread. Per cycle: don't re-read files already in context; delegate broad investigation to a
> subagent that reports back a short summary; keep each cycle's footprint small.
>
> 🤝 **Concurrency.** The every-2h cloud builder also ships to `main`. The step-2 rebase + step-7 re-sync
> handle the race, but for a long local run you can pause the cloud builder to avoid double-work entirely.

## Each cycle (one loop iteration) — do EXACTLY this, in order:

1. **TIME CHECK FIRST.** Run `TZ=Asia/Kuala_Lumpur date +%Y%m%d%H%M` (the clock in **KL local time** — no
   UTC math). If the number is **≥ `202606142300`** (= 23:00 / **11pm on Sun 14 Jun, KL**), **STOP the
   loop** — do NOT schedule another cycle; print `RUN COMPLETE — 11pm KL cutoff reached.` and end.
   Otherwise continue. To change the deadline, edit ONLY this one number, written in plain KL time
   `YYYYMMDDHHMM` (no conversion).
2. `git fetch origin` then `git pull --ff-only` — start every cycle from the latest `main`. If `--ff-only`
   fails (local diverged, e.g. a concurrent cloud-builder commit landed), `git pull --rebase origin main`
   and continue.
3. Read `RESUME_HERE.md` → the **🤖 Autonomous build queue**. Take the **first unchecked `[ ]`** item.
   If there is none, enter **Self-source mode** (§ below) — research the next-best item, write + check
   its plan, then BUILD, review, and ship it (big features as bounded increments). Do NOT stop on an
   empty queue; only the step-1 cutoff stops the loop.
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
   exhaustive-deps warnings allowed). Never `--no-verify`. **If the change is UI-affecting** (renders a
   new screen / control / layout / flow), ALSO run the most relevant `tests/e2e/*.spec.js` locally — the
   unit gate doesn't cover rendered layout or flows, and a `main` push deploys to prod regardless of CI.
   Pure data/logic changes may skip e2e (CI covers it on push).
6. **SELF-REVIEW** the diff as a hostile reviewer: Malay regression? cross-language class leak? broken
   study mode? dark/light theme? unverified claim? Fix findings; re-gate.
7. **SHIP:** one commit for the one item; in the **same commit** add a shipped-✅ section to
   `RESUME_HERE.md` AND check the queue item `[x]`; message ends
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Re-check the clock first** — if you've
   passed the cutoff and not yet committed, discard and stop (step 1). **Re-sync before pushing**
   (`git fetch && git pull --rebase`): if a concurrent runner already shipped your item (now `[x]` on
   `origin`), discard your build (`git reset --hard origin/main`) and take the next item — never
   double-ship. Push `main`; on non-fast-forward, `git pull --rebase`, re-gate, push once.
8. Write `docs/overnight/<UTC-YYYYMMDD-HHMM>-local-report.md` (minute precision — optionally append the
   commit short-SHA — so several cycles in one hour never overwrite each other): item, red→green
   evidence, decision log, gate result, deploy. Then **continue the loop** (next cycle → step 1).

## Self-source mode — when the queue is empty (the loop keeps working; it does not stop)

The step-1 cutoff is the ONLY hard stop. With an empty queue, the loop sources its OWN next item and
builds + ships it — bounded items and large self-invented features alike (big ones as bounded
increments). There is no size gate; the only limits are the HARD invariants + the quality gate (3B/3D/
step 5), which always hold. Run these in order, then fall back into the normal cycle:

- **3A · RESEARCH the next-best item (grounded, never from memory).** Read, in order: the open
  **`▶ NEXT` threads** in the recent `## ✅` shipped sections of `RESUME_HERE.md` (these are pre-thought —
  prefer them over net-new ideas); `docs/PROJECT_VISION.md` (the 5-phase product direction); the PRD +
  learning-science table in `CLAUDE.md`; and the invariants in `~/.claude` memory. **Web-verify** any
  external fact. Produce a short candidate list.
- **3B · SCORE + pick.** Rank candidates by the criteria stack (**no-paywall > learning/pedagogy quality
  > low friction > convenience**) AND screen each against the HARD invariants (step 4's HARD LIMITS +
  no-paywall / individual-revision-only / no native apps / Malay+English quality first). Pick the
  highest-value candidate that passes the invariant screen. **Quality over activity:** if nothing
  genuinely improves learning / UX / correctness above a real bar, do NOT invent a marginal feature just
  to have something to ship — prefer behaviour-preserving test coverage, a small correctness/perf fix, or
  a researched plan doc. An idle, honest cycle beats prod churn.
- **3C · WRITE + CHECK the plan doc FIRST (always — design before build).** Write a short spec + plan
  under `docs/superpowers/{specs,plans}/<UTC-date>-<slug>-{design,plan}.md`: problem, criteria-fit,
  **measurable Done** (observable pass/fail — never "make it better"), what-NOT-to-break, and the
  decide-and-flag forks pre-resolved. Then self-review it as a **hostile reviewer**: does it break an
  invariant? is Done measurable, and is the feature either one-cycle-sized OR cleanly split into
  one-cycle increments? is it genuinely the best use of effort? If it fails review, discard it and take
  the next candidate.
- **3D · BUILD it — every item, no size gate.** Whatever you picked, you build and ship it — bounded
  items AND big/forky/self-invented ones alike. Add a queue line for it (so step 7's `[x]` +
  shipped-section bookkeeping has an anchor) and fall into **step 4** (TDD → gate → review → ship →
  report) exactly as for a pre-vetted item.
  - **A feature too big for one cycle ships as INCREMENTS, never parked.** Your 3C plan splits it into
    independently-shippable, gate-green slices (each a real user-visible or test-covered slice — never a
    half-wired stub behind no flag). Ship increment 1 this cycle and record the rest as `[ ]` queue
    items (or a checklist in the plan doc); later cycles finish it. Every commit stays green + revertible.
  - **Still NON-negotiable (these are NOT the gate you dropped).** The HARD invariant screen (3B) + the
    quality gate (step 5) + web-verified content + hostile self-review + "a no-op beats a rushed prod
    deploy" all stay. Dropping the *size* routing lets you build large self-invented features
    unsupervised; it does **not** authorise shipping a paywall, a native-app dependency, a
    free-path/`STORE_VERSION`/schema break, frozen-API (`instruct.js`) changes, or unverified Malay/
    grammar content — those are the irreversible invariants, still off-limits without a human.
- **Time-box + safety.** The cutoff still wraps everything. If a self-sourced BUILD can't reach a green
  gate **and** a clean self-review with margin before the cutoff, make NO commit, leave the plan doc
  queued as `[ ]`, and stop. **A no-op — or a queued plan — always beats a rushed prod deploy**, doubly
  so for a self-invented feature.

End each cycle's message with: the item shipped, the self-sourced plan queued, **or** the SKIP/STOP
reason — **and** the step-1 time-check result, so progress is visible between cycles.
