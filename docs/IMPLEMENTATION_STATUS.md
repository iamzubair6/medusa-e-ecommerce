# Implementation Status — Fashion-Nova rebuild (living doc)

Single source of truth for what's **done**, **in progress**, and **on hold**.
Update this with every change (see CLAUDE.md "Keep docs in sync"). Older platform
phases (0–5) live in `ROADMAP.md`; deferred production choices in
`PRODUCTION_DECISIONS.md`.

Legend: ✅ done & deployed · 🟡 in progress · ⬜ planned · ⏸️ on hold (needs a decision)

---

## Task board (the 15 tasks) — durable record

> Mirror of the working task list so it persists in the repo. Keep statuses current.

| # | Task | Status |
|---|---|---|
| 1 | Catalog + IA data foundation (6 divisions, categories, collections, attributes) | ✅ |
| 2 | Fix left-sidebar category bug (per-division) | ✅ |
| 3 | Top nav + full-width mega menu (broad vs single-type) | ✅ |
| 4 | Listing pages + filters (`/collections?division=`, derived facets, toolbar) | ✅ |
| 5 | Landing page rebuild (hero, trend, bento, shop-the-latest, footer) | ✅ |
| 6 | Enrich PDP (details, materials, reviews, related/trending) | ✅ |
| 7 | Admin UX overhaul — Site Settings + CMS-managed landing + shadcn fields | ✅ Site Settings `e787ca9`; CMS landing + dynamic add/reorder `79dd28b`; shadcn Combobox + DatePicker `5d8d002` |
| 8 | Device image/video upload field (storage pluggable) | ✅ |
| 9 | Storefront bugs — product share + instant reviews | ✅ |
| 10 | Admin product form — division/occasion/style/trend/material/care + richer editor | ✅ |
| 11 | Discounts — start/expiry dates | ✅ |
| 12 | Checkout — shipping methods + payment options (verify + surface) | ✅ `d8c392d` — BD shipping ৳60 + COD verified; shipping editable in admin, payment card added |
| 13 | Auth — phone-OTP popup, registration (phone+OTP), email/phone login, intl phone, boxed OTP, auto-login | ✅ |
| 14 | Checkout — required fields + intl phone + prefill + persona section + stacked discount | ✅ `d5daa73` |
| 15 | Admin — persona builder (title/bracket/questions/promo code) | ✅ `b876f5b` |
| 16 | Required-field red star (*) across storefront + admin forms | ✅ `de2c591` product/discount/auth/reviews/phone/checkout (admin `required` prop available for any field) |
| 17 | Fix Vercel build fail — time-box sitemap product fetch (cold Medusa hung past 60s) | ✅ `32fc21b` |
| 18 | Multi-user admin auth + roles (replace single-password `ADMIN_PASSWORD` gate) | ✅ built (typecheck + build green; pending commit/deploy) — CMS `AdminUser` + `AdminRole` (ADMIN/EDITOR), scrypt-hashed passwords, HMAC-signed session cookie (`lib/session.ts`, edge-safe), `/admin/users` Team & Roles manager, role-gated middleware; first-run bootstraps an ADMIN from `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_PASSWORD` then retires it |

**Done: 18/18.** Multi-user admin auth + roles (#18) is implemented; see `docs/SMOKE_TEST_18-32.md` for the visual verification checklist. Follow-up: production needs a cms `db push` (adds `AdminUser`/`AdminRole`) — same as the `BRAND_CAROUSEL` enum note below.

> Full day-by-day history of the whole project: [BUILD_LOG.md](./BUILD_LOG.md).

---

## Round 2 — Fully dynamic, Shopify-style CMS (2026-06-09 feedback) ⬜ planned

> **Vision:** every part of the storefront — navigation/IA, mega-menu, landing,
> listing config, PDP content, shipping/payment, settings — must be **admin-managed
> and dynamic** (no hardcoding), like Shopify/other ecommerce CMS. The IA follows
> Fashion Nova: **Division (page `/pages/{division}`) → Collection (mega-menu item
> w/ multi-column popover) → Category (listing filter / special section)**.

| # | Task | Type | Status |
|---|------|------|--------|
| 19 | Restore curated landing (homepage no longer prefers stale seeded CMS home) | fix | ✅ `3e50050` |
| 20 | CMS-manage full landing — editable blocks | add | ✅ `c70705e` hero/promo/feature/sale + trend-card, brand-tile & **collab carousel slides** all editable (`landing.collabSlides` + `CollabSlideArray` editor); `/` renders a PUBLISHED `home` PageLayout via `SectionRenderer` when it has sections, else curated `<Landing>` (#19-safe); optional `BRAND_CAROUSEL` SectionType (schema+renderer) — **needs cms `db push` to add the enum to the DB before a BRAND_CAROUSEL section is created**. Prior: `a2dfd74`,`4da9987` |
| 21 | Section manager: add Create + Delete sections (dynamic) | add | ✅ `(phase1)` create/delete/reorder/edit live |
| 22 | Divisions as admin-managed pages `/pages/{division}` (underline active; per-division mega) | add | ✅ `fd226e8`,`71e9fa1` routing + underline + admin labels/badges (per-division landing content = future) |
| 23 | Admin collection → multi-column popover builder (data-driven mega menu) | add | ✅ `71e9fa1` /admin/navigation builds divisions→collections→columns→links; navbar renders it (fallback to auto) |
| 24 | Listing: generalize category checkboxes + special sub-type section (admin-config) | update | ✅ `listingConfig` SiteSetting + `/admin/listings`: per-listing Category facet show/hide, filter-group reorder, and curated tile row (any source/limit) — replaces the hardcoded Tops row |
| 25 | Migrate remaining admin SelectField → Combobox | update | ✅ `c9bb0d7` all section editors + price-list (incl. searchable category/collection) + campaign + product-creator now use Combobox; `EnumCombobox` helper narrows to the option union (no casts) |
| 26 | Dynamic payment methods management in admin | add | ✅ `a3c7437` `/admin/payments` — CMS `checkout` SiteSetting `paymentMethods[]` (id/label/description/enabled), Zod-validated, checkout renders enabled methods; `/complete` validates chosen method. Live Medusa providers shown read-only (BDT region). |
| 27 | Dynamic shipping methods/zones management in admin | add | ✅ `a3c7437` `/admin/shipping` — live Medusa option amounts (edit via Admin API) + per-option zone display + CMS `checkout.shippingMethods[]` note/visibility override; checkout shipping list filters hidden + shows notes. |
| 28 | Fix hero slide editor design/alignment issue | fix | ✅ `3e50050` |
| 29 | Product form: richer material & care (rich text) | update | ✅ `3e50050` |
| 30 | Move persona into checkout contact-info step | update | ✅ `3e50050` |
| 31 | PDP accordions: max-height + scroll | fix | ✅ `3e50050` |
| 32 | Admin-editable Shipping & Returns content | add | ✅ `3e50050` |
| 33 | Automated test setup — Vitest (unit/component) + Playwright (e2e) | infra | ✅ built (pending commit) — root `vitest.config.ts` (jsdom + RTL, React 19, `@/`→apps/web) + `vitest.setup.ts`; sample tests for `cn`, `Button`, `parseSiteSettings` (9 passing); Playwright `apps/web/playwright.config.ts` + `e2e/home.spec.ts` smoke (auto-starts `next dev` :3200, passes on placeholder data; 1 passing). Scripts: `test`, `test:watch`, `test:e2e`, `test:e2e:install`. Test files excluded from `tsc`/`build` (typecheck green). |
| 34 | `createsuperuser`-style admin CLI (`admin:create`) | infra | ✅ built (pending commit) — `packages/cms/scripts/create-admin.ts` inserts an admin straight into the CMS `AdminUser` table (reuses `createAdminUser` scrypt hashing); interactive (hidden password) **and** flag-driven (`--email/--name/--role/--password`), plus read-only `--list`. Auto-loads `CMS_DATABASE_URL` from `apps/web/.env`. Removes the need for the `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_PASSWORD` first-run dance. Run: `bun run admin:create`. Fixed via `28e1cf0` (run through `bun` directly so interactive TTY works). |
| 35 | Admin sidebar: pin to viewport (was stretching with tall content → bottom whitespace) | fix | ✅ built (pending commit) — `components/admin/sidebar.tsx`: `<aside>` now `sticky top-0 h-screen self-start`; nav `overflow-y-auto`. |
| 36 | CMS-driven home: build the published `home` PageLayout into a full Fashion-Nova composition (owner chose CMS-driven over curated `<Landing>`) | add | ✅ LOCAL — published `home` rebuilt to **10 sections** in Fashion-Nova order: `MARQUEE → HERO → VALUE_PROPS → PROMO_SPLIT → PRODUCT_ROW → TREND_RAIL → CATEGORY_GRID → COUNTDOWN → BRAND_CAROUSEL → BANNER` (idempotent `packages/cms/prisma/seed-home.ts`, `bun run --filter @ecom/cms db:seed-home`; only the `home` PageLayout is touched — nav/popups/site-settings untouched). Uses the 4 new section types from #45. Live re-seed pending. |
| 37 | Seed complete, realistic data (Medusa catalog: products/variants/prices/categories/collections + CMS content: home sections/nav/popups) so the site looks production-real | add | 🟡 LOCAL done — `seed-fashion-catalog` ran: 26 products, 18 categories, 4 collections, BDT region, color×size variants, multi-currency prices, offers; Medusa running on :9000. **Live still pending** (after owner review). |
| 38 | Live login 500 — live Neon CMS DB missing `AdminUser`/`AdminRole` (P2021) | fix | 🟡 diagnosed; **blocked on explicit prod authorization** — live host `ep-orange-frog…neon.tech` has 12 cms tables, only `AdminUser` missing. Fix = `prisma db push` to live (additive) + create a live admin via `admin:create`. |
| 39 | Process rule: every backend/frontend change must be applied to BOTH local and live (schema pushes, seeds, deploys) | infra | 🟡 ongoing — captured per owner instruction 2026-06-14. |
| 40 | Unify landing model → **CMS sections everywhere** (owner decision): make `/pages/[division]` render CMS PageLayout sections (not the curated `<Landing>`), and enrich section types to reach Fashion-Nova richness (trend-card grid, brand tiles, collab carousel, richer hero) | add | 🟡 step 1 done — `/pages/[division]` renders a published PageLayout whose slug = division handle via `SectionRenderer`, falling back to curated `<Landing>` when none. **Step 2 done (#45):** richness enrichment — 4 new section types (PROMO_SPLIT, TREND_RAIL, VALUE_PROPS, COUNTDOWN) added end-to-end + seeded into `home`. **Next:** seed per-division layouts. |
| 45 | Enrich CMS section types to Fashion-Nova richness — **4 new SectionTypes end-to-end** | add | ✅ LOCAL — **PROMO_SPLIT** (2/3-up promo image cards w/ overlay + CTA), **TREND_RAIL** (horizontal snap rail of tall labeled cards), **VALUE_PROPS** (trust-badge strip; icon key→lucide), **COUNTDOWN** (live ticking urgency banner, client component, falls back to heading when elapsed). Each: Zod schema in `packages/cms/src/schemas/sections.ts` (+ `sectionConfigSchemas` + `defaultSectionConfig`), `SectionType` enum value, storefront component in `apps/web/components/site/` wired into `section-renderer.tsx`, admin editor in `apps/web/components/admin/editors/` wired into `section-manager.tsx` (creatable list is `SECTION_TYPES`-derived, so auto-listed). Local cms `db push` added the 4 enum values + `prisma generate`. typecheck (all packages) + `bun run build` green. **Live needs a cms `db push`** to add the 4 enum values before any section of these types is created — same as the `AdminUser`/`BRAND_CAROUSEL` enum notes. |
| 41 | Phone-capture popup → **dedicated `/admin` screen** + dynamic text (owner decision): make title/body/button/success/enabled editable (currently hardcoded in `phone-capture-popup.tsx`), wire the popup to read it | add | ✅ — new `phoneCapture` SiteSetting + Zod schema (`lib/phone-capture-settings.ts`), `/admin/phone-popup` editor (RHF+Zod) saving via `POST /api/admin/phone-capture`, sidebar "Phone Popup" item, popup reads managed copy & `enabled=false` hides it. `db push` not required (uses existing `SiteSetting` table). |
| 46 | Fix Vercel build fail — `/cart` (+ other per-user pages) static-prerender hung on cold Medusa via `getNavData`/`SiteNavbar` (>60s timeout, like #17) | fix | ✅ `export const dynamic = "force-dynamic"` on `/cart`, `/track`, `/wishlist`, `/checkout/success` so they render at request time (not prerendered at build). **Root fix:** `medusaFetch` now time-boxes every Store API call (`AbortSignal.timeout(10s)`) — a cold Render backend *hangs* the connection (never errors) so the existing try/catch never fired; on timeout it aborts → returns null → callers fall back to placeholders, ISR fills real data once warm. This protects all ISR/static pages (`/` fell over next). Local `bun run build` → 49/49 static pages, green. |
| 42 | Seed: relatable, per-category product images (was rotating a generic Unsplash pool → unrelated photos); re-seed local | fix | ✅ LOCAL — `seed-fashion-catalog.ts` now uses a category-keyed `IMAGE_SETS` map (`imageSetKey`/`pairFor`); re-seeded, verified per-type (jacket→outerwear, dress→dresses, heels→shoes, kids→kids, beauty→beauty). Live re-seed pending. |
| 43 | Fix `/admin/listings` duplicate-key React error (division handle collides with same-named category handle after full seed) | fix | ✅ `app/admin/(panel)/listings/page.tsx` dedupes `targets` by handle (division wins). typecheck green. |
| 44 | Landing-style toggle → resolve the "two landing systems" inconsistency with an explicit **per-page** choice (admin) between the curated Fashion-Nova `<Landing>` and the CMS section layout, for the home page + each division | add | ✅ — new `landingMode` SiteSetting + Zod schema (`lib/landing-mode.ts`: record page-key→`"curated"\|"sections"`, `landingModeFor` defaults to `"sections"`), `/admin/landing-style` editor (RHF+Zod, one segmented "CMS Sections" vs "Fashion-Nova Landing" toggle per page) saving via `POST /api/admin/landing-mode`, sidebar "Landing Style" item (`LayoutPanelTop`). `app/page.tsx` + `app/pages/[division]/page.tsx` now read `landingMode` and gate: `"sections"`→published PageLayout when it has sections else curated `<Landing>` (= prior behavior); `"curated"`→always `<Landing>`. No `db push` (uses existing `SiteSetting` table). typecheck + `bun run build` green. |

**Round 2 complete: #19–#32 all ✅** (Phases 0–3 + Phase 4 #26/#27 payments/shipping). **#18 (multi-user admin auth + roles) is now built too** — so every tracked task #1–#32 is implemented. Follow-ups before/at deploy: run a cms `db push` so the new `AdminUser`/`AdminRole` tables, the `BRAND_CAROUSEL` enum, **and** the 4 new `SectionType` enum values from #45 (`PROMO_SPLIT`, `TREND_RAIL`, `VALUE_PROPS`, `COUNTDOWN`) all land in the production DB.

_Verified gap analysis backing these is in this session; build order proposed below
once the architecture is confirmed with the owner._

---

## ✅ Done & deployed
| Area | Notes | Key commit |
|---|---|---|
| Catalog + IA foundation | 6 divisions, content categories, collections, rich product attributes; old demo wiped | `c3dc74d` |
| Listing pages + filters | `/collections/{handle}?division=`, derived facets (Category only on broad; Style-led single-type), Sort/Show/columns, breadcrumb, Tops tile row, per-division sidebar | `72c0a12`, `a193f20`, `0782fbc` |
| Top nav + full-width mega menu | brand swap per division, Sport NEW badge, Men Sale red, broad vs single-type popovers | `51323fa`, `a193f20` |
| Landing page | hero, collab carousel, trend report, promo banner, shop-by-brand, bento, shop-the-latest, rich footer; spacing/full-bleed/popup polish | `1cbe791`, `637dd64` |
| PDP enrichment | materials & care, attributes, tags, reviews (instant), related + trending rows, working share | `a664119`, `990f8ad`, `5c7fac4` |
| Admin product form | division/occasion/style/trend/material/care + richer rich-text editor | `5c7fac4` |
| Device image/video upload | reusable field in product + section editors (storage pluggable) | `4260631` |
| Discount start/expiry dates | `starts_at`/`ends_at` on promotions | `e3d6dd1` |
| Auth | phone-OTP popup, registration (phone+OTP), login by email **or** phone | `e9c638b`, `0c18025` |
| Project `.claude/` setup | agents, commands, skill, docs-sync hook + rules | (committed) |

## 🟡 In progress
- **Phone UX polish** — international phone field (default BD), individual OTP boxes,
  and OTP verify now **auto-creates + logs in** a real customer (derived password).
- **#14 Checkout** — required fields (email, phone, first name, address-by-landmark,
  city), country auto-by-location, intl phone field, persona section + stacked 2–4% discount.
- **#15 Admin persona builder** — dynamic title/bracket text/questions/discount % (in `SiteSetting`).

## ⬜ Planned (next)
- **#7 Re-CMS-ify the landing + Site Settings UI** — make every landing block, the
  announcement bar, marquee, brand names, **delivery line**, and **size guide** editable in `/admin`.
- **#12 Checkout shipping/payment** — verify end-to-end; surface/explain creation
  (Medusa admin) vs custom admin.

## ⏸️ On hold — decisions deferred (see `PRODUCTION_DECISIONS.md`)
- **Image/video upload storage backend** (R2 / Cloudinary) — currently Medusa local disk (ephemeral on free tier).
- **SMS/OTP gateway** — currently mocked (demo code shown on screen).
- **Production hosting** (server + DB) — owner to plan; currently Neon + Render-free + Vercel.

---

_Last updated: through Round 2 Phase 3 (#24 admin-managed listing config — facet visibility/order + curated tile row)._
