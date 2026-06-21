# Local build loop — on-demand, time-boxed (run as a `/loop` in a FRESH session)

A `/loop` you start in a **fresh** terminal session (no prior chat context → each cycle is cheap; it
reads the repo + queue fresh, like the cloud builder). **Every cycle reads `docs/loop/GOAL.md` FIRST** —
that file is the loop's north-star + measurable criteria (you re-steer the loop by editing it). It builds
the top item of the **🤖 Autonomous build queue** in `RESUME_HERE.md`, cycle after cycle. When the queue
empties it does **not** stop — it **assesses the live app against `GOAL.md`'s axes**, picks the single
biggest **evidenced** gap, and builds + ships it (big features as bounded increments). **If no gap clears
the GOAL bar, it makes NO commit and lets the shell back off** — an idle honest cycle is the correct
realization of "stop only when it cannot be improved", and beats prod churn. The loop runs **until you
stop it** (the cutoff is an optional time-box, step 1). Same quality bar as the cloud builder; ships to
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
>
> ⏸️ **Human pause switch (safe in-repo editing).** A person can NOT safely edit this repo while the loop runs:
> the pre-commit `git add -A` would sweep their uncommitted edits into the loop's prod commit. To take a safe
> window, **`touch docs/loop/PAUSE`** — `scripts/build-loop.sh` checks for that file at the top of every cycle and
> builds NOTHING while it exists (it just waits `MAX_SLEEP`, no cycle counted, backoff untouched). Do your work,
> commit, then **`rm docs/loop/PAUSE`** to resume. `PAUSE` is gitignored, so it never lands in a commit. (For the
> single-`/loop` session variant there is no shell guard — stop that one by hand before editing.)

## Each cycle (one loop iteration) — do EXACTLY this, in order:

1. **TIME CHECK FIRST (optional time-box).** The loop's default is **forever — it runs until you stop
   it** (`scripts/build-loop.sh` owns this via its `CUTOFF` env var, default far-future = no cutoff). The
   *real* stop is the NO-OP rule: when no gap clears the `GOAL.md` bar, the cycle makes no commit and the
   shell backs off. **Only** if a finite `CUTOFF` was set: run `TZ=Asia/Kuala_Lumpur date +%Y%m%d%H%M`
   (KL local time — no UTC math) and if the number is **≥ that `CUTOFF`**, STOP — print
   `RUN COMPLETE — KL cutoff reached.` and end. Otherwise continue.
2. `git fetch origin` then `git pull --ff-only` — start every cycle from the latest `main`. If `--ff-only`
   fails (local diverged, e.g. a concurrent cloud-builder commit landed), `git pull --rebase origin main`
   and continue.
3. Read `docs/loop/GOAL.md` (the north-star + axes), then `RESUME_HERE.md` → the **🤖 Autonomous build
   queue**. **Finish in-flight work first:** take the **first unchecked `[ ]`** item (these are already
   vetted gaps — continuing a bounded increment beats re-surveying every cycle). If the queue is empty,
   enter **GOAL-driven Self-source mode** (§ below) — assess the app against `GOAL.md`'s axes, pick the
   biggest evidenced gap, plan + BUILD + ship it (big features as bounded increments). **If no gap clears
   the bar, make NO commit** (Self-source mode 3B) — the shell backs off; do not invent busywork.
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

## GOAL-driven Self-source mode — when the queue is empty (the loop keeps looping; it ships only on a real gap)

The loop keeps **looping** forever, but it only **produces** when there is a real, evidenced gap against
`docs/loop/GOAL.md`. With an empty queue it assesses the app against the GOAL axes and ships the biggest
gap — bounded items and large self-invented features alike (big ones as bounded increments). The only
limits are the HARD invariants + the quality gate (3B/3D/step 5), which always hold. Run these in order:

- **3A · ASSESS the app against `GOAL.md`'s axes (grounded, never from memory).** Read, in order:
  `docs/loop/GOAL.md` (the 6 axes + priority); the open **`▶ NEXT` threads** in the recent `## ✅`
  shipped sections of `RESUME_HERE.md` (pre-thought — prefer them); `docs/PROJECT_VISION.md`; the PRD +
  learning-science table in `CLAUDE.md`; the invariants in `~/.claude` memory. Produce a short **gap
  list** — each candidate tied to a GOAL axis **with concrete evidence** (a real `file:line`, a
  reproducible behaviour, a measured number over budget, or a web-verified wrong content item).
  **Web-verify** any external/content fact. No evidence ⇒ it is not a gap; drop it.
- **3B · SCORE, gate, pick — or NO-OP.** Rank the evidenced gaps by `GOAL.md`'s axis priority
  (correctness/content-truth > pedagogy > UX/a11y > performance > critical-risk coverage > bilingual
  parity) AND screen each against the HARD invariants. Then apply the **anti-hallucination gate**: the
  pick must be **Real** (evidence above), have a **Measurable Done** (observable pass/fail, never "make
  it nicer"), and be **Verified** (content web-checked). Pick the highest-priority gap that passes all of
  it. **NO-OP is the default, not a feature:** if no candidate clears the bar — including when the only
  ideas left are generic "add tests to pure-lib X" (that is **busywork, not a gap** — only
  critical-risk-path coverage per axis 5 counts) — then **make NO commit**, report `no gap above bar on
  any axis` + the closest candidate, and end the cycle. The shell will back off. **An idle, honest cycle
  is the desired outcome of a good app — it beats a prod-deployed churn commit.**
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

## Hands-off mode — fresh process per cycle (`scripts/build-loop.sh`)

The single-`/loop` session above grows context every cycle (it compacts on long runs). For an unattended
multi-hour run, **`scripts/build-loop.sh`** instead launches a CLEAN `claude -p` (headless) process **per
cycle** — each re-grounds from this doc + `RESUME_HERE.md`, so context never accumulates (flat per-cycle
cost, no compaction tax, crash-isolated: a hung cycle can't kill the run). Each process runs the SAME
contract — exactly one cycle (steps 1–8, or Self-source mode when the queue is empty) — then exits; the
shell does the looping and owns the cutoff.

```bash
caffeinate -dimsu bash scripts/build-loop.sh     # keeps the Mac awake; runs FOREVER (Ctrl-C to stop)
```

**Forever + adaptive backoff.** `CUTOFF` defaults to a far-future date, so the loop runs **until you stop
it** (Ctrl-C / close terminal / reboot). It does NOT hot-loop when there's nothing to do: a cycle that
makes **no commit** (the NO-OP outcome of a good app) or **errors** (e.g. usage exhausted) grows the
breather geometrically — `SLEEP` (10s) → ×2 each idle cycle → capped at `MAX_SLEEP` (default 1800s / 30
min) — and **resets to `SLEEP` the moment a cycle actually ships**. So a "finished" app idles for pennies
instead of inventing busywork, and a rate-limit stall stops burning quota every 10s.

Tunables (env vars at the top of the script): `CUTOFF` (KL-local `YYYYMMDDHHMM`; default far-future =
forever — set a real date to time-box), `MODEL` (default `claude-opus-4-8`), `PERM` (default
`bypassPermissions` — a headless process can't answer prompts, so the HARD invariants + pre-commit gate
are the safety net), `SLEEP` (base breather), `MAX_SLEEP` (backoff cap), `MAX_CYCLES` (0 = unlimited;
set >0 for a bounded test). Override per run, e.g. `CUTOFF=202606160000 bash scripts/build-loop.sh` to
time-box, or `MAX_CYCLES=1 bash scripts/build-loop.sh` for a single-cycle smoke test.
