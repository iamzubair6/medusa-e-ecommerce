# Admin Guide

A practical guide for running the store day-to-day. **No coding required.**

---

## 1. The two control panels

Your store is managed from **two** places. This split is intentional:

| Panel | URL | Login | Use it for |
|---|---|---|---|
| **Medusa Admin** (commerce) | `http://localhost:9000/app` | email + password | Products, prices, inventory, **orders**, fulfilment & tracking, discounts, regions/shipping |
| **CMS Admin** (content) | `http://localhost:3000/admin` | email + password (per-user, roles) | The **look** of the storefront: landing page, hero, navigation, popups, campaigns, guest leads, image-search index |

Rule of thumb:
- **Selling something / an order came in?** → Medusa Admin.
- **Changing how the site looks or a marketing promo?** → CMS Admin.

---

## 2. Logging in & adding admin users

### Medusa Admin (commerce)
- Go to `http://localhost:9000/app` and sign in.
- **Add another admin user** (a developer runs this once):
  ```bash
  cd apps/medusa/apps/backend
  npx medusa user -e newadmin@yourbrand.com -p "a-strong-password"
  ```
  Then that person can log in at `/app`.

### CMS Admin (content) — now multi-user with roles
- Go to `http://localhost:3000/admin` → sign in with **email + password** (your own account).
- **First-time setup (recommended) — create an admin from the CLI** (like Django's
  `createsuperuser`), which writes straight to the database:
  ```bash
  bun run admin:create                       # interactive: prompts for email, name, role, password
  bun run admin:create -- --list             # list existing admins
  bun run --filter @ecom/cms admin:create -- --email you@x.com --name "Owner" --role ADMIN
  ```
  It needs no special env vars (reads `CMS_DATABASE_URL` from `apps/web/.env`) and works
  any time, not just on an empty database.
- **First-time setup (alternative) — env bootstrap:** before any account exists, you can
  instead sign in with `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_PASSWORD` from `apps/web/.env`.
  That creates the first **Admin** account; afterwards login is per-person and the bootstrap
  values stop working. (If both are unset and no admin exists, login returns *“Invalid email
  or password.”* — use the CLI above.)
- **Add / manage people:** sidebar → **Team & Roles** (`/admin/users`). Two roles:
  - **Admin** — full access, *including* adding/removing users and changing roles.
  - **Editor** — content, catalog and orders, but **cannot** manage users.
- You can reset a member's password, deactivate/reactivate, or remove them. The **last
  active Admin can't be demoted, deactivated or removed**, so you can never lock yourself out.

> Keep credentials private. Passwords are stored hashed (never plaintext); the session
> cookie is signed with `ADMIN_SESSION_SECRET`. Change the defaults before going live.

---

## 3. Medusa Admin — commerce essentials

- **Products** → create/edit products, colors & sizes (variants), prices, images,
  inventory. (Full step-by-step in **PRODUCT_GUIDE.md** — start there, it's the
  most detailed part.)
- **Orders** → view every order, customer details, and **mark as fulfilled / add a
  tracking number**. What you set here is exactly what customers see on the public
  **Track Order** page (`/track`).
- **Promotions** → create discount codes (e.g. `WELCOME10`). Customers enter codes
  in the cart/checkout. A sample BOGO/percentage promo is already seeded.
- **Inventory** → stock counts per size. (Note: the "low stock ⚡" badge and "Hurry,
  only N left" message on the storefront come from product **metadata**, see the
  Product Guide — keep them roughly in sync with real inventory.)

---

## 4. CMS Admin — managing the storefront

Open `http://localhost:3000/admin`. Left sidebar:

### Dashboard
Quick counts (pages, campaigns, popups, guest leads).

### Pages
The landing page is built from **blocks** you can reorder and edit:
- **Reorder** a block with the ▲▼ arrows (saves instantly, updates the live store).
- Click **Edit** on a block to change it. Block types:
  - **Hero** — the big banner. Switch between **Carousel** (image slides) or **Video**,
    set the headline, eyebrow, buttons, theme, and **text alignment** (left/center/right).
  - **Product Row** — a row of products. Choose the **source** (Newest, Best Sellers,
    a Collection, or specific product IDs), heading, layout (carousel/grid).
  - **Category Grid**, **Editorial**, **Banner**, **Marquee** — promo tiles, image+text
    blocks, full-width banners, and the scrolling announcement strip.
- Every save is validated, so you can't break the page with bad data.

### Navigation
Build each division's menu (Fashion-Nova style): collection bar items, each with
an optional **mega-menu** — up to 6 columns of links plus a promo image tile.
Links can carry a **color swatch** (Shop By Color) or be marked **Red** (Sale).
A column with an empty heading renders FN's "featured" style: links only.

**Generate from catalog** builds the whole thing in one click from live products
(New In / Clothing / one item per category with Style · Occasion · Trend · Color
columns / Sale). Every generated link is backed by at least one real product.
It replaces the collections of every division that has products (labels and
badges are kept) and saves immediately — then edit anything by hand and Save.
The same menu drives desktop hover panels **and** the mobile drawer.

### Content Pages
Every static page linked from the footer — Help Center, Size Guide, Shipping,
Returns, About, Careers, Contact, Sustainability, Gift Cards, Privacy Policy,
Terms. Edit the title/content (rich text), hide a page, or **Add page** to create
a brand-new URL (e.g. `help/faq` → `/help/faq`) — no deploy needed. "View page"
opens the live page.

### Shop the Look
Tag the pieces in a product's model photo (top, bottom, shoes, accessories):
pick the product, click the photo to drop numbered dots, link each dot to a
product. Shoppers see the dots on that product's page and click through to
each piece. One look per product, up to 8 tags.

### SMS Templates
The text of every SMS the store sends — the OTP code message and the order
confirmation. Edit the **Company name** once (mobile operators require your
brand inside every SMS — saving without it is blocked) and the message copy,
with a live preview and a per-SMS segment (cost) counter. Defaults already
follow MiMSMS's approved OTP format.

### Popups
The promotional popup: heading, body, **email capture**, **preference chips**
(Women/Men/Curve/Kids/Beauty), **trigger** (after delay / on scroll / exit-intent /
immediately), schedule, and how often it re-shows. Toggle **Active** to turn it on/off.

### Campaigns
Schedule promotional "runs" — a name, status (Scheduled/Active/Paused/Ended),
start/end dates, an optional promo code and banner note. Useful for planning sales.

### Visual Search
Powers the **"Shop Similar"** image search. Click **Reindex visual search** after you
add or change products — it builds the image fingerprints used to find lookalikes.
(It loads each product image in your browser; images on hosts without CORS are skipped.)

### Guest Leads
Everyone who entered an email in the popup **or** started checkout but didn't finish.
Use this list for remarketing. Paginated, newest first.

### Orders
Open an order to see the **status stepper** — Ordered → Processing → Shipped →
Delivered — with one button for the next step: **Start processing** (fulfils the
items), then **Mark shipped** (enter the courier tracking number), then **Mark
delivered** (for COD this confirms the cash was collected). **Cancel order** is
available until the order ships. Everything updates the live Medusa order, so the
customer's `/track` page always matches.

### Shipping
The **Delivery partner** card (top) decides how the Ship step works on every
order: **Manual / any courier** (type a tracking number) or **Steadfast
(one-click)** handover. With Steadfast selected, the **Test mode** checkbox
keeps consignments simulated — no real pickups, status auto-progresses to
Delivered in ~5 minutes — until you untick it on launch day.

Below it, manage delivery **zones and options** without leaving the admin:
- **Add zone** — name it and list the countries it covers (2-letter codes, e.g.
  `BD, IN`). Edit a zone's name/countries with the pencil; delete a zone once it
  has no options.
- **Add shipping option** inside a zone — a name and a flat ৳ rate; it appears at
  checkout immediately. Edit an option's amount inline, or delete it (trash icon).
- Per-option **checkout note** and **"Show at checkout"** are display-only
  overrides (they don't change Medusa) — use the checkbox to hide an option
  without deleting it.

---

## 5. How it all fits together (plain English)

- A customer browses the **storefront**. The **layout/marketing** they see (hero,
  menu, promos) is what you set in the **CMS Admin**. The **products and prices**
  are what you set in **Medusa Admin**.
- When they buy, the order lands in **Medusa Admin → Orders**. You fulfil it and add
  a tracking number; they track it at `/track`.
- If they abandon, their info appears in **CMS Admin → Guest Leads**.

---

## 6. Daily checklist

- [ ] **Orders** (Medusa) — fulfil new orders, add tracking numbers.
- [ ] **Inventory** (Medusa) — restock; update product `sizeStock` metadata if you
      want the "low stock" badges accurate.
- [ ] **Guest Leads** (CMS) — export/follow up with abandoned carts.
- [ ] After adding products: **CMS → Visual Search → Reindex**.
- [ ] Seasonal promo? Set up a **Campaign** + a Medusa **discount code**, and update
      the **Hero**/**Banner**/**Popup**.

Next: **PRODUCT_GUIDE.md** — exactly how to add a product with prices, colors, sizes,
stock, images, and offers (this is the part people find confusing — it's spelled out).
