# POS (Point of Sale) — complete build plan

**Status: planned (owner-approved direction, 2026-07-27). Nothing built yet.**
Owner's ask: staff sell products in person, stock stays in sync with the online
store (sales AND restocks), and in production the POS opens on its own URL.

Verdict: **fully feasible with the current stack** — same Next.js app, same
Medusa backend, same stock source. No new infrastructure.

---

## 0. The one architectural fact that shapes everything

Stock lives in **product `metadata.sizeStock`** (`{color: {size: qty}}`).
Medusa's managed inventory is OFF (`manage_inventory: false`). The storefront
reads sizeStock for size availability; the admin product editor writes it.

**Today, ONLINE orders do not decrement sizeStock either** — stock is purely
manual. So "sync POS with stock" really means: build ONE shared decrement path
and use it from BOTH channels. That closes the existing online gap for free.

```
                      ┌────────────────────────────┐
   online checkout ──▶│  decrementSizeStock(items)  │──▶ product.metadata.sizeStock
   POS sale        ──▶│  (server lib, read-modify-  │        │
                      │   write per product)        │        ▼
   admin restock  ──────────── product editor ──────▶  storefront availability,
                                                        Stock alerts, Restock centre
```

## 1. Where the POS lives + the production URL

- Route group **`apps/web/app/pos/`** with its own layout (no storefront navbar,
  no admin sidebar — a fullscreen counter UI). Register: `product` (dense,
  functional; big touch targets).
- **Production URL `pos.<domain>`**: add the subdomain in Vercel → the existing
  `middleware.ts` rewrites `host === pos.<domain>` → `/pos/*`. Locally it's just
  `http://localhost:3200/pos`. One deployment, zero extra hosting.
- `/pos` is also directly reachable on the main domain but auth-gated, so the
  subdomain is a convenience, not a security boundary.

## 2. Auth & roles

- Extend the existing CMS `AdminUser` with a `STAFF` role (Prisma enum add →
  `db push` local + live).
- `/pos/login` reuses the admin session mechanics (separate cookie name so a
  cashier session can't open `/admin`).
- Permissions: `STAFF` = sell, look up stock, print receipts. `ADMIN` = also
  manual discounts, returns/refunds, day reports.
- Middleware: `/pos/*` and `/api/pos/*` require the POS session.

## 3. Selling flow (v1)

1. **Find the product** — search by title/SKU (catalog fetch exists; SKUs are
   already generated per variant: `HANDLE-COLOR-SIZE`). Big grid + search box;
   optional barcode scanner later (a scanner is just a keyboard — the SKU input
   already works with one).
2. **Pick color/size** — from sizeStock, showing live quantity; sold-out sizes
   disabled.
3. **Cart** — local state; quantity steppers; line remove.
4. **Charge** — v1 payment methods: **Cash** and **bKash/Nagad (manual TXN id
   field)**. No card integration needed in-store.
5. **Create the order in Medusa** — draft-order → complete (manual payment),
   tagged `metadata.channel = "pos"` + cashier email. Order number shares the
   MSN- sequence so accounting is unified.
6. **Decrement stock** — the shared `decrementSizeStock` helper (see §4).
7. **Receipt** — print view (80mm thermal CSS: logo text, items, totals, order
   id, "sold by") via `window.print()`; optional customer SMS via the existing
   `sendTransactionalSms`.

## 4. Stock sync (the core)

New server lib `apps/web/lib/stock.ts`:

- `decrementSizeStock(lines: {productId, color, size, qty}[])` — per product:
  read current metadata → subtract (floor at 0) → write back via the admin API →
  `revalidateCommerce()` so the storefront updates instantly.
- Called from:
  - **POS checkout** (`/api/pos/checkout`) — always.
  - **Online order completion** (COD complete + SSLCommerz callback) — closes
    today's gap. Line items carry variant SKU → parse color/size, or resolve
    variant → options.
- **Restock** stays where it is: the product editor / bulk import set new
  quantities; both channels see them immediately (Stock alerts + Restock centre
  already read the same field, and back-in-stock Notify emails the waitlist).
- **Races**: two simultaneous sales of the same product could lose one write
  (read-modify-write on a JSON blob). At one-store scale this is acceptable
  v1 risk; mitigations in order of effort: (a) serialize per product id in the
  API route (in-memory queue — fine on one Vercel region), (b) verify-after-
  write retry, (c) long-term: migrate to Medusa managed inventory (bigger
  project, revisit only if multi-terminal).
- **Oversell guard**: POS checkout re-reads stock before completing and warns
  ("only 1 left — proceed?") rather than blocking (staff are holding the item).

## 5. Discounts, returns, reports

- **Discounts v1**: promo-code entry (all existing codes work — support codes,
  card batches from `/admin/discounts` print runs) + ADMIN-only manual % line.
- **Returns/exchanges (phase 2)**: ADMIN unlocks; creates a Medusa refund/
  exchange on the order; `incrementSizeStock` (same lib, negative decrement).
- **Reports (phase 2)**: `/pos/day` — Z-report per day (orders, cash total,
  bKash total, by cashier) from orders where `metadata.channel = "pos"`; the
  admin dashboard splits Online vs POS revenue with the same filter.

## 6. Build phases & tasks (board rows when we start)

**Phase 1 — sell & sync (the MVP, ~1 session)**
1. `STAFF` role + `/pos/login` + middleware gating.
2. `/pos` shell: search grid, size/color picker with live stock, cart.
3. `/api/pos/checkout`: draft order → complete (cash/bKash manual), channel tag.
4. `lib/stock.ts` decrement + wire into POS checkout **and** online completion.
5. Receipt print view.

**Phase 2 — operate (~1 session)**
6. Promo-code entry + ADMIN manual discount; returns/exchange flow.
7. Z-report page + dashboard Online/POS split.
8. Customer attach (phone lookup → existing customer, feeds their order history).

**Phase 3 — polish (as needed)**
9. `pos.<domain>` subdomain mapping in Vercel + middleware host rewrite.
10. Barcode: print SKU barcodes (Code128 SVG, no external service) from the
    product editor; scanner input on the POS search box.
11. Optional PWA/offline queue (only if the shop's internet is unreliable).

## 7. Open decisions for the owner (answer when we start)

- Subdomain name (`pos.` suggested) and the production domain to attach it to.
- Payment methods at the counter: cash only, or cash + bKash/Nagad manual TXN?
- Receipt: thermal printer model (for width/CSS tuning) — or A4/e-receipt only?
- Should POS sales count toward the same revenue dashboard by default? (plan: yes, with a filter)

## 8. Risks

- JSON-blob stock races (mitigations in §4) — acceptable single-store, revisit at multi-terminal.
- Vercel cold starts could slow the first counter sale of the day — the existing keep-warm pings cover it.
- Staff device discipline: POS session cookie is separate from admin; log out button prominent.
