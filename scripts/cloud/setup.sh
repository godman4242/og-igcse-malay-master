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

deps=installed
[ -d node_modules ] || npm ci --no-audit --no-fund >/dev/null 2>&1 || deps=FAILED

look=off
npx playwright install chromium >/dev/null 2>&1 && look=on

echo "cloud setup: commit gate + push guard on · deps ${deps} · LOOK browser ${look} · push ONLY your lane branch (cloud-code / cloud-content), never main"
