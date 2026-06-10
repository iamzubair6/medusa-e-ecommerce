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
| 18 | Multi-user admin auth + roles (replace single-password `ADMIN_PASSWORD` gate) | ⬜ planned (future) |

**Done: 17/18 · Planned: #18 (multi-user admin auth + roles).**

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
| 20 | CMS-manage full landing — editable blocks | add | 🟡 `a2dfd74`,`4da9987` hero/promo/feature/sale + trend-card & brand-tile arrays editable; remaining: collab carousel slides, optional generic-section home |
| 21 | Section manager: add Create + Delete sections (dynamic) | add | ✅ `(phase1)` create/delete/reorder/edit live |
| 22 | Divisions as admin-managed pages `/pages/{division}` (underline active; per-division mega) | add | ✅ `fd226e8`,`71e9fa1` routing + underline + admin labels/badges (per-division landing content = future) |
| 23 | Admin collection → multi-column popover builder (data-driven mega menu) | add | ✅ `71e9fa1` /admin/navigation builds divisions→collections→columns→links; navbar renders it (fallback to auto) |
| 24 | Listing: generalize category checkboxes + special sub-type section (admin-config) | update | ✅ `listingConfig` SiteSetting + `/admin/listings`: per-listing Category facet show/hide, filter-group reorder, and curated tile row (any source/limit) — replaces the hardcoded Tops row |
| 25 | Migrate remaining admin SelectField → Combobox | update | 🟡 `3e50050` product-creator division done; section editors/price-list/campaign remain |
| 26 | Dynamic payment methods management in admin | add | ⬜ Phase 4 |
| 27 | Dynamic shipping methods/zones management in admin | add | ⬜ Phase 4 |
| 28 | Fix hero slide editor design/alignment issue | fix | ✅ `3e50050` |
| 29 | Product form: richer material & care (rich text) | update | ✅ `3e50050` |
| 30 | Move persona into checkout contact-info step | update | ✅ `3e50050` |
| 31 | PDP accordions: max-height + scroll | fix | ✅ `3e50050` |
| 32 | Admin-editable Shipping & Returns content | add | ✅ `3e50050` |

**Phase 0–3 done** (#19, #28–#32, #25 started; #20, #21 page builder; #22, #23 nav/IA; #24 listing config). Remaining: finish #20/#25, then Phase 4 (#26, #27 dynamic payment/shipping).

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
