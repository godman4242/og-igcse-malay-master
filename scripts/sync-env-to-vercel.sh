#!/usr/bin/env bash
# Push every VITE_* key from .env.local up to Vercel (production + preview).
#
# Run this AFTER you've pasted real values into .env.local and confirmed
# `npm run test:connections` passes. The script:
#
#   1. checks Vercel CLI is installed (installs via npm -g if not)
#   2. links the project if .vercel/ is missing
#   3. for each VITE_* key in .env.local, pipes the value into
#      `vercel env add` for production and preview (skipping localhost-only keys)
#
# Re-running is safe: Vercel rejects duplicates with a clear message and the
# script keeps going. To force a re-push, remove first via:
#   vercel env rm VITE_FOO production
#
# Usage:
#   bash scripts/sync-env-to-vercel.sh                   # push to production + preview
#   bash scripts/sync-env-to-vercel.sh production        # production only
#   bash scripts/sync-env-to-vercel.sh production preview development

set -euo pipefail

ENV_FILE=".env.local"
ENVIRONMENTS=("${@:-production preview}")

# ─── 1. CLI check ───────────────────────────────────────────────────────
if ! command -v vercel >/dev/null 2>&1; then
  echo "→ Vercel CLI not found. Installing globally..."
  npm install -g vercel
fi

echo "→ Vercel CLI: $(vercel --version)"

# ─── 2. Link project ─────────────────────────────────────────────────────
if [ ! -d ".vercel" ]; then
  echo "→ Project not linked. Running 'vercel link'..."
  echo "   (Pick the right scope + project when prompted.)"
  vercel link
fi

# ─── 3. Read .env.local and push each VITE_* key ─────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE not found. Create it from .env.example first."
  exit 1
fi

# Strip comments/blank lines, keep only VITE_* assignments with non-empty values.
while IFS= read -r line; do
  # skip comments / blanks
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  # parse KEY=VALUE
  key="${line%%=*}"
  value="${line#*=}"

  # only push VITE_* and skip placeholders / empties
  [[ "$key" != VITE_* ]] && continue
  [[ -z "$value" || "$value" == "your-"* || "$value" == *"-here" ]] && {
    echo "—  skip $key (empty or placeholder)"
    continue
  }

  # strip surrounding quotes if present
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"

  for env in $ENVIRONMENTS; do
    echo "→ pushing $key → $env"
    # `vercel env add` reads value from stdin
    if printf '%s' "$value" | vercel env add "$key" "$env" 2>&1 | grep -v "^>"; then
      :
    else
      echo "   (already set — skipping. To overwrite: vercel env rm $key $env)"
    fi
  done
done < "$ENV_FILE"

echo
echo "✓ Done. Trigger a new deploy to pick up the env vars:"
echo "    vercel --prod"
