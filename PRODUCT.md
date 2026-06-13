# Product

## Register

brand

> Default register is **brand** — the customer-facing storefront, where design IS
> the product. Override to **product** per-task when working admin/CMS surfaces
> (`apps/web/app/admin/*`), where design SERVES the workflow (tables, forms, density).

## Users

**Shoppers (storefront — primary).** Fashion customers browsing on phone and
desktop, often arriving from a campaign or social. They want to discover, feel the
brand, and check out fast — including as guests, with no account required. Context
is leisure and impulse: the experience has to feel premium and load instantly, or
they leave.

**Admin / merchandiser (CMS control plane).** A small team composing the entire
storefront — hero, navigation, product rows, popups, campaigns — without touching
code, plus running commerce (products, pricing, inventory, orders, fulfillment,
parcel tracking) and reviewing captured guest leads. Context is focused work
sessions; they need clarity, density, and confidence over spectacle.

## Product Purpose

Maison is a headless fashion e-commerce platform with a custom CMS. Admins compose
a motion-rich, editorial storefront entirely from content blocks — launch a
campaign, swap the hero (video or carousel), reorder sections, fire a popup — with
zero code changes, backed by a dedicated commerce engine (Medusa) for products,
carts, guest + registered checkout, orders, and fulfillment. Success is a
storefront that feels like a premium fashion house yet is operated end-to-end by
non-engineers, stays fast (Core Web Vitals green) and SEO-strong, and converts
guests without friction.

## Brand Personality

**Editorial luxury, restrained.** Three words: *refined, confident, quiet.* The
voice is a fashion house, not a marketplace — magazine-grade typography, generous
space, claret and brass used sparingly as signature, motion as polish rather than
spectacle. It should evoke trust and desire through craft and restraint, never
urgency or noise. The admin inherits the same materials at higher density: calm,
legible, unmistakably the same brand behind the curtain.

## Anti-references

- **Generic SaaS dashboard.** No blue-gray cards, system fonts, or hero-metric
  templates. The admin must read as Maison, not a B2B tool.
- **Cheap / discount fast-fashion.** No cluttered grids, neon sale badges, loud
  red everywhere, or aggressive interruptive popups. (We borrow Fashion Nova's
  *structure* — dense, conversion-minded layouts — never its bargain-bin styling.)
- **Cold tech minimalism.** No stark black-and-white brutalism or sterile spacing.
  The warm bone/parchment canvas and claret keep it human, not clinical.
- **AI-slop template.** No cream-default-as-laziness, tracked-uppercase eyebrows on
  every section, identical icon-heading-text card grids, or gradient text. Our warm
  canvas is a committed, owner-approved choice — carry warmth in type, motion, and
  imagery, not in reflexive scaffolding.

## Design Principles

1. **Restraint is the luxury.** Premium reads through space, typographic
   hierarchy, and one well-placed accent — not through more. When in doubt, remove.
2. **Motion as material, not decoration.** Every reveal and transition fits what it
   reveals (ease-out, no bounce), enhances an already-visible default, and always
   has a reduced-motion alternative. Stillness is a valid choice.
3. **One brand, two registers.** Storefront and admin share tokens, type, and
   tone; the admin simply trades spectacle for density. Nothing in the control
   plane should feel like a different product.
4. **The merchant is the author.** Storefront craft must survive arbitrary,
   CMS-driven content — any section order, any hero mode, missing or overflowing
   copy. Design for the empty, loading, and error state of every composed block.
5. **Fast and findable is part of beautiful.** SEO-strong, instant paint, and green
   Core Web Vitals are design requirements, not afterthoughts — a slow luxury page
   is a contradiction.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Full keyboard operability and screen-reader-friendly
semantics across storefront and admin. Body text ≥4.5:1 contrast (watch the muted
ink-soft tones on the bone canvas), large text ≥3:1. `prefers-reduced-motion` is
honored on every animation — already enforced globally, must stay that way for each
new motion. Visible focus states; never gate meaning on color or motion alone.
