---
description: Run a Medusa seed/admin script (Node 20) against the Neon database
argument-hint: <script-file under src/scripts, e.g. seed-fashion-catalog.ts>
---
Run the Medusa exec script "$ARGUMENTS" against Neon.

```bash
cd apps/medusa/apps/backend
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"          # Medusa needs Node 20
export DATABASE_URL="<Neon DIRECT url from .env.deploy-secrets>"  # non-pooled
npx medusa exec ./src/scripts/$ARGUMENTS
```

Notes:
- Use the **direct** (non-pooled) Neon URL for scripts.
- Seed scripts live in `apps/medusa/apps/backend/src/scripts/` and must type-check
  (the Docker build runs `medusa build` which type-checks them).
- After seeding, verify via the store API or `psql`. Report what changed.
