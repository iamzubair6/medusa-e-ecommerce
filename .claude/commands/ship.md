---
description: Verify, then commit + push to master (auto-deploys web→Vercel, medusa→Render)
argument-hint: <conventional commit summary>
---
Ship the current changes. Commit summary: "$ARGUMENTS"

Steps:
1. Run the **/verify** checks first (typecheck + clean build). If anything fails, STOP and report — do not commit.
2. Update any relevant `docs/` per CLAUDE.md "Keep docs in sync" if this change warrants it.
3. Stage only the intended files (review `git status` / `git diff`). Do NOT stage
   `.env*`, secrets, or unrelated lockfile churn.
4. Commit with a Conventional Commit message (no Claude co-author, per the user's preference).
5. Push to `origin master`. Confirm the push and note that Vercel/Render will auto-deploy.

Remember: pushing deploys to production-ish — confirm the diff is what you intend before pushing.
