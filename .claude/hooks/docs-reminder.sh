#!/usr/bin/env bash
# Stop hook: gentle nudge to keep docs in sync when code changed but docs didn't.
# Always exits 0 (non-blocking). See CLAUDE.md "Keep docs in sync".
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

changed="$(git status --porcelain 2>/dev/null || true)"
[ -z "$changed" ] && exit 0

code="$(printf '%s\n' "$changed" | grep -E '(apps/|packages/)' || true)"
docs="$(printf '%s\n' "$changed" | grep -E '(docs/|CLAUDE\.md)' || true)"

if [ -n "$code" ] && [ -z "$docs" ]; then
  printf '{"systemMessage":"📄 Docs reminder: code changed but no docs updated — consider updating docs/ (ROADMAP, ARCHITECTURE, GO_LIVE_GUIDE, PRODUCTION_DECISIONS) per CLAUDE.md."}\n'
fi
exit 0
