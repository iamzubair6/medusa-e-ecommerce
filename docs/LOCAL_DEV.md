# Local development — verify before you deploy

Deploys take a few minutes (Vercel + Render). Run locally to **see changes
instantly** before pushing.

## Fast path — preview live data locally (recommended for frontend/admin)

`apps/web/.env.local` already points at the **live Medusa backend + Neon CMS**, so
the local site shows the same data as production.

```bash
cd apps/web
bun install          # first time
bun run dev          # → http://localhost:3200
```

Edit any storefront/admin code → it hot-reloads at `localhost:3200` against real
data. When it looks right, `/ship` (or commit + push) to deploy.

> ⚠️ `.env.local` uses **production data** — editing CMS content via `/admin` here
> writes to the live store. For isolated experiments use the full local stack below.

## Typecheck / build gate (same as CI/deploy)

```bash
cd apps/web
npx tsc --noEmit                      # zero errors
bun run build                         # production build must pass
```

(Or run the `/verify` command.)

## Migrations & seed

**CMS (Prisma → Neon `cms` schema):**
```bash
# generate client after schema edits
bun run --filter @ecom/cms db:generate
# push schema changes to the DB (uses CMS_DATABASE_URL)
CMS_DATABASE_URL="postgres://…neon…/neondb?sslmode=require" bun run --filter @ecom/cms db:push
```

**Medusa (commerce, Node 20):**
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd apps/medusa/apps/backend
export DATABASE_URL="postgres://…neon…/neondb?sslmode=require"   # DIRECT (non-pooled)
npx medusa db:migrate --skip-scripts          # schema only (data-seed scripts are one-off)
npx medusa exec ./src/scripts/<seed>.ts       # run a seed (see /seed command)
```

## Full local stack (isolated DB — optional)

Use when you don't want to touch production data:
1. Local Postgres (Homebrew). One DB holds both schemas: Medusa `public`, CMS `cms`.
2. Point `apps/web/.env.local` `CMS_DATABASE_URL` at local Postgres `?schema=cms`,
   and `NEXT_PUBLIC_MEDUSA_BACKEND_URL` at `http://localhost:9000`.
3. Run Medusa locally (Node 20): `cd apps/medusa/apps/backend && npm run dev` (:9000).
4. Migrate + seed locally with the commands above (local `DATABASE_URL`/`CMS_DATABASE_URL`).
5. `bun run dev` in `apps/web`.

See also: DEVELOPER_GUIDE.md (deeper), GO_LIVE_GUIDE.md (deploy), IMPLEMENTATION_STATUS.md (status).
