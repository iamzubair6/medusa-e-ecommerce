# Build log — day by day (project start → today)

The full history of what was built/implemented, reconstructed from git
(`git log`). For *current* task status see [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md);
for the doc map see [README.md](./README.md). Keep this appended as work continues.

---

## 2026-06-03 — Foundation + storefront + admin + Bangladesh catalog (84 commits)
The whole platform stood up in one day.
- **Monorepo & tooling**: bun workspaces (`apps/web`, `packages/*`), shared tsconfig + Tailwind preset, prettier/ignore.
- **Design system (`@ecom/ui`)**: tokens, motion presets, primitives (button, input, Radix select, badge, layout/feedback).
- **CMS (`@ecom/cms`)**: Prisma schema + client singleton, Zod validators, domain services + seed.
- **Storefront (`apps/web`)**: app shell + providers + admin-auth middleware; Medusa data layer (placeholder fallback); cart/checkout server client + `useCart`; navbar w/ mega-menu + footer; animated hero (video|carousel) + marquee; product card/grid/row; CMS sections + renderer; promo popup, listing view, sort; cart drawer/page + promo code; guest checkout + parcel tracker; home, listing, PDP, cart, checkout, confirmation, track pages; cart/checkout/leads/tracking API routes.
- **Admin**: shell, form fields, auth gate + login; section & campaign managers; per-type section editors + popup/nav editors; dashboard, pages, navigation, popups, campaigns, leads + admin API routes.
- **Commerce (Medusa)**: turbo wrapper, backend config, source + custom scripts + seed.
- **Brand pass**: Fashion-Nova-style layout, then restored Maison palette/fonts (kept FN layout).
- **Bangladesh catalog**: BDT region + rich seed (colors/sizes/stock/offers); variant-aware commerce (per-color price/sizes/stock, Taka ৳); rich PDP (color gallery, low-stock, hover-zoom, lightbox, accordions); quick-shop cards (size chips, swatches, sale price, offer badge); category page w/ REFINE-BY rail (Category/Size/Color) + sort + grid; promo popup w/ preference chips + consent; right-aligned hero promo.
- **Visual search**: product embedding model + client-side image embedding + similarity ranking + API + "Shop Similar" modal + admin reindex.
- **Checkout**: Cash-on-Delivery (order metadata tag, priced shipping only) + payment step.
- **SEO**: robots.txt + dynamic sitemap.
- **Docs**: plan, architecture, roadmap, developer/admin/product guides, free-stack deploy guide, single-server Docker deploy guide + compose example.

## 2026-06-04 — Admin depth + storefront commerce features (30 commits)
- **Admin**: categories on products + storefront category/collection filtering; order cancel + COD refund guidance; list pagination + customer detail w/ order history; toast notifications; 14-day revenue/orders bar charts; advanced promotions (BOGO, free shipping, category/collection-targeted); price-lists (timed sales); product tags & type (auto-create); settings hub (shipping rates + regions/tax/channels/users/reasons); category & collection management; custom badge offer type; editable return/refund reasons + sales-channel rename/toggle; mega-menu builder (no raw JSON); headless server-side visual-search reindex.
- **Storefront**: price from `calculated_price` so price-list sales show; auto discount-% pill; functional size-guide modal; **product reviews** (CMS-backed) + rich-text descriptions; **wishlist** (localStorage); **customer accounts** (register/login/session, profile, order history); checkout links order to signed-in customer; navbar reflects signed-in state; **saved address book**.
- **Medusa**: reset-and-seed BD store script (EU cleanup, Dhaka shipping, categories/collections).
- **Docs**: online-payments plan, backlog (emails, Q&A, address prefill), roadmap refresh.

## 2026-06-07 — Go live + Fashion-Nova rebuild begins (9 commits)
- **Deployment fixes** (Neon + Render + Vercel): type-safe seed scripts; `medusa db:migrate --skip-scripts` on deploy; Prisma generate during Vercel build; bundle Prisma **rhel** engine for serverless; lockfile flag fix.
- **Go-Live guide** (docs).
- **Fashion-Nova rebuild**: full catalog seed (6 divisions, categories, collections, rich attributes); division-aware faceted listing pages + dynamic sidebar; division-aware nav + full-width mega menu.

## 2026-06-08 — PDP/landing/auth + docs system (18 commits, ongoing)
- **Storefront**: enriched PDP (materials & care, attributes, related + trending); Fashion-Nova landing page; IA correction (collections routing + derived facets + broad/single mega); landing polish (full-height collab carousel, marquee, spacing, full-bleed, popup); curated tile row placement; working product share + instant reviews.
- **Admin**: product attributes (division/occasion/style/trend/material/care) + richer rich-text + PDP tags; reusable device image/video upload field; discount start/expiry dates.
- **Auth**: phone-OTP capture + passwordless session; registration (phone+OTP) + email/phone login; international phone field (BD default) + boxed OTP + auto-create-login.
- **Project/docs**: `.claude` setup (agents/commands/skill/docs-sync hook + rules); docs reorganized (README index, IMPLEMENTATION_STATUS canonical + 15-task board, DATABASE, LOCAL_DEV, PRODUCTION_DECISIONS); workflow rules (feedback→tasks, read-status-first).

---
_Append a new dated section as work continues. Source of truth for status is the task board in IMPLEMENTATION_STATUS.md._
