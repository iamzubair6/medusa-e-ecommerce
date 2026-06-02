# E-Commerce + CMS — Product Plan

> Living document. Owner: Zubair Rahman. Last updated: 2026-06-02.

## 1. Vision

A fully scalable, beautifully animated e-commerce storefront where an admin
controls **all** content and commerce behavior from a CMS — no code changes
required to run a campaign, swap the hero, launch a popup, or reorder product
sections. Reference inspiration: [Fashion Nova](https://www.fashionnova.com/)
and the [Figma community design](https://www.figma.com/design/xwphUaxlvA6fY63Zp1CGut/Fashion-E-commerce-Website--Community-).

Design north star: modern, motion-rich, premium fashion brand. Fast, accessible,
SEO-strong.

## 2. Core capabilities (from the brief)

### Storefront (customer-facing)
- **Dynamic navbar** — menus, mega-menu, announcement bar, all CMS-driven.
- **Animated hero** — conditionally renders **video OR carousel** based on CMS
  config; modern entrance/scroll animations.
- **Multiple product section types** — featured, new arrivals, best sellers,
  category grids, editorial blocks — order and content set in CMS.
- **Product detail page (PDP)** — gallery, variants, size/color, stock, add-to-cart.
- **Similar / "you may also like" suggestions** on PDP.
- **Cart** — works for guests and registered users.
- **Guest checkout** — buy without registering.
- **Guest lead capture** — a guest who fills info but does NOT check out has
  their cart + info stored (visible/manageable in CMS for remarketing).
- **Parcel tracker** — customer tracks order/parcel status.
- **Image search** — upload/snap an image, find visually similar products.
- **Promotional popup** — timed/triggered marketing popups, CMS-controlled.

### CMS / Admin (control plane)
- Manage products, variants, inventory, collections, pricing.
- Control hero (video|carousel toggle + assets), navbar, popups, page sections.
- "Add run" / campaign functionality (scheduled content + promo runs).
- View and manage orders, fulfillment, and **parcel tracking** status.
- View captured **guest leads** (abandoned info/carts) for remarketing.
- Media library, roles/permissions.

## 3. Decided stack (confirmed with owner 2026-06-02)

| Concern              | Choice                                              |
|----------------------|-----------------------------------------------------|
| Storefront + Admin   | **Next.js (App Router)** in `apps/web`              |
| Commerce backend     | **Medusa.js** (Node) in `apps/medusa`               |
| Content/CMS data     | **Prisma** models in same Postgres (custom CMS)     |
| Database             | **PostgreSQL** (single instance, separate schemas)  |
| Image search (later) | CLIP embeddings + **pgvector** in Postgres          |
| Package manager      | **pnpm** workspaces (monorepo)                      |

### Why this shape
- Next.js → SSR/SSG for SEO on product pages, image optimization, fast paint.
- Medusa → batteries-included commerce: products, variants, inventory, cart,
  guest + registered checkout, orders, fulfillment, payments, regions.
- Prisma CMS → Medusa uses MikroORM internally; we do **not** force Prisma onto
  Medusa. Instead Prisma owns a separate **content** schema (hero, nav, popups,
  section layouts, guest leads) in the same Postgres. Clean boundary.
- pgvector → image search reuses the existing Postgres, no new datastore.

## 4. Domain boundaries (who owns what data)

```
Medusa (commerce schema)          Prisma "cms" schema           Next.js web
─────────────────────────         ──────────────────────        ───────────────
products, variants, prices        hero config (video|carousel)  storefront pages
inventory, collections            navbar / mega-menu            custom admin UI
carts, orders, payments           page section layout + order   image-search UI
customers, addresses              promotional popups            calls both APIs
fulfillment / tracking            campaign "runs" (schedule)
regions, tax, shipping            guest leads (abandoned info)
                                  media references
```

The storefront reads commerce data from Medusa's Store API and content from the
CMS API (Next route handlers backed by Prisma). The PDP merges both: product
from Medusa, editorial/section context from CMS.

## 5. Non-functional requirements
- **SEO**: SSR/ISR product & collection pages, structured data (JSON-LD), sitemaps.
- **Performance**: Core Web Vitals green; image optimization; route-level caching.
- **Accessibility**: WCAG AA; keyboard + screen-reader friendly; reduced-motion support.
- **Scalability**: stateless web, Medusa horizontally scalable, Redis for cache/events.
- **Security**: secrets in env only; input validated (Zod on web, Medusa validators);
  admin behind auth + RBAC; rate limiting on public endpoints.
- **i18n-ready**: Medusa regions/currencies; copy externalized where feasible.

## 6. Conventions (inherits global + project CLAUDE.md)
- Forms: React Hook Form + Zod. Data fetching: TanStack Query on client, server
  components/route handlers on server. No `useEffect`+fetch, no raw form state.
- TypeScript strict: no `any`, no `@ts-ignore`, no unsafe `as`. Types from Zod.
- Every async UI handles loading / error / empty.
- All list endpoints paginated and scoped.
- Conventional Commits; never commit to `main`; never commit secrets.

## 7. Open questions / later decisions
- Payment provider(s): Stripe assumed for dev; confirm live provider + regions.
- Auth for storefront accounts: Medusa customer auth vs. add social login later.
- Hosting target: Vercel (web) + container host for Medusa (Railway/Fly/VPS)?
- Search engine for text search: Postgres FTS first, MeiliSearch/Algolia later.
- Image-search model hosting: local CLIP service vs. hosted embeddings API.

See `ROADMAP.md` for phasing and `ARCHITECTURE.md` for system design.
