#!/usr/bin/env bash
# scripts/build-loop.sh — run the local build loop as FRESH, isolated Claude Code
# processes (ONE per cycle) until a KL-local wall-clock cutoff.
#
# Why this instead of a single long `/loop` chat: each cycle starts with a CLEAN
# context and re-grounds from docs/LOCAL_BUILD_LOOP.md + RESUME_HERE.md, so a long
# run never accumulates context (no compaction tax, flat per-cycle cost, and a
# crashed/hung cycle can't take the whole run down — the next process just starts).
#
# All durable state lives in git + RESUME_HERE.md; the loop ships to `main`
# (= prod deploy). Read docs/LOCAL_BUILD_LOOP.md for the per-cycle contract +
# guardrails this enforces.
#
# Usage:   caffeinate -dimsu bash scripts/build-loop.sh         # keeps the Mac awake; stops at the next 08:00 KL
# Stop:    Ctrl-C (or close the terminal / reboot), or `touch docs/loop/PAUSE`.
# Tunables (env overrides):  CUTOFF MODEL EFFORT PERM SLEEP MAX_SLEEP MAX_CYCLES CYCLE_TIMEOUT CLAUDE_BIN
#   e.g.   CUTOFF=202610011800 bash scripts/build-loop.sh        # run until 6pm KL on 1 Oct
#          CUTOFF=210001010000 bash scripts/build-loop.sh        # forever (mind the usage budget)
#
# After every cycle that ships, THIS SCRIPT (not the model) verifies the result — a script beats a swarm:
#   1. waits for GitHub's Vercel status on the new HEAD (READY or failed);
#   2. runs scripts/ui-smoke.mjs against production (every route, both themes, phone + desktop).
# Either one red → it creates docs/loop/PAUSE and builds nothing more until a human looks.
# Everything is also written to docs/loop/logs/loop-<date>.log (gitignored) for the morning review.
#
# Each cycle works toward docs/loop/GOAL.md and ships ONLY on a real, evidenced gap.
# When there's no gap (the app is good) the cycle makes no commit; the loop then BACKS OFF (SLEEP doubles
# each idle/errored cycle up to MAX_SLEEP) so a "finished" app — or a rate-limit stall — idles cheaply
# instead of hot-looping. The breather resets to SLEEP the moment a cycle actually ships a commit.
#
# NOTE: defaults to --permission-mode bypassPermissions because a headless process
# can't answer permission prompts; the loop's HARD invariants + the pre-commit
# build/test/lint gate are the safety net. Set PERM differently to tighten this.
set -uo pipefail   # NOT -e: a single failing cycle must not kill the whole run.

# ── Config (env-overridable) ──────────────────────────────────────────────────
kl() { TZ=Asia/Kuala_Lumpur date "$@"; }
# Default cutoff = the next 08:00 KL (an overnight run that is over by morning — Kheshav's usage budget is
# limited). Before 08:00 that is today; otherwise tomorrow. Plain KL-local YYYYMMDDHHMM.
if [ "$(kl +%H%M)" -lt 0800 ]; then next8="$(kl +%Y%m%d)0800"; else next8="$(kl -v+1d +%Y%m%d)0800"; fi
CUTOFF="${CUTOFF:-$next8}"              # STOP at/after this KL-LOCAL time. 210001010000 = forever
MODEL="${MODEL:-claude-opus-5-5}"       # Opus 5.5: each cycle is one bounded, surgical fix in an existing codebase
EFFORT="${EFFORT:-high}"                # 5.5 `high` beats Opus 5 `high` on coding; `xhigh` only after a measured miss
CYCLE_TIMEOUT="${CYCLE_TIMEOUT:-5400}"  # kill a cycle that runs past 90 min (a hung `claude -p` used to stall the loop forever)
PERM="${PERM:-bypassPermissions}"       # acceptEdits | auto | bypassPermissions | default
SLEEP="${SLEEP:-10}"                    # BASE breather after a productive cycle (also avoids a hot-loop if a cycle errors instantly)
MAX_SLEEP="${MAX_SLEEP:-1800}"          # backoff cap (s): a no-op/errored cycle doubles the breather up to this (30 min) so a "done" app idles cheaply
MAX_CYCLES="${MAX_CYCLES:-0}"           # 0 = unlimited; >0 caps the number of cycles (handy for a bounded test)
CLAUDE_BIN="${CLAUDE_BIN:-claude}"      # the Claude Code CLI (override to a stub for testing)
# ──────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")/.." || { echo "build-loop: cannot cd to repo root" >&2; exit 1; }
mkdir -p docs/loop/logs
LOG="docs/loop/logs/loop-$(kl +%Y%m%d-%H%M).log"
exec > >(tee -a "$LOG") 2>&1            # everything below also lands in the log

read -r -d '' CYCLE_PROMPT <<'EOF'
Read docs/loop/GOAL.md FIRST, then docs/LOCAL_BUILD_LOOP.md, and do EXACTLY ONE cycle of that doc's
"One cycle" steps: take the top open item (the bug-hunt queue first), re-verify it still reproduces at HEAD,
write the failing test and watch it fail, make the smallest fix, run the full gate, then LOOK at every
screen you touched (scripts/ui-smoke.mjs against a local preview; open the screenshots) and CHAOS-test the
feature, get the review the change's risk calls for, and ship ONE commit. Never build a 🔶 attended item.
Then STOP and exit — do NOT loop and do NOT schedule any wakeup; this shell script loops, and it verifies the
deploy + the live site after you ship. If nothing clears the GOAL bar (generic "add tests to pure-lib X" is
busywork, not a gap), make NO commit, print "no gap above bar on any axis", and exit. A no-op beats a rushed
prod deploy.
EOF

# Kill a process and everything it spawned, children first — killing only the top `claude` process left
# its tool commands (e.g. a `vite preview` on :4199) alive to block the next cycle.
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill -TERM "$1" 2>/dev/null; }

# After a ship: is the deploy READY, and is the live site still clean? Red → PAUSE (fail closed).
verify_ship() {
  local sha="$1" state="" i
  for i in $(seq 1 45); do                         # up to ~15 min for Vercel to build
    state="$(gh api "repos/{owner}/{repo}/commits/$sha/status" --jq '.statuses[] | select(.context=="Vercel") | .state' 2>/dev/null | head -1)"
    case "$state" in success|failure|error) break ;; esac
    sleep 20
  done
  if [ "$state" != "success" ]; then
    echo "──── ✗ DEPLOY of $sha is '${state:-unknown}' — PAUSING the loop (touch docs/loop/PAUSE). A human must look. ────"
    touch docs/loop/PAUSE; return 1
  fi
  echo "──── ✓ Vercel READY for $sha; running the live UI smoke ────"
  if ! node scripts/ui-smoke.mjs; then
    echo "──── ✗ LIVE UI SMOKE failed after $sha — PAUSING the loop. Screenshots: test-results/ui-smoke/ ────"
    touch docs/loop/PAUSE; return 1
  fi
}

echo "build-loop: cutoff=$CUTOFF  model=$MODEL/$EFFORT  timeout=${CYCLE_TIMEOUT}s  perm=$PERM  base-sleep=${SLEEP}s  max-sleep=${MAX_SLEEP}s  log=$LOG  starting $(kl '+%a %H:%M KL')"
n=0
cur_sleep="$SLEEP"   # grows geometrically on idle/errored cycles (capped at MAX_SLEEP); resets to SLEEP on a productive one
idle=0               # consecutive no-op/errored cycles (visibility only)
while true; do
  now="$(kl +%Y%m%d%H%M)"
  if [ "$now" -ge "$CUTOFF" ]; then
    echo "════ RUN COMPLETE — KL cutoff $CUTOFF reached at $(kl '+%H:%M KL'); $n cycle(s) run ════"
    break
  fi
  if [ "$MAX_CYCLES" -gt 0 ] && [ "$n" -ge "$MAX_CYCLES" ]; then
    echo "════ STOP — MAX_CYCLES=$MAX_CYCLES reached; $n cycle(s) run ════"
    break
  fi
  # ── Human pause switch ── a person who needs to edit this repo `touch`es docs/loop/PAUSE to take a
  # SAFE window: while that file exists the loop builds NOTHING (so the pre-commit `git add -A` can't
  # sweep their uncommitted edits into a prod commit — the concurrency race). `rm docs/loop/PAUSE`
  # resumes. This tick does NOT count as a cycle or touch the backoff — it just waits. PAUSE is gitignored.
  if [ -f docs/loop/PAUSE ]; then
    echo "──── PAUSED (docs/loop/PAUSE present) @ $(kl '+%a %H:%M KL'); \`rm docs/loop/PAUSE\` to resume. Re-checking in ${MAX_SLEEP}s ────"
    sleep "$MAX_SLEEP"
    continue
  fi
  n=$((n + 1))
  echo ""
  echo "════════ cycle #$n @ $(kl '+%a %H:%M KL')  (cutoff $CUTOFF, idle-streak $idle) ════════"
  # A dirty tree means someone is editing without PAUSE — the pre-commit `git add -A` would sweep their
  # work into the loop's prod commit. Refuse, pause, and say so.
  if [ -n "$(git status --porcelain)" ]; then
    echo "──── ✗ working tree is not clean — PAUSING (someone is editing; commit or stash, then rm docs/loop/PAUSE) ────"
    git status --short | head -10
    touch docs/loop/PAUSE
    continue
  fi
  head_before="$(git rev-parse HEAD 2>/dev/null || echo none)"
  "$CLAUDE_BIN" -p "$CYCLE_PROMPT" --model "$MODEL" --effort "$EFFORT" --permission-mode "$PERM" &
  cycle_pid=$!
  ( sleep "$CYCLE_TIMEOUT" && echo "──── ✗ cycle #$n passed ${CYCLE_TIMEOUT}s — killed ────" && kill_tree "$cycle_pid" ) &
  watchdog_pid=$!
  wait "$cycle_pid"
  status=$?
  kill "$watchdog_pid" 2>/dev/null; wait "$watchdog_pid" 2>/dev/null
  pkill -f "vite preview --port 4199" 2>/dev/null   # the cycle's LOOK preview (only ours — matched by its exact command)
  head_after="$(git rev-parse HEAD 2>/dev/null || echo none)"
  if [ "$status" -eq 0 ] && [ "$head_before" != "$head_after" ]; then productive=1; else productive=0; fi
  if [ "$productive" -eq 1 ]; then
    idle=0; cur_sleep="$SLEEP"
    echo "──── cycle #$n SHIPPED ${head_after} (exit $status) @ $(kl '+%H:%M KL') ────"
    verify_ship "$head_after" || continue            # red → PAUSE is set; the next tick waits for a human
    echo "──── next cycle in ${cur_sleep}s ────"
  else
    idle=$((idle + 1))
    echo "──── cycle #$n no-op/err (exit $status, $idle in a row) @ $(kl '+%H:%M KL'); backing off ${cur_sleep}s ────"
  fi
  sleep "$cur_sleep"
  # after an idle/errored cycle grow the NEXT breather (geometric, capped); a productive cycle keeps it at base
  if [ "$productive" -eq 0 ]; then
    cur_sleep=$((cur_sleep * 2)); [ "$cur_sleep" -gt "$MAX_SLEEP" ] && cur_sleep="$MAX_SLEEP"
  fi
done
