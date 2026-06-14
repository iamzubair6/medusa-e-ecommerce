# 🧰 Scripts reference — what each script does, when & why

One place for every runnable script in the repo. For deeper DB/migration flow see
[`DATABASE.md`](./DATABASE.md); for deploy see [`GO_LIVE_GUIDE.md`](./GO_LIVE_GUIDE.md).

> **Package managers:** the web app + packages use **bun** (run from the repo root).
> The Medusa backend uses **npm + Node 20** and is run separately from
> `apps/medusa/apps/backend` (prefix commands with
> `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"`).

---

## Everyday development (run from repo root, bun)

| Command | What it does | When / why |
|---|---|---|
| `bun run dev` | Starts the storefront + admin (`next dev` on **:3200**) | Day-to-day local work. Open `http://localhost:3200`. |
| `bun run build` | Production build of the web app (`db:generate` + `next build`) | Before pushing/deploying, to catch build errors. |
| `bun run typecheck` | Type-checks **all** workspace packages (`tsc --noEmit`) | Before "done"/commit — must be clean. |
| `bun run format` | Prettier write across the repo | Tidy formatting. |

## Tests

| Command | What it does | When / why |
|---|---|---|
| `bun run test` | Vitest unit/component tests (jsdom + React Testing Library) | After logic/component changes. Fast; no backend needed. |
| `bun run test:watch` | Vitest in watch mode | While writing tests. |
| `bun run test:e2e` | Playwright end-to-end (auto-starts `next dev` :3200) | Before shipping a flow change. Needs the browser installed once. |
| `bun run test:e2e:install` | Installs the Playwright Chromium browser | One-time setup before the first `test:e2e`. |

## CMS database (Prisma) — run from repo root unless noted

| Command | What it does | When / why |
|---|---|---|
| `bun run --filter @ecom/cms db:generate` | Regenerates the Prisma client | After editing `packages/cms/prisma/schema.prisma`. |
| `bun run --filter @ecom/cms db:push` | Pushes the schema to the **local** DB (additive) | After a schema change, to sync your local DB. |
| `bun run --filter @ecom/cms db:migrate` | Creates/applies a dev migration | When you want a tracked migration instead of a push. |
| `bun run --filter @ecom/cms db:seed` | Seeds baseline CMS content | Fresh local CMS setup. |
| `bun run --filter @ecom/cms db:seed-home` | (Re)builds the rich **home** PageLayout (10 Fashion-Nova sections) | To restore/refresh the demo home layout. Scoped to `home` only. |
| `bun run --filter @ecom/cms db:studio` | Opens Prisma Studio (DB browser) | To inspect/edit CMS rows visually. |

> After a **local** `db:push`, restart `bun run dev` so the running server loads the
> regenerated Prisma client (otherwise reads of new enum values 500).

## Admin users

| Command | What it does | When / why |
|---|---|---|
| `bun run admin:create` | Creates an admin user (interactive: email, name, role, hidden password) | First admin on a fresh DB, or adding admins from the terminal. Like Django's `createsuperuser`. |
| `bun run admin:create -- --list` | Lists existing admins (read-only) | Check who has access. |
| `bun run admin:create -- --email x@y.com --name "Owner" --role ADMIN` | Non-interactive create (prompts only for password) | Scripted/quick create. Roles: `ADMIN` (full + user mgmt) or `EDITOR`. |

## Commerce catalog (Medusa) — Node 20, from `apps/medusa/apps/backend`

Run with: `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` then
`npx medusa exec ./src/scripts/<file>.ts`. Each script's file header explains it.

| Script | What it does | When / why |
|---|---|---|
| `seed-fashion-catalog.ts` | **Full Fashion-Nova catalog** — WIPES products/categories/collections, builds 6 divisions, categories, collections (New In/Sale/Trending/Luxe), rich products with color×size variants, BDT/USD/EUR prices, **category-matched images**, inventory, offers | Make a store look production-real from scratch. ⚠️ wipes existing catalog. |
| `seed-rich-catalog.ts` | BD/BDT region + rich demo products with per-color prices & metadata | Alternative/smaller rich seed. |
| `seed-promotions.ts` | Seeds discounts/promotions | To add promo codes. |
| `seed-storefront-taxonomy.ts` | Seeds the category/division taxonomy | Taxonomy-only setup. |
| `seed-mens-products.ts` / `seed-bd-store.ts` | Targeted product seeds | Topping up specific catalog areas. |
| `create-storefront-api-key.ts` | Creates a storefront publishable API key | When the storefront key is missing/rotated. |

## Deploy / live database

| Command | What it does | When / why |
|---|---|---|
| `bash scripts/setup-live-db.sh <email> [name] [role]` | Syncs the **live** CMS schema (`prisma db push`, additive) **and** creates a live admin. Reads the live DB URL from `.env.deploy-secrets`, confirms before touching prod | After deploying a CMS schema change (new model/column/SectionType), or to fix the live `/admin` login 500. |
| `bash scripts/setup-live-db.sh --schema-only` | Same, but only the schema push (no admin created) | When live just needs the schema synced. |

> **Push = deploy.** Pushing to `master` auto-deploys web → Vercel and Medusa →
> Render. Code is additive/safe, but a CMS schema change also needs
> `setup-live-db.sh` so the live DB matches — otherwise new tables/enums are missing
> on live. See [`DATABASE.md`](./DATABASE.md) and [`GO_LIVE_GUIDE.md`](./GO_LIVE_GUIDE.md).
