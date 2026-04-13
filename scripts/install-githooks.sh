#!/bin/sh
set -e

echo "Installing local git hooks..."
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/post-commit

echo "Git hooks configured to use .githooks/."
