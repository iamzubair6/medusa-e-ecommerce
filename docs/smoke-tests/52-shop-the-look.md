# Test #52 — Shop the Look (tag pieces on a model photo)

**What was built:** Fashion-Nova-style outfit tagging. In admin you click points
on a product's model photo (top, bottom, shoes, earrings…) and link each dot to
a product. On that product's page shoppers see the photo with numbered pulsing
dots — clicking a dot opens that piece's page. No setup needed.

## Test checklist (admin)

- [ ] Open **/admin/shop-the-look**. Expect: a product search box, "No looks yet".
- [ ] Pick a product with a model photo (e.g. a dress). Expect: its photo appears
      with "Click the photo to drop a tag".
- [ ] Click on the model's shoes → a numbered dot appears; a "Tag 1" row appears
      on the right. Pick the linked product (e.g. Strappy Heeled Sandal) — the
      label auto-fills with its name.
- [ ] Add 2–3 more tags (top, accessory). Max is 8.
- [ ] Delete one tag with the trash icon → its dot disappears.
- [ ] **Save Shop the Look** → green toast.

## Test checklist (storefront)

- [ ] Open that product's page. Below the gallery/details, expect a
      **"Shop the Look"** section: the photo with numbered white dots (gently
      pulsing; no pulse if your OS has reduced-motion on).
- [ ] Hover a dot → the piece's name appears.
- [ ] Click a dot → you land on that piece's product page.
- [ ] A product with no look shows **no** Shop the Look section.
- [ ] In admin, remove the look and save → refresh the PDP: section gone.

## Notes
- One look per product; the same look photo is reused from the product's image.
- This complements (doesn't replace) the camera icon "Shop Similar" image search
  in the navbar — that one is task #55's upgrade path (CLIP embeddings).
