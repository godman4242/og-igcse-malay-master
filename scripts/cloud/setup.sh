#!/bin/bash
# SessionStart hook (.claude/settings.json). Does nothing outside a Claude Code cloud session.
# In one (CLAUDE_CODE_REMOTE=true — Kheshav's $250 credit, 2026-09-30):
#   1. turns the commit gate + the push guard on (a fresh VM has no core.hooksPath);
#   2. installs dependencies (npm ci's postinstall also copies the OCR/ASR assets);
#   3. tries to install Chromium so the cycle can LOOK (scripts/ui-smoke.mjs) — best effort:
#      the driver re-runs the LOOK on Kheshav's Mac either way.
# What it prints lands in the session's context (docs/LOCAL_BUILD_LOOP.md, "In a cloud session").
[ "${CLAUDE_CODE_REMOTE:-}" = true ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

git config core.hooksPath .githooks

# One retry: a fresh VM's first npm ci failed once (2026-09-30 pilot) and the next VM installed fine.
# Two failures → FAILED, naming npm's own error so the session log says why.
deps=installed
log="${TMPDIR:-/tmp}/npm-ci.log"
[ -d node_modules ] || npm ci --no-audit --no-fund >"$log" 2>&1 \
  || { sleep 10; npm ci --no-audit --no-fund >"$log" 2>&1; } \
  || deps="FAILED ($(grep -m 2 -iE 'npm (error|ERR!)' "$log" | tr '\n' ' '))"

look=off
npx playwright install chromium >/dev/null 2>&1 && look=on

echo "cloud setup: commit gate + push guard on · deps ${deps} · LOOK browser ${look} · push ONLY the branch your launch prompt names (claude/…), never main"
