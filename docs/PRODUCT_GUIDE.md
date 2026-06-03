# Product & Pricing Guide

How to add a product **with prices, colors, sizes, stock, images, and offers** —
step by step. This is the part most people find confusing, so read it slowly once.

---

## 1. The mental model (read this first)

A product is made of two layers:

1. **Variants** (in Medusa) = the real, buyable combinations.
   - You define **Options**: usually **Size** (S, M, L…) and **Color** (Black, Olive…).
   - Medusa creates a **Variant** for each combination (e.g. "M / Olive").
   - **Each variant has its own price and its own stock.** This is how Olive can be
     ৳160 while Black is ৳200, and how Olive can have an XL that Black doesn't.

2. **Metadata** (a small JSON box on the product) = the storefront "extras" that
   Medusa's core doesn't store: which **images** belong to which color, the color
   **swatch** dots, the **low-stock** numbers, the **sale** (struck-through) price,
   and the **BOGO/discount** badge.

> You set prices/stock as **variants**, and the pretty per-color presentation as
> **metadata**. Both are on the same product page in Medusa Admin.

Currency is **Bangladeshi Taka (৳)**. Prices are whole numbers — `200` means **৳200**.

---

## 2. Add a product in Medusa Admin — step by step

Open **`http://localhost:9000/app` → Products → Create**.

### Step 1 — General
- **Title**: e.g. `Ribbed Knit Tank`
- **Handle**: auto-fills (`ribbed-knit-tank`) — this becomes the URL `/products/ribbed-knit-tank`.
- **Description**: shown in the PDP "Product Details" accordion.
- **Status**: set to **Published** (Draft products don't show on the storefront).

### Step 2 — Organize
- **Sales channel**: tick **Default Sales Channel**. ⚠️ If you skip this, the product
  **won't appear** on the storefront.
- **Category** (optional): e.g. Tops.

### Step 3 — Options (Size & Color)
Add two options:
- Option `Size` with values `S, M, L, XL`
- Option `Color` with values `Black, Olive`

### Step 4 — Variants & **prices**
Medusa lists the combinations. For **each variant** you keep:
- **SKU** (e.g. `TANK-BLACK-S`),
- **Price** — click the price cell, **choose the BDT currency**, and type the amount:
  - Black variants → `200`
  - Olive variants → `160`
- **Inventory** quantity (Step 6).

To make **Black have only S/M/L** (no XL) while **Olive has S–XL**: simply **delete the
variants you don't sell** (e.g. delete "XL / Black"). The storefront only shows
sizes that exist for the selected color.

> Per-color price = just price that color's variants differently. There's nothing
> else to do — the storefront reads the variant price.

### Step 5 — Media (images)
Upload the product images (front/back/detail). These become the gallery. To group
images **by color**, use **metadata** (Step 7) — Medusa's core keeps images as one
flat list.

### Step 6 — Inventory (stock)
On each variant set the **stocked quantity** at your location. This is the real,
enforced stock for checkout.

### Step 7 — Metadata (colors, per-color images, low-stock, sale, offer)
Scroll to the product's **Metadata** section and add this JSON (Medusa admin has a
JSON/key-value editor):

```json
{
  "swatches":       { "Black": "#1b1b1b", "Olive": "#5b6b3a" },
  "colorImages":    { "Black": ["https://…/black-1.jpg", "https://…/black-2.jpg"],
                      "Olive": ["https://…/olive-1.jpg"] },
  "colorPrices":    { "Black": 200, "Olive": 160 },
  "colorOriginalPrices": { "Black": 250, "Olive": 200 },
  "sizeStock":      { "Black": { "S": 25, "M": 10, "L": 4 },
                      "Olive": { "S": 18, "M": 7, "L": 12, "XL": 2 } },
  "offer":          { "type": "discount", "label": "25% OFF", "percent": 25 }
}
```

**What each key does:**

| Key | Effect on the storefront |
|---|---|
| `swatches` | The round color dots on cards + PDP. **Names must match the Color option values exactly** (`Black`, `Olive`). Values are any CSS color/hex. |
| `colorImages` | Which images show when a color is selected (PDP gallery + card image swap). Use CORS-friendly hosts (e.g. Unsplash) so image search can index them. |
| `colorPrices` | The price **shown** per color (e.g. "৳160" for Olive). Keep it equal to that color's variant price. |
| `colorOriginalPrices` | The **struck-through** "was" price → shows a sale. Omit a color to show no strikethrough. |
| `sizeStock` | Drives the **⚡ low-stock** badge and "**Hurry — only N left**" message. A size with stock ≤ **5** is flagged low. Keep roughly in sync with real inventory. |
| `offer` | The badge + promo line. `type` is `"bogo"` or `"discount"` (add `"percent"`). `label` is the text shown (e.g. `BUY 1 GET 1 FREE`, `25% OFF`). |

Click **Save**.

### Step 8 — (If you used an `offer`) create the real discount
The `offer` metadata is **display only**. For the discount to actually apply at
checkout, also create it under **Medusa → Promotions** (e.g. a 25% code, or a
buy-X-get-Y BOGO rule). Customers enter the code in the cart.

### Step 9 — Reindex image search
Open **CMS Admin → Visual Search → Reindex** so the new product appears in "Shop
Similar" results.

---

## 3. Worked example (what the shopper sees)

Product **Ribbed Knit Tank** with the JSON above:
- Card shows the Black image, swatch dots (Black/Olive), **৳200** with **~~৳250~~**, and a **25% OFF** badge.
- Hovering the card reveals **quick-add** size chips; clicking **Olive** swaps the image and price to **৳160**.
- On the PDP, choosing **Olive** shows Olive's images and sizes **S–XL**; **XL** shows
  a **⚡** and "**Hurry — only 2 left in Olive / XL!**".
- "Add to Bag" adds the exact Black-or-Olive + size variant; the cart total is in ৳.

---

## 4. Faster: bulk add via the seed script (developers)

For many products, edit
`apps/medusa/apps/backend/src/scripts/seed-rich-catalog.ts` (it builds variants,
prices, inventory, and the metadata above from a compact `colors` object), then run:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd apps/medusa/apps/backend
npx medusa exec ./src/scripts/seed-rich-catalog.ts
```

It's idempotent (re-running replaces those demo products by handle).

---

## 5. Common mistakes (and fixes)

| Symptom | Cause / fix |
|---|---|
| Product not on storefront | Not **Published**, or **Sales channel** not set. |
| Price shows `—` | No **BDT** price on the variant. Add it. |
| Swatches/colors missing on PDP | `swatches`/`colorImages` color names don't **exactly** match the Color option values (case-sensitive). |
| "Add to Bag" says **Unavailable** | That color+size has no variant. Create it, or remove that size from `sizeStock`. |
| Low-stock badge never shows | `sizeStock` numbers all > 5, or `sizeStock` missing. |
| Sale price not struck through | Add the color to `colorOriginalPrices`. |
| Discount code doesn't reduce total | `offer` is display-only — also create it in **Medusa → Promotions**. |
| New product missing from "Shop Similar" | Run **CMS → Visual Search → Reindex**. |
| Wrong currency / decimals | Amounts are whole Taka (`200` = ৳200). Make sure the price is set in the **BDT** currency. |
```
