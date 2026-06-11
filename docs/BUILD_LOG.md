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

## 2026-06-09 — Persona, checkout, Site Settings, CMS landing, docs
- **Auth/phone polish**: international phone field (default BD) + boxed OTP; OTP verify auto-creates + logs in a real customer (derived password).
- **#15 Admin persona builder** (`/admin/persona`): title, bracket, reward hint, promo code, yes/no questions → CMS `SiteSetting`.
- **#14 Checkout**: required fields (email, first name, address/landmark, city, intl phone) with red stars, optional last name/postal, prefill from customer/phone session, **persona section** that auto-applies a stacked promo when completed.
- **#16 Required-field red stars** across product/discount/auth/reviews/phone/checkout.
- **#7 Site Settings** (`/admin/site`): editable announcement, marquee, brand-per-division, delivery line, size guide, category-tile count — wired into navbar/landing/PDP.
- **#7.1 CMS-managed landing**: homepage renders an admin-built published "home" page's sections (add/edit/reorder via `/admin/pages`), else the curated landing.
- **#12 Checkout shipping/payment** verified (BD ৳60 + COD) + payment card surfaced in admin settings.
- **Docs system**: README (start-here map), IMPLEMENTATION_STATUS (canonical status + 16-task board), BUILD_LOG (this file), DATABASE (dev↔live migrations), LOCAL_DEV; CLAUDE.md rules + memory.

## 2026-06-10 — Round 2: fully dynamic Shopify-style CMS (#19–#32)
> Vision: every storefront surface (nav/IA, mega-menu, landing, listing config, PDP,
> shipping/payment, settings) is admin-managed and dynamic — no hardcoding.
- **#19** restore curated landing (homepage no longer prefers a stale seeded CMS home) — `3e50050`.
- **#20** CMS-manage the full landing — hero/promo/feature/sale + trend-card, brand-tile, and **collab carousel slides** all editable; `/` renders a published `home` PageLayout when it has sections, else the curated landing; optional `BRAND_CAROUSEL` section type — `c70705e` (+ `a2dfd74`, `4da9987`).
- **#21** section manager: create / delete / reorder / edit live.
- **#22** divisions as admin pages `/pages/{division}` (active underline; per-division mega; editable labels/badges) — `fd226e8`, `71e9fa1`.
- **#23** collection → multi-column mega-menu builder at `/admin/navigation` (navbar renders it, auto fallback) — `71e9fa1`.
- **#24** listing config: `listingConfig` SiteSetting + `/admin/listings` — per-listing Category facet show/hide, filter-group reorder, curated tile row (any source/limit) replacing the hardcoded Tops row.
- **#25** finish admin SelectField → searchable **Combobox** (section editors + price-list + campaign + product creator; `EnumCombobox` narrows the union, no casts) — `c9bb0d7`.
- **#26** dynamic payment methods — `/admin/payments` manages CMS `checkout.paymentMethods[]` (id/label/description/enabled); checkout renders enabled ones; live Medusa providers shown read-only — `a3c7437`.
- **#27** dynamic shipping — `/admin/shipping` edits live Medusa option amounts + per-option zone + CMS note/visibility override; checkout filters hidden + shows notes — `a3c7437`.
- **#28** hero slide editor alignment fix · **#29** product material & care rich text · **#30** persona moved into the checkout contact-info step · **#31** PDP accordions max-height + inner scroll · **#32** admin-editable Shipping & Returns content — all `3e50050`.

## 2026-06-12 — #18 multi-user admin auth + roles  →  ALL TASKS #1–#32 BUILT
- Replaced the single shared `ADMIN_PASSWORD` gate with **per-person admin accounts + roles**.
- **CMS**: `AdminUser` model + `AdminRole` enum (**ADMIN** = full incl. user mgmt; **EDITOR** = content/catalog/orders, no user mgmt). Passwords **scrypt-hashed** via Node `crypto` (no new deps).
- **Session**: `admin_session` cookie is an **HMAC-SHA256 signed token** (uid+role) in `apps/web/lib/session.ts` (Web-Crypto, runs in edge middleware AND Node). `lib/admin-auth.ts` exposes `getAdminSession` / `isAuthed` / `requireAdmin`.
- **Middleware** verifies the token and role-gates `/admin/users` (+ API) to ADMIN; editors are redirected.
- **First-run bootstrap**: with 0 users, `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_PASSWORD` seed the first ADMIN, then that path retires. Login page now takes **email + password**.
- **Admin UI**: `/admin/users` ("Team & Roles") — create/role/reset-password/activate/delete; **last active admin can't be demoted/deactivated/removed** (lock-out guard). Sidebar shows the signed-in user; the Users link is ADMIN-only.
- **Gotcha**: `@ecom/cms` barrel must NOT export `node:crypto` code (breaks Next client/edge bundle); the scrypt service is on the server-only subpath **`@ecom/cms/admin-users`**. Schemas/types stay in the barrel.
- **Gates**: `bun run typecheck` clean (all packages) + `bun run build` passes (middleware 34 kB). Local CMS DB pushed.
- **Verification checklist**: `docs/SMOKE_TEST_18-32.md` (per-task: what changed + click-through smoke test).
- **Deploy follow-ups (not yet done)**: (1) production cms `db push` to add `AdminUser`/`AdminRole` **and** the `BRAND_CAROUSEL` enum; (2) set `ADMIN_BOOTSTRAP_EMAIL` in prod env before first admin login. Pushing #18 code to master auto-deploys web→Vercel, so run the prod `db push` first or admin login breaks.

### Recovery snapshot (read this first if memory/context is lost)
- **Project**: fashion e-commerce + custom CMS. Stack: Next.js App Router (`apps/web`, storefront + `/admin`), Medusa commerce (`apps/medusa`, Node 20), Prisma CMS (`packages/cms`, Postgres `cms` schema), `packages/ui` design system. Bun workspaces (Medusa is npm/separate).
- **Status**: **every tracked task #1–#32 is implemented.** #19–#32 are committed & deployed; **#18 is built locally (typecheck+build green) but not yet committed/deployed.**
- **Canonical status** = `docs/IMPLEMENTATION_STATUS.md` (task board with commit hashes). **Full history** = this file. **Deploy** = `docs/GO_LIVE_GUIDE.md` (Neon+Render+Vercel, auto-deploy on push to master).
- **Run locally**: web → `cd apps/web && bunx next dev -p 3200`; Medusa → Node 20, `cd apps/medusa/apps/backend && npm run dev` (:9000). Typecheck `bun run typecheck`; build `bun run build`.
- **Open follow-ups only**: prod `db push` (AdminUser/AdminRole + BRAND_CAROUSEL enum) and set `ADMIN_BOOTSTRAP_EMAIL` before deploying #18. No other tasks pending.

---
_Append a new dated section as work continues. Source of truth for status is the task board in IMPLEMENTATION_STATUS.md._
