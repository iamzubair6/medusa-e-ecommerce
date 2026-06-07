---
description: Review recent changes and update the relevant docs to match
---
Bring the docs in `docs/` up to date with the current code.

1. Look at what changed recently: `git log --oneline -15` and `git diff --stat HEAD~5..HEAD` (adjust range as needed), plus current `git status`.
2. For each meaningful change, update the matching doc:
   - `docs/ROADMAP.md` — feature/phase status.
   - `docs/ARCHITECTURE.md` — structure, routes, data flow, new modules.
   - `docs/GO_LIVE_GUIDE.md` — deploy/env/setup changes.
   - `docs/PRODUCTION_DECISIONS.md` — deferred prod choices / mocked providers.
   - `docs/ADMIN_GUIDE.md`, `docs/PRODUCT_GUIDE.md` — admin/merchandising changes.
3. Keep edits concise and accurate — verify claims against the actual code/routes before writing.
4. Summarize what you updated. Commit only if asked.
