# Smoke Test — Fashion-Nova parity features

Run through each check on the **live site** (or local). ✅ = works, note anything odd.
Local: storefront `bunx next dev -p 3200` in `apps/web`; admin at `/admin`.

> After deploying, do this ONCE: **/admin → Visual search → Rebuild index** so image
> search has fingerprints for every current product.

---

## 1. Visual search (camera in the search bar)

| # | Step | Expect |
|---|------|--------|
| 1.1 | Click the **camera icon** in the search bar | "Search By Image" popover opens under the bar (fades in) |
| 1.2 | Click the **^ chevron** (top-right of popover) | Switches to the text-search dropdown (division tabs + hot searches) |
| 1.3 | Click camera again → **Upload photo**, choose a clothing photo | "Finding similar styles…" overlay, then the results page (same panel stays top-right) |
| 1.4 | On results: the photo shows **white dots** on each garment; the selected one is a clear box, rest of the photo dimmed | Dots = top/bottom/shoes/etc.; department auto-detected (chip e.g. "WOMEN") |
| 1.5 | Tap a **dot** (e.g. Bottom) | Grid re-scopes to that category (bottoms), "Showing: Bottom" label |
| 1.6 | Tap the **×** on the department chip | Filter removed, more results |
| 1.7 | Reopen camera → **paste an image link** (https://…) | Same flow works from a URL |
| 1.8 | Reopen camera → click a **sample style tile** | Runs a demo search |
| 1.9 | The search bar shows your **photo as a small chip with ×** while on results | × clears image search |

## 2. Shop Similar (product page)

| # | Step | Expect |
|---|------|--------|
| 2.1 | Open any product → find **"We see similar styles"** under the buy box | 3 thumbnails + a **Shop Similar** button |
| 2.2 | Click **Shop Similar** | A modal opens: product photo + dots + **Size** facets on the left, product grid + **Sort by** on the right |
| 2.3 | Tap a **dot** | Grid re-scopes to that garment's category |
| 2.4 | Click **Upload** (bottom-right of the photo), choose a new photo | Grid updates to matches for the uploaded photo |
| 2.5 | Toggle a **Size** facet | Grid filters to products with that size |
| 2.6 | Change **Sort by** to Price low→high | Grid re-orders |
| 2.7 | Press **Esc** | Modal closes |

## 3. Style it with (product page)

| # | Step | Expect |
|---|------|--------|
| 3.1 | On a product that has a look, find **"Style it with"** thumbnails | Small tagged-product thumbnails |
| 3.2 | Click one | Quick-shop modal: image, name, price, **Color: <name>**, size grid, See full details |
| 3.3 | Pick a **size** → **Add to bag** | Cart drawer opens with the item; modal closes |
| 3.4 | If multiple colors, the **swatches** switch the size options | Color name updates |

## 4. Shop the Look (product page + admin)

| # | Step | Expect |
|---|------|--------|
| 4.1 | On a product with a look → **"Shop the Look"** section | Outfit photo with numbered dots + a product strip with **Quick add** rows |
| 4.2 | Click a **dot** or a **Quick add** row | Quick-shop modal opens for that piece |
| 4.3 | Click **Add the whole look** | Each piece's first variant added; cart opens (if some are OOS: "Added N of M…") |
| 4.4 | Admin: **/admin/shop-the-look**, pick a product, upload an outfit photo, click **Auto-detect items** | Dots auto-placed + a product suggested per garment; a toast reports how many matched |
| 4.5 | Adjust/confirm tags → **Save** | Toast "Shop the Look saved" |

## 5. Size guides

| # | Step | Expect |
|---|------|--------|
| 5.1 | Product page → **View Size Guide** | FN modal: "How It Fits" bar, Measurements table, "How to Measure" |
| 5.2 | Toggle **in. / cm** | Numbers convert (e.g. 28–30 in → 71–76 cm) |
| 5.3 | A **bottoms** product shows the Bottoms guide; a **top** shows Tops | Matched by category |
| 5.4 | Admin: **/admin/size-guides** — edit a guide, add a row, Save | Toast; change shows on the PDP |
| 5.5 | Admin: a **product's edit page** → Size guide field | If set, that product shows its own text instead of the shared guide |
| 5.6 | Admin: **Brand & theme** page | No size-guide field anymore (moved to Size guides) |

## 6. Brand / theme — per department

| # | Step | Expect |
|---|------|--------|
| 6.1 | Visit **/** (women) then **/pages/men**, **/pages/kids** | Different wordmark, nav, and content per department (not the women homepage) |
| 6.2 | Admin: **/admin/site → Accent color per division**, set Men to a color, Save | Men's pages use that accent (buttons/highlights); empty = brand claret |
| 6.3 | Admin: **/admin/site → Landing blocks**, pick **Men**, change the hero headline, Save | With Men's Landing style = "Fashion-Nova", /pages/men shows the new hero; Home unchanged |
| 6.4 | The **"Shop by Department"** homepage section | (was "Shop by Brand") |

## 7. Admin toasts

| # | Step | Expect |
|---|------|--------|
| 7.1 | Save on any admin editor (site, popup, sections, size guides, visual search…) | A toast appears (no inline "Saved" text) |
| 7.2 | Trigger a save error (e.g. bad value) | An error toast |

## 8. Popup image

| # | Step | Expect |
|---|------|--------|
| 8.1 | Admin: **/admin/popups → a popup**, set an **Image** (upload or URL), Save | Toast |
| 8.2 | Storefront home, trigger the popup | Your image shows beside the popup text |
