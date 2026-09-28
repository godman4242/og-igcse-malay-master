#!/usr/bin/env bash
# scripts/build-loop.sh — this app's settings for the shared build loop.
# The engine (time box, watchdog, pause switches, lock, log) is shared by every project:
#   ~/kheshav-code/agent-harness/harness/loop/build-loop.sh — its header documents every switch.
# Each cycle is one FRESH `claude -p` that follows docs/LOCAL_BUILD_LOOP.md and is steered by
# docs/loop/GOAL.md. All durable state lives in git + RESUME_HERE.md; the loop ships to `main`
# (= prod deploy).
#
# Start:   caffeinate -dimsu bash scripts/build-loop.sh          # stops by itself at the next 08:00 KL
#          CUTOFF=202610011800 caffeinate -dimsu bash scripts/build-loop.sh   # another stop time (KL)
# Move the stop time while it runs:  echo 202610010700 > docs/loop/CUTOFF
# Pause:   touch docs/loop/PAUSE (rm to resume) · Ctrl-C to quit
# Dry run: CLAUDE_BIN=true MAX_CYCLES=1 SLEEP=1 bash scripts/build-loop.sh   # no model, no usage
# Log:     docs/loop/logs/loop-<date>.log
#
# After every cycle that ships, THIS SCRIPT (not the model) verifies the result — a script beats a swarm:
#   1. waits for GitHub's Vercel status on the new HEAD (READY or failed);
#   2. runs scripts/ui-smoke.mjs against production (every route, both themes, phone + desktop).
# Either one red → the engine writes docs/loop/STOP (first line = why) and builds nothing more until
# a human looks and runs `rm docs/loop/STOP`.

LOOP_TZ="${LOOP_TZ:-Asia/Kuala_Lumpur}"

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

# After a ship: is the deploy READY, and is the live site still clean? Non-zero → the engine STOPs.
loop_verify_ship() {
  local sha="$1" state="" i
  for i in $(seq 1 45); do                         # up to ~15 min for Vercel to build
    state="$(gh api "repos/{owner}/{repo}/commits/$sha/status" --jq '.statuses[] | select(.context=="Vercel") | .state' 2>/dev/null | head -1)"
    case "$state" in success|failure|error) break ;; esac
    sleep 20
  done
  if [ "$state" != "success" ]; then echo "──── ✗ DEPLOY of $sha is '${state:-unknown}' ────"; return 1; fi
  echo "──── ✓ Vercel READY for $sha; running the live UI smoke ────"
  node scripts/ui-smoke.mjs || { echo "──── ✗ LIVE UI SMOKE failed after $sha. Screenshots: test-results/ui-smoke/ ────"; return 1; }
}

# The cycle's LOOK preview can outlive it; kill only ours (matched by its exact command).
loop_after_cycle() { pkill -f "vite preview --port 4199" 2>/dev/null; return 0; }

source "${LOOP_ENGINE:-$HOME/kheshav-code/agent-harness/harness/loop/build-loop.sh}"
