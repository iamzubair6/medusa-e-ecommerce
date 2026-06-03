# Deployment Guide (free showcase stack)

Deploy the whole project for **$0** for testing/showcase. No domain or paid server
required. When you're ready for production, the same setup scales (add a paid
Render/Neon tier + a custom domain).

## The free stack

| Piece | Host | Free? | Notes |
|---|---|---|---|
| PostgreSQL | **Neon** | ✅ | One database holds **both** the Medusa (`public`) and CMS (`cms`) schemas. |
| Medusa backend | **Render** (Web Service) | ✅ | Node 20. Free instances **sleep when idle** (~30–60s cold start) — fine for a demo. (Railway / Fly.io work too.) |
| Storefront + CMS admin | **Vercel** | ✅ | Next.js. (AWS Amplify also works for *this part* only.) |
| Redis | — | ✅ | Not needed; Medusa uses in-memory modules. |

> **Why not all on Amplify/Vercel?** Medusa is an always-on Node server, not
> serverless — it can't run on Vercel/Amplify functions. Keep it on Render.

---

## Step 1 — Database (Neon)

1. Create a free project at **neon.tech**. Copy the connection string
   (`postgresql://user:pass@...neon.tech/dbname?sslmode=require`).
2. Create the CMS schema (Neon SQL editor): `CREATE SCHEMA IF NOT EXISTS cms;`
3. From your machine, push the CMS schema + seed content into Neon:
   ```bash
   CMS_DATABASE_URL="postgres://…neon…/db?sslmode=require&schema=cms" \
     bun run --filter @ecom/cms db:push
   CMS_DATABASE_URL="postgres://…neon…/db?sslmode=require&schema=cms" \
     bun run --filter @ecom/cms db:seed
   ```

---

## Step 2 — Medusa backend (Render)

1. **New → Web Service**, connect this GitHub repo.
2. Settings:
   - **Root Directory**: `apps/medusa/apps/backend`
   - **Runtime**: Node · **NODE_VERSION** env = `20`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. **Environment variables**:
   ```
   DATABASE_URL = <Neon connection string>     # Medusa uses the public schema
   JWT_SECRET = <random long string>
   COOKIE_SECRET = <random long string>
   STORE_CORS = https://<your-vercel-app>.vercel.app
   ADMIN_CORS = https://<this-render-service>.onrender.com
   AUTH_CORS  = https://<vercel>,https://<render>
   ```
4. Deploy. Then run one-off commands (Render **Shell**), Node 20:
   ```bash
   npx medusa db:migrate                                  # if not run by build
   npx medusa exec ./src/scripts/seed-rich-catalog.ts     # BDT region + demo products
   npx medusa exec ./src/scripts/seed-promotions.ts       # WELCOME10
   npx medusa exec ./src/scripts/create-storefront-api-key.ts   # copy the sk_… key
   npx medusa user -e admin@yourbrand.com -p <password>   # admin login
   ```
   From the Medusa admin (`https://<render>/app`) → **Settings → Publishable API
   Keys** → copy the publishable `pk_…` key (or it's printed by the seed).

---

## Step 3 — Storefront + CMS admin (Vercel)

1. **New Project**, import this repo. Vercel will detect a monorepo.
2. Settings (bun workspace):
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`  → enable **"Include files outside the Root Directory"** (so the `@ecom/*` workspace packages resolve), **or** set Root = repo root with Build `bun run --filter web build` and Output `apps/web/.next`.
   - **Install Command**: `bun install`
3. **Environment variables**:
   ```
   CMS_DATABASE_URL = postgres://…neon…/db?sslmode=require&schema=cms
   NEXT_PUBLIC_MEDUSA_BACKEND_URL = https://<render>.onrender.com
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = pk_…
   NEXT_PUBLIC_SITE_URL = https://<your-vercel-app>.vercel.app
   ADMIN_PASSWORD = <strong password for /admin>
   ADMIN_SESSION_SECRET = <random long string>
   MEDUSA_ADMIN_API_KEY = sk_…        # from Step 2 (server-only)
   ```
4. Deploy.

---

## Step 4 — Post-deploy

1. **CORS**: make sure Render `STORE_CORS`/`AUTH_CORS` include the final Vercel URL
   (update + redeploy Medusa if the URL changed).
2. **Image search index**: log into `/admin` → **Visual Search → Reindex** (runs in
   your browser against the live products).
3. **Smoke test**: home loads products in ৳ · add to bag · checkout (manual payment) ·
   `/track` an order · `/admin` content edits · camera "Shop Similar".

---

## Limitations on the free tier (and the upgrade path)

- **Render sleeps** when idle → first request after a nap is slow. Paid Render
  ($7/mo) keeps it awake. (Or Railway/Fly.)
- **Payments** use Medusa's *manual* provider (no real charge). Add **Stripe** for
  real payments when you launch.
- **Image search** is local color/composition similarity. For accurate, semantic
  results add a **CLIP** embedding service (needs a small always-on server) — wire
  it when you have one.
- **Auth**: `/admin` is a single shared password (env). Add per-user RBAC before a
  public production launch.
- **Custom domain**: add it in Vercel (frontend) + update `NEXT_PUBLIC_SITE_URL` and
  Medusa CORS. Point Medusa to a subdomain (e.g. `api.yourdomain.com`).

---

## Secrets

Never commit secrets — they're set per platform as env vars (`.env*` is gitignored).
Generate new `JWT_SECRET`, `COOKIE_SECRET`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD`,
and a fresh `MEDUSA_ADMIN_API_KEY` for production (don't reuse the dev ones).
