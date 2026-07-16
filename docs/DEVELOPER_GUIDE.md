# Developer Guide

Everything a developer needs to understand, run, and maintain this project.

---

## 1. The big picture

This is a **headless fashion e-commerce platform** split into two concerns that
share one PostgreSQL server:

```
                    ┌──────────────────────────────────────────┐
   Shopper ───────► │  Next.js app  (apps/web, port 3000/3200)  │
                    │  • Storefront        • Custom CMS admin    │
                    │  • CMS API routes    • Visual search       │
                    └───────┬───────────────────────┬───────────┘
            Store/Admin API │                       │ Prisma
                            ▼                       ▼
                ┌────────────────────┐   ┌────────────────────────┐
   Admin ─────► │  Medusa backend     │   │  PostgreSQL             │
   (:9000/app)  │  (apps/medusa,9000) │   │  • "medusa" DB (commerce)│
                │  products, carts,   │   │  • "ecom" DB / cms schema│
                │  orders, inventory, │   │    (CMS content + image  │
                │  discounts, regions │   │     embeddings, Prisma)  │
                └─────────┬───────────┘   └────────────────────────┘
                          │
                     PostgreSQL ("medusa" DB)
```

- **Commerce** (products, prices, variants, inventory, cart, checkout, orders,
  fulfillment, discounts, regions) lives in **Medusa**. Managed in the **Medusa
  Admin** at `:9000/app`.
- **Content** (landing page composition, hero, navigation, popups, campaigns,
  guest leads) lives in **Prisma** (`cms` schema). Managed in the **custom CMS
  admin** at `/admin`.
- The storefront reads commerce from Medusa's Store API and content from the CMS,
  and merges them (e.g. a product row's heading is CMS, its products are Medusa).

**Currency:** Bangladeshi Taka (৳ / BDT). The storefront prefers the Medusa
"Bangladesh" region.

---

## 2. Tech stack

| Concern | Tech |
|---|---|
| Monorepo / tooling | **bun workspaces** (`apps/web` + `packages/*`) |
| Storefront + admin | Next.js (App Router), TypeScript (strict), Tailwind CSS, Radix UI, Framer Motion |
| Client data / forms | TanStack Query, React Hook Form + Zod |
| Commerce engine | Medusa.js (own **npm** deps, **Node 20 LTS**) |
| CMS data | Prisma + PostgreSQL (`cms` schema) |
| Image search | browser canvas embeddings + cosine ranking in Postgres |

> `apps/medusa` is **not** part of the bun workspace — it manages its own deps
> with npm and must run on **Node 20**.

---

## 3. Folder structure (what each part is for)

```
e-com/
├── apps/
│   ├── web/                         Next.js storefront + custom CMS admin
│   │   ├── app/
│   │   │   ├── page.tsx             Home (CMS-composed landing)
│   │   │   ├── layout.tsx           Root layout, fonts, <Providers>
│   │   │   ├── providers.tsx        TanStack Query + cart + visual-search contexts
│   │   │   ├── products/            PLP (/products) + PDP (/products/[handle])
│   │   │   ├── collections/[handle] Collection listing
│   │   │   ├── c/[handle]           Category listing
│   │   │   ├── cart/                Cart page
│   │   │   ├── checkout/            Checkout + /checkout/success
│   │   │   ├── track/               Public parcel tracker
│   │   │   ├── admin/               Custom CMS admin (login + (panel) group)
│   │   │   └── api/                 Route handlers (see §6)
│   │   ├── components/
│   │   │   ├── site/                Storefront UI (navbar, hero, product-card,
│   │   │   │                        pdp-client, category-body, shop-similar-modal…)
│   │   │   ├── cart/                Cart drawer / page / promo-code
│   │   │   ├── checkout/            checkout-client
│   │   │   ├── track/               track-client
│   │   │   └── admin/               Admin UI (sidebar, fields, editors/, managers,
│   │   │                            visual-search-client)
│   │   ├── lib/                     Server/client helpers (see §5)
│   │   ├── hooks/use-cart.ts        Cart query + mutations (TanStack Query)
│   │   ├── middleware.ts            Gates /admin and /api/admin behind a session cookie
│   │   ├── next.config.ts           transpilePackages, image hosts
│   │   └── tailwind.config.ts       Pulls the shared preset
│   └── medusa/                      Medusa backend (turbo wrapper)
│       └── apps/backend/            @dtc/backend
│           ├── medusa-config.ts     DB + CORS config
│           └── src/scripts/         create-storefront-api-key, seed-promotions,
│                                    seed-rich-catalog (demo data)
├── packages/
│   ├── ui/                          Design system
│   │   └── src/{components,lib,styles}  primitives, cn/motion, globals.css (tokens)
│   ├── cms/                         CMS data layer
│   │   ├── prisma/schema.prisma     CMS models (+ ProductEmbedding)
│   │   ├── prisma/seed.ts           Seeds home page / nav / popup
│   │   └── src/{index.ts,schemas/}  Domain services + Zod validators
│   └── config/                      Shared tsconfig + tailwind-preset.js
└── docs/                            Guides (this folder)
```

---

## 4. The design system (`packages/ui`)

- `src/styles/globals.css` — the **design tokens** as CSS variables (the "Maison"
  palette: bone background, ink text, claret accent, brass detail). Light/dark.
  Themeable at runtime by overriding the `--token` variables.
- `src/components/` — primitives: `Button` (Radix Slot `asChild`), `Input`,
  `Select` (Radix), `Card`, `Badge`, `Container`, `Skeleton`, `Reveal`.
- `src/lib/motion.ts` — Framer Motion presets (respect `prefers-reduced-motion`).
- `packages/config/tailwind-preset.js` — maps tokens → Tailwind colors + custom
  keyframes/animations. `apps/web/tailwind.config.ts` consumes it.

Change the whole look by editing the tokens in `globals.css` + the preset.

---

## 5. Key library files (`apps/web/lib`)

| File | Role |
|---|---|
| `commerce.ts` | **Read** layer for Medusa Store API. `fetchProducts`, `fetchProductList`, `fetchProductByHandle`, `fetchSimilarProducts`, `fetchProductsForIndex`, `getRegionId`. Maps Medusa products → storefront shapes (colors, sizes, stock, offers) using **variants + product metadata**. Falls back to placeholder products if Medusa is down. Formats Taka. |
| `medusa-store.ts` | **Cart/checkout** against the Store API (create cart, line items, promotions, shipping, payment, complete). Called only from API routes. |
| `medusa-admin.ts` | **Server-only** Admin API client (Basic auth with `MEDUSA_ADMIN_API_KEY`). Used by the parcel tracker to look up orders. |
| `cart-cookie.ts` | Reads/writes the httpOnly `cart_id` cookie. |
| `cart-context.tsx` / `hooks/use-cart.ts` | Cart drawer open-state + cart query/mutations. |
| `admin-auth.ts` | CMS admin session (env `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`). |
| `visual-search.ts` | Server-side cosine ranking over stored embeddings. |
| `embedding-client.ts` | **Browser** image → 16×16 RGB normalized vector (canvas). |
| `visual-search-context.tsx` | Opens the Shop Similar modal (product or upload mode). |
| `rate-limit.ts` | In-memory limiter for public endpoints (tracker, image search). |

---

## 6. API routes (`apps/web/app/api`)

Public (storefront):
- `cart/route.ts`, `cart/line-items/*`, `cart/promotions` — cart operations (cart id in cookie).
- `checkout/customer` (also captures a guest lead), `checkout/shipping`, `checkout/complete`.
- `leads` — newsletter/popup capture. `track` — order lookup by number + email (rate-limited).
- `visual-search` — `POST` (search by uploaded vector), `GET ?productId=` (similar to a product).

Admin (gated by `middleware.ts` → session cookie):
- `admin/login` — sets/clears the session cookie.
- `admin/sections/[id]`, `admin/sections/reorder`, `admin/nav/[key]`, `admin/popups/[id]`,
  `admin/campaigns(/[id])` — CMS writes (Zod-validated, `revalidatePath('/')`).
- `admin/visual-search/products` (list + index status), `admin/visual-search/index` (store vectors).

---

## 7. Data model

**Commerce (Medusa, `medusa` DB)** — products, variants (Color × Size), prices
(per variant, per currency), inventory, carts, orders, regions, discounts.

**CMS (Prisma, `ecom` DB `cms` schema)** — `packages/cms/prisma/schema.prisma`:
`PageLayout`/`Section` (ordered content blocks), `NavMenu`/`NavItem`, `Popup`,
`Campaign`, `GuestLead`, `MediaAsset`, and `ProductEmbedding` (image vectors).

**Rich product data lives in two places** (see PRODUCT_GUIDE.md):
- Medusa **variants** → real sizes, prices, inventory (used for cart/checkout).
- Medusa product **metadata** (JSON) → storefront display extras the core lacks:
  `swatches`, `colorImages`, `colorPrices`, `colorOriginalPrices`, `sizeStock`,
  `offer`. `apps/web/lib/commerce.ts` reads both.

---

## 8. Local setup & running

**Prerequisites:** bun 1.3+, Node 20 LTS (for Medusa), PostgreSQL 14+ running.

```bash
# 1. install web + packages
bun install

# 2. databases
createdb ecom && psql -d ecom -c "CREATE SCHEMA IF NOT EXISTS cms;"
createdb medusa

# 3. env — copy and fill (DB user, Medusa keys; see .env.example)
cp .env.example .env
#   packages/cms/.env  -> CMS_DATABASE_URL
#   apps/web/.env      -> CMS_DATABASE_URL, NEXT_PUBLIC_MEDUSA_*, ADMIN_*, MEDUSA_ADMIN_API_KEY

# 4. CMS schema + seed (home page, nav, popup)
bun run --filter @ecom/cms db:push
bun run --filter @ecom/cms db:seed

# 5. Medusa backend (separate terminal, Node 20)
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd apps/medusa/apps/backend && npm run dev      # http://localhost:9000

# 6. (one-time) seed Medusa demo data + keys (Node 20)
npx medusa exec ./src/scripts/seed-fashion-catalog.ts        # BDT region + demo products
npx medusa exec ./src/scripts/seed-promotions.ts          # WELCOME10
npx medusa exec ./src/scripts/create-storefront-api-key.ts # admin key → apps/web/.env
npx medusa user -e admin@brand.test -p <password>          # Medusa admin login

# 7. storefront
bun run dev          # http://localhost:3000 (this machine: bunx next dev -p 3200)
```

> On this machine port 3000 is taken by another app — run `bunx next dev -p 3200`.

**Checks before committing:**
```bash
bun run typecheck    # all workspace packages, strict
bun run build        # production build of apps/web
```

---

## 9. Conventions

- TypeScript strict: no `any`, no `@ts-ignore`, no unsafe `as`. Types derived from Zod.
- Data fetching: server components / route handlers on the server; TanStack Query
  on the client. Never `useEffect` + fetch.
- Forms: React Hook Form + Zod.
- Every async UI handles loading / error / empty. Respect `prefers-reduced-motion`.
- Shared `@ecom/ui` / `@ecom/cms` use **Bundler module resolution + extensionless
  relative imports** (so they resolve under Next webpack/Turbopack and tsx alike).
- Conventional Commits; never commit secrets (`.env` is gitignored).

---

## 10. Maintenance & common tasks

| Task | How |
|---|---|
| Add/edit CMS models | Edit `packages/cms/prisma/schema.prisma` → `bun run --filter @ecom/cms db:push` → `db:generate`. |
| Change the look | Edit tokens in `packages/ui/src/styles/globals.css` + `packages/config/tailwind-preset.js`. |
| Add a storefront section type | Add a Zod schema in `packages/cms/src/schemas/sections.ts`, a renderer in `components/site/section-renderer.tsx`, and an admin editor. |
| Add demo products | Edit `apps/medusa/apps/backend/src/scripts/seed-fashion-catalog.ts`, re-run via `medusa exec`. |
| Rebuild image-search index | Admin → **Visual Search → Reindex** (browser), or run a Node reindex script. |
| Rotate the storefront admin key | `medusa exec ./src/scripts/create-storefront-api-key.ts`, update `MEDUSA_ADMIN_API_KEY`. |
| Reset CMS content | `bun run --filter @ecom/cms db:seed` (recreates home/nav/popup). |

See **ADMIN_GUIDE.md** for using the two admin panels and **PRODUCT_GUIDE.md** for
adding products with prices.
