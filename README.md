# Maison — Headless Fashion E-Commerce + CMS

A modern, headless e-commerce platform with a custom content management system.
A motion-rich storefront where everything — the hero, navigation, product sections,
popups, and campaigns — is composed by admins from a CMS, backed by a dedicated
commerce engine for products, carts, checkout, orders, and fulfillment.

## Features

**Storefront**
- Editorial, animated landing page fully driven by the CMS (dynamic nav + mega-menu,
  video/carousel hero, product rows, category grids, editorial blocks, banners).
- Product listing with sort & pagination, and rich product detail pages with
  variant selection and similar-product suggestions.
- Cart and **guest checkout** (no account required), with address → shipping → payment.
- Promo codes / discounts and a public **parcel tracker** (order number + email).
- Promotional popups with timed / scroll / exit-intent triggers and email capture.

**Admin / CMS**
- Compose pages from reorderable content blocks, each with a dedicated editor.
- Manage navigation & mega-menus, promotional popups, and scheduled campaigns.
- Capture and review guest leads (abandoned carts / newsletter sign-ups).
- Full commerce administration (products, pricing, inventory, orders, fulfillment).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Storefront & Admin | Next.js (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion |
| Commerce engine | Medusa.js |
| Content / CMS data | Prisma + PostgreSQL |
| Tooling | bun workspaces, Zod, TanStack Query, React Hook Form |

## Architecture

A monorepo with a clear split between **content** (CMS) and **commerce** (Medusa),
sharing a single PostgreSQL instance.

```
apps/
  web/        Next.js storefront + custom admin + CMS API
  medusa/     Medusa commerce backend (products, carts, orders, fulfillment)
packages/
  ui/         Design system (tokens, primitives, motion)
  cms/        Prisma schema, Zod validators, CMS domain services
  config/     Shared TypeScript & Tailwind configuration
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design.

## Getting started

**Prerequisites:** [bun](https://bun.sh) 1.3+, Node.js 20 LTS (for the Medusa
backend), and PostgreSQL 14+.

```bash
# 1. Install dependencies
bun install

# 2. Create the database
createdb ecom
psql -d ecom -c "CREATE SCHEMA IF NOT EXISTS cms;"

# 3. Configure environment
cp .env.example .env   # then fill in connection strings & keys

# 4. Set up the CMS schema and seed content
bun run --filter @ecom/cms db:push
bun run --filter @ecom/cms db:seed

# 5. Run the storefront (http://localhost:3000)
bun run dev
```

The Medusa backend lives in `apps/medusa` and runs separately on Node 20 — see
[`apps/medusa/README.md`](apps/medusa/README.md). The storefront works with
placeholder products until the backend is connected.

## Scripts

```bash
bun run dev         # start the storefront in development
bun run build       # production build
bun run typecheck   # type-check all workspace packages
```

## License

Proprietary — all rights reserved.
