# Test #53 — Per-division landing pages (CMS sections)

**What was built:** each division now has its own admin-editable CMS landing
layout (previously they shared a generic one): Women, Men, Plus/Curve, Sport,
Kids, Beauty — each with a distinct hero, rails, promos and copy. Seeded locally;
live seeding happens with the next live-seed run.

## Test checklist (storefront — local first)

- [ ] `/pages/women` — hero + trend rail + New-in product row + promo split +
      countdown + banner (editorial, femme copy).
- [ ] `/pages/men` — marquee + hero + category grid + Trending row + promo + banner.
- [ ] `/pages/curve` (and `/pages/plus` — same page) — "Every Curve, Celebrated"
      hero + inclusive-sizing value props + rail + row + promo + banner.
- [ ] `/pages/sport` — marquee + hero + Trending row + promo + countdown + banner.
- [ ] `/pages/kids` — softer light hero, category grid, Newest row, value props,
      banner — **no** countdown/urgency.
- [ ] `/pages/beauty` — hero + value props (clean formulas) + Bestsellers row +
      promo + editorial + banner.
- [ ] Product rows show real products; every tile/banner link goes to a real
      category or collection page (no 404s).

## Test checklist (admin)

- [ ] **/admin/pages** lists the 6 division layouts (slugs: women, men, plus,
      sport, kids, beauty) as PUBLISHED, plus the existing `home`.
- [ ] Open one, edit a heading, save, refresh the storefront page → change shows.
- [ ] **/admin/landing-style** can still switch any division back to the curated
      Fashion-Nova landing (toggle per page) — switching works both ways.

## Re-seed commands
- Local: `bun run --filter @ecom/cms db:seed-divisions` (idempotent — rebuilds
  only these 6 layouts; home/nav/popups untouched).
- Live: part of the next live seed (needs owner go-ahead, same as #37).
