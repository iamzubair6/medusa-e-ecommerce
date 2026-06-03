# Roadmap (phased)

Each phase ends in something demoable. ✅ done · 🚧 in progress · ⬜ planned.

## Phase 0 — Foundation & scaffolding  ✅
- ✅ pnpm monorepo (`apps/web`, `packages/*`), shared tsconfig + Tailwind preset.
- ✅ `apps/web` Next.js (App Router, TS strict, Tailwind, design tokens).
- ✅ `packages/ui` design system: tokens, primitives, motion utilities.
- ✅ `packages/cms` Prisma schema (CMS models) + client + Zod validators (seeded).
- ✅ `apps/medusa` scaffolded (Node 20), on dedicated `medusa` Postgres DB, seeded.
- ✅ Local dev: Postgres up (Redis not required — Medusa uses in-memory modules);
      storefront wired to Medusa store API (placeholder fallback when down).

**Exit (met):** repo boots; storefront renders real seeded products; Medusa admin
reachable at :9000/app.

## Phase 1 — Storefront + CMS foundation (FIRST MILESTONE)  ✅
- ✅ Design system: typography, color themes, buttons, cards, inputs, container,
      grid, motion presets (Framer Motion), reduced-motion support.
- ✅ **Dynamic navbar** (announcement bar + mega-menu) driven by CMS.
- ✅ **Animated hero** with CMS `video | carousel` conditional render.
- ✅ **Product section types** (new / best-sellers / category grid / editorial /
      banner / marquee) — order & content from CMS, products from Medusa (placeholder fallback).
- ✅ **Product listing** (PLP) — `/products`, `/collections/[handle]`, `/c/[handle]`
      with sort + pagination.
- ✅ **Product detail page** (gallery, variant selection, quantity, add-to-bag stub) +
      **similar products** + JSON-LD. _(Add-to-bag wires to real cart in Phase 2.)_
- ✅ **Custom admin**: edit hero, navbar, page sections (reorder + per-type editors),
      popups, guest-leads viewer. _(Media = URL fields for now; upload UI later.)_
- ✅ Promotional **popup** (CMS-controlled trigger/schedule + email capture).

**Exit (met):** admin composes the entire landing page; storefront renders it live
with on-save revalidation; PLP + PDP complete.

## Phase 2 — Cart, checkout, orders  🚧
- ✅ Cart (guest), mini-cart drawer, cart page, quantity updates — Medusa-backed,
      cart id in httpOnly cookie, proxied through Next API routes.
- ✅ **Guest checkout** end-to-end: address → shipping → place order → confirmation.
      Uses Medusa's manual payment provider (test). _(Stripe provider swap = follow-up.)_
- ✅ **Guest lead capture**: checkout address step upserts a `GuestLead`
      (source `checkout`, with cart id) → shows in admin → Guest Leads.
- ⬜ Order confirmation emails; registered customer accounts/login.

**Exit (met):** a guest can buy end-to-end; abandoned guests appear in CMS leads.

### Current focus: **Phase 3** (fulfillment & parcel tracking).

## Phase 3 — Fulfillment & parcel tracking  ✅
- ✅ Fulfillment statuses + tracking numbers in Medusa (created via Medusa admin
      `/app` or the admin API; shipment labels carry tracking number + URL).
- ✅ Public **parcel tracker** at `/track` (order # + email, rate-limited 10/min,
      no-leak lookup) with Ordered→Packed→Shipped→Delivered timeline + tracking links.
      Server-side via a Medusa **admin secret API key** (never exposed to the browser).
- ✅ Admin order management + tracking updates — via Medusa's built-in admin at
      `:9000/app` (purpose-built; not duplicated in our custom CMS admin).

**Exit (met):** customers track parcels end-to-end; admin manages fulfillment.

## Phase 4 — Campaigns & merchandising  🚧
- ✅ Campaign "**runs**" admin (CRUD over the Campaign model: name, status,
      schedule, promo code/banner note) at `/admin/campaigns`.
- ✅ Promotions/discounts (Medusa promotions module): promo-code input in cart
      drawer, cart page & checkout; discount in totals. Sample `WELCOME10` seeded
      via `apps/medusa/apps/backend/src/scripts/seed-promotions.ts`.
- 🚧 Targeted popups by schedule already work (Popup `startsAt`/`endsAt`).
      Automated campaign activation (cron applying a run's payload) = follow-up.

**Exit (mostly met):** admin schedules campaigns; shoppers redeem promo codes.

## Phase 5 — Image search  ✅
- ✅ Local visual-similarity: browser-canvas image embeddings (16×16 RGB), stored
      in Postgres, cosine-ranked server-side. (pgvector deferred — brew bottle is
      PG17/18, server is PG14; swappable later. CLIP = future upgrade for semantic.)
- ✅ "Shop Similar" modal (upload + ranked results), wired to the navbar camera and
      the PDP button. Admin **Visual Search → Reindex**.

## Phase 6 — Hardening & launch  ⬜
- ⬜ **Online payments** (cards via Stripe and/or bKash·Nagad·SSLCOMMERZ for BD) —
      COD is live today; see [`docs/PAYMENTS.md`](./PAYMENTS.md) for the plan.
- ⬜ SEO (JSON-LD, sitemaps, metadata), analytics, Core Web Vitals pass.
- ⬜ RBAC + audit log, rate limiting, captcha on public endpoints.
- ⬜ CI (typecheck/lint/test), staging, observability, backups.

---

### Current focus: **Phase 0 → Phase 1**
Build the foundation, then the CMS-driven animated landing experience.
