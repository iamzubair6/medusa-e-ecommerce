# Smoke test — Tasks #18–#32

Visual, click-through verification for every change you asked for in tasks **#18–#32**.
For each task: **what you asked to change**, then **what to do + what you should see**
to confirm it actually works as you expected.

> Canonical status lives in [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).
> This doc is the hands-on checklist that backs it.

## Start the apps first

```bash
# 1) Storefront + Admin (Next.js)
cd apps/web && bunx next dev -p 3200            # → http://localhost:3200  (admin: /admin)

# 2) Medusa backend (separate, Node 20) — needed for catalog, checkout, shipping, payments
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd apps/medusa/apps/backend && npm run dev      # → http://localhost:9000

# If you added the AdminUser table this round, sync the DB once:
cd packages/cms && bun run db:push
```

- **Storefront:** http://localhost:3200
- **Admin:** http://localhost:3200/admin
- **First admin login (new this round):** see #18 below — log in with your
  `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_PASSWORD` the first time.

Legend for pass criteria: ✅ = should happen · ❌ = should NOT happen.

---

## #18 — Multi-user admin auth + roles  *(new this round)*

**What you asked to change:** replace the single shared `ADMIN_PASSWORD` gate with
real per-person admin accounts that have roles — an **Admin** who can do everything
(including managing users) and an **Editor** who can manage content/catalog/orders but
**not** other users. No one should ever get locked out.

**How it was built (so the test makes sense):**
- New `AdminUser` table + `AdminRole` (ADMIN / EDITOR) in the CMS database.
- Passwords are **scrypt-hashed** — never stored in plaintext.
- The session cookie is now an **HMAC-signed token** carrying your id + role (not a shared secret).
- **First-run bootstrap:** the very first login uses `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_PASSWORD`
  to create your ADMIN account, then that env path stops working.

**Smoke test:**

1. **First login / bootstrap** → go to `/admin`. You're redirected to `/admin/login`,
   which now has **Email + Password** fields (not just password).
   - Enter your `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_PASSWORD`. → ✅ you land in the admin.
   - Bottom of the sidebar now shows **your name + "Admin"** and a **"Team & Roles"** nav item.
2. **Create an Editor** → sidebar → **Team & Roles** (`/admin/users`).
   - Fill Name + Email + a temporary password, set **Role = Editor**, **Add member**.
   - → ✅ the new editor appears in the list with an "Editor" role and "Never signed in".
3. **Editor permissions** → sign out (sidebar) and log back in as that editor.
   - → ✅ everything works (products, orders, pages…) **but** the **"Team & Roles"** item
     is **gone** from the sidebar.
   - Manually visit `/admin/users`. → ✅ you're bounced back to `/admin` (❌ no access).
4. **Lock-out protection** → back as the Admin, open Team & Roles.
   - Try to demote/deactivate/delete the **only** Admin. → ❌ blocked with a clear message
     ("can't demote/deactivate/remove the last active admin").
   - Your own row's **Remove** button is disabled (you can't delete yourself).
5. **Password reset** → on any member row, type a new password (≥8 chars) → **Set**.
   - → ✅ toast confirms; that user can log in with the new password, not the old one.
6. **Legacy gate retired** → log out. Try the old behaviour: the login now **requires an
   email**; the shared `ADMIN_PASSWORD` alone no longer logs you in once a user exists. ✅

**Pass = ** per-person logins work, Editor can't reach user management, the last admin
can't be removed, passwords reset cleanly.

---

## #19 — Restore the curated landing page

**What you asked to change:** the homepage was wrongly showing a stale, seeded CMS "home"
page. It should show the **curated** landing again.

**Smoke test:** open http://localhost:3200.
- → ✅ you see the designed landing (hero, collab carousel, trend report, promo banner,
  shop-by-brand, bento, shop-the-latest, footer) — ❌ not a bare/old seeded page.

---

## #20 — CMS-manage the full landing (editable blocks)

**What you asked to change:** every landing block — hero/promo/feature/sale, trend cards,
brand tiles, and the **collab carousel slides** — must be editable from the admin, and
the homepage should render an admin-published `home` page when one exists, else the
curated landing.

**Smoke test:**
1. Admin → **Pages** (`/admin/pages`) → open the landing/home layout.
2. Edit a **hero** headline and a **collab carousel slide** (image/label), save.
3. Reload the storefront homepage. → ✅ your edits show.
4. Collab carousel: → ✅ you can add / reorder / remove slides and they reflect on `/`.

**Pass = ** changing landing content in admin visibly changes the homepage; collab slides
are fully editable. *(If you create a `BRAND_CAROUSEL` section, run `db push` first.)*

---

## #21 — Section manager: create + delete + reorder

**What you asked to change:** sections on a page must be fully dynamic — add new ones,
delete, reorder, edit — not hardcoded.

**Smoke test:** Admin → **Pages** → a layout.
- Add a section (pick a type), edit it, drag to reorder, delete it.
- → ✅ each action persists after save and reflects on the storefront page.

---

## #22 — Divisions as admin-managed pages `/pages/{division}`

**What you asked to change:** the 6 divisions should be real pages at `/pages/{division}`
with the active one underlined in the nav, and labels/badges editable in admin.

**Smoke test:**
1. Storefront → click a division in the top nav. → ✅ you land on `/pages/{division}`
   and that nav item is **underlined/active**.
2. Admin → **Navigation** → change a division's label/badge (e.g. a "NEW" badge).
   → ✅ it updates in the storefront nav.

---

## #23 — Collection → multi-column mega-menu builder

**What you asked to change:** the mega menu must be data-driven from admin — build
divisions → collections → columns → links — not hardcoded.

**Smoke test:**
1. Admin → **Navigation** (`/admin/navigation`) → under a division, add a collection,
   add a column, add links.
2. Storefront → hover that division in the top nav. → ✅ the mega-menu popover shows your
   columns and links. (Remove all custom nav → ✅ it falls back to the auto menu.)

---

## #24 — Listing: admin-config category facets + special tile row

**What you asked to change:** stop hardcoding listing filters / the "Tops" special row.
Per listing, admins should show/hide the **Category** facet, reorder filter groups, and
configure a curated tile row (any source + limit).

**Smoke test:**
1. Admin → **Listings** (`/admin/listings`) → pick a listing.
2. Hide the Category facet, reorder a filter group, set a curated tile row (source + limit), save.
3. Storefront → open that listing (`/collections/{handle}` or a division page).
   - → ✅ Category facet visibility + filter order match your config.
   - → ✅ the curated tile row shows your chosen products (❌ not the old hardcoded Tops row).

---

## #25 — Migrate remaining admin SelectField → Combobox

**What you asked to change:** finish moving admin dropdowns to the searchable **Combobox**
(section editors, price-list, campaign, product creator), including searchable
category/collection pickers.

**Smoke test:** open these admin forms and click their dropdowns:
- **Sales** (`/admin/price-lists`), **Campaigns** (`/admin/campaigns`), **Products** (new product),
  and any **section editor** (Pages → a section).
- → ✅ each dropdown is a Combobox you can **type to filter** (not a plain native `<select>`).
  Category/collection pickers are searchable.

---

## #26 — Dynamic payment methods in admin

**What you asked to change:** admins should manage which payment methods customers see at
checkout (label/description/enabled), and see the live Medusa providers read-only.

**Smoke test:**
1. Admin → **Payments** (`/admin/payments`).
2. Add a method, rename one, toggle **enabled**, save. (Try disabling all → ❌ blocked:
   "enable at least one".) Live Medusa providers list shows read-only below.
3. Storefront → **Checkout** → payment step. → ✅ only the **enabled** methods appear,
   with the labels/descriptions you set. Placing an order validates the chosen method.

---

## #27 — Dynamic shipping methods/zones in admin

**What you asked to change:** manage shipping from admin — edit live Medusa option amounts,
see each option's zone, and add a CMS note / hide an option at checkout.

**Smoke test:**
1. Admin → **Shipping** (`/admin/shipping`).
2. Edit an option's amount (writes to Medusa), add a note to one, hide another, save.
3. Storefront → **Checkout** → shipping step.
   - → ✅ hidden options don't appear; notes show; the amount matches what you set.
   - (Sanity: BD standard ৳60 + COD still completes an order end-to-end.)

---

## #28 — Hero slide editor design/alignment fix

**What you asked to change:** the hero slide editor in admin had a design/alignment issue.

**Smoke test:** Admin → Pages → a hero section editor.
- → ✅ fields/controls are aligned and laid out cleanly (no overlap/misalignment).

---

## #29 — Product form: richer material & care (rich text)

**What you asked to change:** material & care on the product form should be rich text.

**Smoke test:** Admin → **Products** → new/edit a product → Material & Care.
- → ✅ it's a rich-text editor (formatting), not a plain textarea.
- Save, open the PDP → ✅ formatting renders in the product details.

---

## #30 — Move persona into checkout contact-info step

**What you asked to change:** the persona section should live inside the checkout
**contact-info** step (not a separate step).

**Smoke test:** Storefront → add to bag → **Checkout** → contact-info step.
- → ✅ the persona questions/section appear within that step; answering applies the
  stacked discount as before.

---

## #31 — PDP accordions: max-height + scroll

**What you asked to change:** product-page accordions should cap their height and scroll
instead of pushing the page.

**Smoke test:** open any PDP (`/products/{handle}`) → expand a long accordion
(e.g. details/materials).
- → ✅ it grows to a max height then **scrolls inside**; the page layout stays stable.

---

## #32 — Admin-editable Shipping & Returns content

**What you asked to change:** the Shipping & Returns content must be editable from admin.

**Smoke test:** Admin → Settings/Storefront → Shipping & Returns content → edit + save.
- → ✅ the change shows wherever Shipping & Returns is surfaced on the storefront.

---

## Quick pass/fail grid

| # | Area | Where | Pass when |
|---|------|-------|-----------|
| 18 | Auth + roles | `/admin/login`, `/admin/users` | per-user login; editor can't manage users; last admin protected |
| 19 | Curated landing | `/` | designed landing, not seeded page |
| 20 | Editable landing | `/admin/pages` → `/` | hero + collab slides editable & reflected |
| 21 | Section manager | `/admin/pages` | add/delete/reorder/edit persist |
| 22 | Division pages | nav → `/pages/{division}` | active underline; labels/badges editable |
| 23 | Mega-menu builder | `/admin/navigation` | columns/links render in nav popover |
| 24 | Listing config | `/admin/listings` | facet/order/tile-row honored on listing |
| 25 | Combobox migration | price-lists/campaigns/products/sections | dropdowns are searchable |
| 26 | Payments | `/admin/payments` → checkout | enabled methods show at checkout |
| 27 | Shipping | `/admin/shipping` → checkout | amounts/notes/hidden honored |
| 28 | Hero editor | `/admin/pages` hero | aligned layout |
| 29 | Material & care | product form → PDP | rich text in + out |
| 30 | Persona in checkout | checkout contact step | persona inline, discount stacks |
| 31 | PDP accordions | `/products/{handle}` | max-height + inner scroll |
| 32 | Shipping & Returns | admin settings → storefront | editable content reflected |

_If anything fails, note the task # and what you saw vs expected — that maps straight back
to the file in `IMPLEMENTATION_STATUS.md`._
