# Local build loop — one senior-engineer cycle per fresh process

`scripts/build-loop.sh` (this app's settings for the shared engine in
`~/kheshav-code/agent-harness/harness/loop/`) starts a **fresh** headless `claude -p` for every cycle (clean context, flat cost,
crash-isolated). Each process does **exactly one cycle** below and exits; the shell does the looping, the
time box, the per-cycle watchdog, and — after every ship — the deploy + live-site verification. You re-steer
the loop by editing `docs/loop/GOAL.md` (read first, every cycle).

**The bar is a senior engineer's, not a test runner's:** reproduce before fixing, the smallest diff that
fixes it, prove it green, then **look at it** and **try to break it** like a student would — because Kheshav
verifies with his eyes, and on 2026-09-28 a header that covered the title on every phone page, a false
"Synced" badge and permanent white screens all sat behind 2600+ green unit tests.

## One cycle — do exactly this, in order

1. **Sync.** `git fetch origin && git pull --ff-only` (if that fails: `git pull --rebase origin main`).
2. **Pick ONE item.** Read `docs/loop/GOAL.md`. Order: **🐛 Bug-hunt queue** top-down → the older open
   loop-safe items → (nothing left) GOAL-driven discovery, below. **Never build a 🔶 attended item.**
   **Re-verify first:** reproduce the item at HEAD (the 2026-08-06 census found half the queued items already
   fixed or never real). If it no longer reproduces, mark it ✅ with that evidence and take the next.
3. **Red first.** Write the failing test — unit, or a Playwright script for anything on screen — and watch it
   fail **for the stated reason**. No red, no fix.
4. **Fix** with the smallest diff that turns it green. Read the whole file first for the big page files
   (`Study`, `Dashboard`, `CikguBot`, `PDFReader`); surgical, never a rewrite.
5. **Gate:** `npm run build && npm run test:run && npm run lint && node scripts/lint-content.mjs` — all green.
6. **LOOK** — every change that renders anything:
   `lsof -i :4199 -sTCP:LISTEN` (must be free) → `npx vite preview --port 4199 --strictPort &` →
   `node scripts/ui-smoke.mjs --base http://localhost:4199 --routes <the routes you touched>` → it must say ✓,
   and then **open the screenshots it wrote** (`test-results/ui-smoke/`, phone 390 px + desktop 1280 px, dark
   + light) with the Read tool — add `--out /tmp/ui-smoke-<cycle>` (the global settings deny `Read(test-results/**)`,
   so the default folder can't be opened) — and judge them as a learner would: overlap, cut-off text, contrast, a dead
   end, a confusing label. Fix what you see. Stop the preview after.
7. **CHAOS** the thing you touched (scripted in the scratchpad, never in the repo): spam the control, reload
   mid-flow, back button, two tabs, offline, empty / huge / garbage input — whichever apply. Stubbing a network call
   against the preview? `browser.newContext({ serviceWorkers: 'block' })` — the PWA service worker hides requests from
   `page.route`, so a stub silently never fires. A finding is fixed
   now (back to 3) or queued in GOAL.md with its evidence.
8. **Review, scaled to risk:**
   - tiny (copy, CSS, docs) → your own hostile pass over `git diff`;
   - normal → ONE fresh-context reviewer subagent on `git diff` ("find a real bug in this diff; quote the
     line and the input that breaks it") — fix what it proves;
   - **high-risk** (store migrations / `STORE_VERSION`, sync, auth, security, anything hard to undo) → **do
     not ship.** Write the plan + evidence into GOAL.md 🔶 for an attended session and end the cycle.
9. **Ship ONE commit** — `git add -A` first, then `git commit` (the hook runs the gate again). In the SAME
   commit: the GOAL.md item marked ✅ (with the commit subject), ≤3 lines in the newest `RESUME_HERE.md` block
   (never a new big section — that file is 836 KB), and `docs/overnight/<UTC-YYYYMMDD-HHMM>-local-report.md`
   (≤25 lines: item · red → green · screenshots checked · chaos done · reviewer verdict · gate). Message = what
   the learner saw + the evidence; trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The push
   is automatic; if it is rejected, `git pull --rebase`, re-gate, push once.
10. **Exit.** The shell now waits for Vercel READY and runs `scripts/ui-smoke.mjs` against production; either
    one red stops the whole loop (`docs/loop/STOP`, first line = why) until a human looks.

## In a cloud session (`CLAUDE_CODE_REMOTE=true`)

Kheshav's $250 cloud credit (2026-09-30): a **driver** session on his Mac launches one cycle per lane, re-gates
it there and is the ONLY one who moves anything to `main` (`docs/sessions/2026-09-30-cloud-credit-driver.md`).
The launch prompt names your ITEM and LANE (`code` or `content`). Same steps as "One cycle", except:

- **Before step 1:** the SessionStart hook (`scripts/cloud/setup.sh`) printed one line. `deps FAILED` → stop, no
  commit, say so.
- **Step 2:** build the item the launch prompt names. An **A6** step (`docs/plans/2026-09-29-connected-app.md`,
  Phases 1–2) is allowed here: the driver holds it for Kheshav's look at the Vercel preview before `main`. Still
  never A1–A5 / A7, and nothing high-risk (store migrations / `STORE_VERSION`, sync, auth, `supabase/`) — report + stop.
- **Lane `content`:** touch only `src/data/**`, its tests and `docs/` — never code.
- **Steps 6–7:** `LOOK browser on` → LOOK + CHAOS as written; `off` → write "LOOK/CHAOS pending: driver" in the
  report (the driver runs them on the Mac).
- **Step 9:** leave `RESUME_HERE.md` alone (two lanes + Kheshav's own sessions would collide on it); mark only your
  item's line ✅ in GOAL.md and write the report. If your diff touches a file a chaos plant targets, run
  `node scripts/chaos/chaos.mjs <that file>` after committing: every selected plant must go red (exit 2 = filtered).
- **Push:** `git push -f origin HEAD:refs/heads/cloud-<LANE>` — the pre-push guard refuses `main` and everything
  else; the post-commit hook does not push here.
- **Step 10:** no Vercel check — nothing reaches production until the driver promotes it.

## Nothing queued — GOAL-driven discovery

Assess the live app against GOAL.md's axes, **with evidence** (a `file:line`, a reproduction, a measured
number, a web-verified wrong content item). Start with `node scripts/ui-smoke.mjs` against production — any
finding is a real gap. Rank by the axes (correctness / content-truth first), screen against the HARD
invariants, and build only what is **Real + Measurable-Done + Verified**. If nothing clears that bar — and
"add tests to pure-lib X" never does — make NO commit, print `no gap above bar on any axis`, and exit.
**An idle, honest cycle beats a prod-deployed churn commit.** A feature too big for one cycle ships as
independently green increments, the rest queued in GOAL.md.

## Hard limits — never without a human

No `STORE_VERSION` bump without a data-preserving migration · no Supabase schema change · no paywall · never
delete a feature · `instruct.js` public API frozen · no secrets in the repo or logs · no Malay/English content
change that isn't web-verified (a confident-wrong answer is the worst failure a learning tool has) ·
`--no-verify` never.

## Running it

```bash
cd "/Users/kheshav/kheshav-code/og igcse malay master" && rm -f docs/loop/PAUSE && caffeinate -dimsu bash scripts/build-loop.sh
```

- **Stops by itself at the next 08:00 KL.** Other windows: `CUTOFF=202610011800 …` (KL `YYYYMMDDHHMM`);
  `CUTOFF=210001010000 …` = forever (it spends YOUR usage — mind the budget).
- **Model:** `MODEL=claude-opus-5-5 EFFORT=high` by default (each cycle is one bounded, surgical fix).
  `MODEL=claude-fable-5-1` for a stretch of genuinely from-scratch work.
- **Change the stop time of a RUNNING loop:** `echo 202609290700 > docs/loop/CUTOFF` (KL `YYYYMMDDHHMM`; anything
  else in the file stops the loop). It is honoured within a minute, even mid-backoff.
- **Pause to edit the repo yourself:** `touch docs/loop/PAUSE`, then wait until `docs/loop/CYCLE_RUNNING` is gone
  (a cycle in flight finishes first); `rm docs/loop/PAUSE` resumes within a minute. A working tree someone left
  dirty also sets PAUSE (the pre-commit `git add -A` would sweep that work into a prod commit).
- **Red deploy or red live smoke → `docs/loop/STOP`** (hard stop; its first line says which commit and why).
  Look, fix, then `rm docs/loop/STOP`. A second loop in this repo refuses to start (`docs/loop/LOOP.pid`).
- **Morning review:** `docs/loop/logs/loop-<date>.log` (gitignored) · `git log --oneline` ·
  `docs/overnight/*-local-report.md` · the live-smoke screenshots in `test-results/ui-smoke/`.
- **Idle backoff:** a cycle with no commit doubles the breather (`SLEEP` 10 s → `MAX_SLEEP` 30 min); a ship
  resets it. **Watchdog:** a cycle past `CYCLE_TIMEOUT` (90 min) is killed.
- **Smoke-test the loop itself:** `CLAUDE_BIN=true MAX_CYCLES=1 SLEEP=1 bash scripts/build-loop.sh`.
