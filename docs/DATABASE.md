# Database & migrations — dev ↔ live

How the databases are structured and how to change/migrate them safely in **dev**
and **live**. Two separate migration systems share one Postgres.

## Topology

- **One Postgres** (prod = **Neon**) holds **two schemas**:
  - `public` → **Medusa** (commerce: products, orders, carts, customers, promotions…)
  - `cms` → **CMS / Prisma** (PageLayout, Section, NavMenu, Popup, ProductReview, OtpChallenge, SiteSetting…)
- **Env vars**: `DATABASE_URL` (Medusa, `public`), `CMS_DATABASE_URL` (CMS, `cms`).

### Connection strings (Neon)
- **DIRECT** (non-pooled host, no `-pooler`): use for **migrations, seeds, and the
  always-on Medusa server**. `…@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require`
- **POOLED** (`-pooler` host): use for **serverless (Vercel) runtime / CMS**.
  Keep it minimal — `…?sslmode=require` (extra `&` params have caused
  "invalid domain character"; see PRODUCTION_DECISIONS / GO_LIVE_GUIDE).

## Two migration systems

### 1. Medusa (commerce) — MikroORM
- Schema migrations: `npx medusa db:migrate` (Node 20, DIRECT `DATABASE_URL`).
- `src/migration-scripts/*` are **data seeds** that run with `db:migrate` and are
  **NOT idempotent** → always use **`--skip-scripts`** except first-time setup.
- **Live deploy auto-runs them**: the Render Dockerfile `CMD` is
  `npx medusa db:migrate --skip-scripts && npm run start`. So Medusa schema changes
  apply automatically on the next Render deploy. ✅ no manual step.

### 2. CMS (Prisma) — db push
- After editing `packages/cms/prisma/schema.prisma`:
  ```bash
  bun run --filter @ecom/cms db:generate                       # regenerate client
  CMS_DATABASE_URL="<neon pooled ?sslmode=require>" \
    bun run --filter @ecom/cms db:push                         # sync schema to DB
  ```
- ⚠️ **Vercel does NOT run Prisma migrations.** CMS schema changes must be pushed to
  Neon **manually** with `db:push` (run it before/with the deploy). The runtime only
  needs `prisma generate` (already in the web build) + the updated DB.
- This project uses **`db push`** (no migration files). For audited migrations later,
  switch to `prisma migrate`.

## Dev → live workflow (recommended)

1. **Change schema** (Prisma model or Medusa migration).
2. **Apply + verify locally**:
   - CMS: `db:generate` + `db:push` (to a local DB *or* directly to Neon).
   - Medusa: `npx medusa db:migrate --skip-scripts` (Node 20).
   - Run `apps/web` (`bun run dev` → :3200) and confirm. See [LOCAL_DEV.md](./LOCAL_DEV.md).
3. **Ship**: commit + push.
   - Medusa schema → applies automatically on the **Render** deploy.
   - CMS schema → run **`db:push` to Neon** yourself (Vercel won't). Then the Vercel
     deploy picks it up.
4. Update [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md).

## Seeding
- Seed/admin scripts: `npx medusa exec ./src/scripts/<file>.ts` (Node 20, DIRECT URL).
  See the `/seed` command and [PRODUCT_GUIDE.md](./PRODUCT_GUIDE.md).
- Seed scripts are **type-checked by `medusa build`** — keep them type-safe.

## Safety
- **Never run destructive wipes against prod** unless intended (e.g.
  `seed-fashion-catalog.ts` deletes all products/categories/collections first).
- For risky changes, use **Neon branching** to test on a copy, then apply to main.
- Back up before big changes: `pg_dump "<DIRECT_URL>" > backup.sql`.

See also: [README.md](./README.md) (doc map), [GO_LIVE_GUIDE.md](./GO_LIVE_GUIDE.md),
[PRODUCTION_DECISIONS.md](./PRODUCTION_DECISIONS.md).
