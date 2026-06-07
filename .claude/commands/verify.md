---
description: Typecheck + production build the web app (the pre-push gate)
---
Run the project's pre-"done" checks for `apps/web`:

1. `cd apps/web` and run `npx tsc --noEmit` (workspace typecheck). Report any errors.
2. Warm the Medusa backend so prerender fetches don't time out:
   `curl -s -m 90 -o /dev/null https://medusabd.onrender.com/health`
3. `rm -rf apps/web/.next` then `bun run build` (clean build avoids stale-cache flakes).
   Export the production env vars from `.env.deploy-secrets` for the build.

Report PASS/FAIL with the exact errors. Do NOT commit or push — this is verification only.
