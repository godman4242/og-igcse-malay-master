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
# Usage:   caffeinate -dimsu bash scripts/build-loop.sh         # keeps the Mac awake; runs FOREVER
# Stop:    Ctrl-C (or close the terminal / reboot). By default there is NO cutoff.
# Tunables (env overrides):  CUTOFF MODEL PERM SLEEP MAX_SLEEP MAX_CYCLES CLAUDE_BIN
#   e.g.   CUTOFF=202606160000 bash scripts/build-loop.sh        # time-box: run only until 8am KL Tue
#
# Forever by default: each cycle works toward docs/loop/GOAL.md and ships ONLY on a real, evidenced gap.
# When there's no gap (the app is good) the cycle makes no commit; the loop then BACKS OFF (SLEEP doubles
# each idle/errored cycle up to MAX_SLEEP) so a "finished" app — or a rate-limit stall — idles cheaply
# instead of hot-looping. The breather resets to SLEEP the moment a cycle actually ships a commit.
#
# NOTE: defaults to --permission-mode bypassPermissions because a headless process
# can't answer permission prompts; the loop's HARD invariants + the pre-commit
# build/test/lint gate are the safety net. Set PERM differently to tighten this.
set -uo pipefail   # NOT -e: a single failing cycle must not kill the whole run.

# ── Config (env-overridable) ──────────────────────────────────────────────────
CUTOFF="${CUTOFF:-210001010000}"        # STOP at/after this KL-LOCAL time, plain YYYYMMDDHHMM. Default = year 2100 = FOREVER (set a real date to time-box)
MODEL="${MODEL:-claude-opus-4-8}"       # Opus 4.8 — Kheshav's default tier
PERM="${PERM:-bypassPermissions}"       # acceptEdits | auto | bypassPermissions | default
SLEEP="${SLEEP:-10}"                    # BASE breather after a productive cycle (also avoids a hot-loop if a cycle errors instantly)
MAX_SLEEP="${MAX_SLEEP:-1800}"          # backoff cap (s): a no-op/errored cycle doubles the breather up to this (30 min) so a "done" app idles cheaply
MAX_CYCLES="${MAX_CYCLES:-0}"           # 0 = unlimited; >0 caps the number of cycles (handy for a bounded test)
CLAUDE_BIN="${CLAUDE_BIN:-claude}"      # the Claude Code CLI (override to a stub for testing)
# ──────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")/.." || { echo "build-loop: cannot cd to repo root" >&2; exit 1; }

read -r -d '' CYCLE_PROMPT <<'EOF'
Read docs/loop/GOAL.md FIRST (the north-star + the 6 measurable axes + the anti-hallucination gate), then
docs/LOCAL_BUILD_LOOP.md, and do EXACTLY ONE build cycle (steps 1-8; if the queue is empty, follow that
doc's GOAL-driven Self-source mode). Then STOP and exit — do NOT loop and do NOT schedule any wakeup; this
shell script handles the looping. Work toward GOAL.md: assess the app against its axes, pick the single
biggest EVIDENCED gap, and build it ONLY if it is Real + Measurable-Done + content-Verified. Honor every
guardrail: TDD red-proof first, the build/test/lint gate, web-verified content, the HARD invariants,
surgical diffs. If NO gap clears the GOAL bar — including when the only ideas left are generic "add tests
to pure-lib X" (busywork, not a gap) — make NO commit, print "no gap above bar on any axis", and exit.
A no-op beats a rushed prod deploy.
EOF

kl() { TZ=Asia/Kuala_Lumpur date "$@"; }

echo "build-loop: cutoff=$CUTOFF  model=$MODEL  perm=$PERM  base-sleep=${SLEEP}s  max-sleep=${MAX_SLEEP}s  starting $(kl '+%a %H:%M KL')"
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
  n=$((n + 1))
  echo ""
  echo "════════ cycle #$n @ $(kl '+%a %H:%M KL')  (cutoff $CUTOFF, idle-streak $idle) ════════"
  head_before="$(git rev-parse HEAD 2>/dev/null || echo none)"
  "$CLAUDE_BIN" -p "$CYCLE_PROMPT" --model "$MODEL" --permission-mode "$PERM"
  status=$?
  head_after="$(git rev-parse HEAD 2>/dev/null || echo none)"
  if [ "$status" -eq 0 ] && [ "$head_before" != "$head_after" ]; then productive=1; else productive=0; fi
  if [ "$productive" -eq 1 ]; then
    idle=0; cur_sleep="$SLEEP"
    echo "──── cycle #$n SHIPPED ${head_after} (exit $status) @ $(kl '+%H:%M KL'); next in ${cur_sleep}s ────"
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
