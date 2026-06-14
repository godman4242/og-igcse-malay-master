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
# Usage:   caffeinate -dimsu bash scripts/build-loop.sh         # keeps the Mac awake
# Stop:    Ctrl-C, or it stops itself at CUTOFF.
# Tunables (env overrides):  CUTOFF MODEL PERM SLEEP MAX_CYCLES CLAUDE_BIN
#   e.g.   CUTOFF=202606160000 bash scripts/build-loop.sh        # run until 8am KL Tue
#
# NOTE: defaults to --permission-mode bypassPermissions because a headless process
# can't answer permission prompts; the loop's HARD invariants + the pre-commit
# build/test/lint gate are the safety net. Set PERM differently to tighten this.
set -uo pipefail   # NOT -e: a single failing cycle must not kill the whole run.

# ── Config (env-overridable) ──────────────────────────────────────────────────
CUTOFF="${CUTOFF:-202606142300}"        # STOP at/after this KL-LOCAL time, plain YYYYMMDDHHMM (here: 11pm Sun 14 Jun KL)
MODEL="${MODEL:-claude-opus-4-8}"       # Opus 4.8 — Kheshav's default tier
PERM="${PERM:-bypassPermissions}"       # acceptEdits | auto | bypassPermissions | default
SLEEP="${SLEEP:-10}"                    # breather between cycles (also avoids a hot-loop if a cycle errors instantly)
MAX_CYCLES="${MAX_CYCLES:-0}"           # 0 = unlimited; >0 caps the number of cycles (handy for a bounded test)
CLAUDE_BIN="${CLAUDE_BIN:-claude}"      # the Claude Code CLI (override to a stub for testing)
# ──────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")/.." || { echo "build-loop: cannot cd to repo root" >&2; exit 1; }

read -r -d '' CYCLE_PROMPT <<'EOF'
Read docs/LOCAL_BUILD_LOOP.md and do EXACTLY ONE build cycle of it (steps 1-8; if the queue is empty,
follow that doc's Self-source mode). Then STOP and exit — do NOT loop and do NOT schedule any wakeup;
this shell script handles the looping. Honor every guardrail in the doc: TDD red-proof first, the
build/test/lint gate, web-verified content, the HARD invariants, surgical diffs, and "a no-op beats a
rushed prod deploy". If the cutoff has passed or there is no safe work to ship, make no commit and exit.
EOF

kl() { TZ=Asia/Kuala_Lumpur date "$@"; }

echo "build-loop: cutoff=$CUTOFF  model=$MODEL  perm=$PERM  starting $(kl '+%a %H:%M KL')"
n=0
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
  echo "════════ cycle #$n @ $(kl '+%a %H:%M KL')  (cutoff $CUTOFF) ════════"
  "$CLAUDE_BIN" -p "$CYCLE_PROMPT" --model "$MODEL" --permission-mode "$PERM"
  status=$?
  echo "──── cycle #$n exited ($status) @ $(kl '+%H:%M KL') ────"
  sleep "$SLEEP"
done
