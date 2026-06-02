# Architecture

## System overview

```
                         ┌─────────────────────────────────────┐
                         │            Browser (customer)        │
                         └───────────────┬─────────────────────┘
                                         │ HTTPS
                         ┌───────────────▼─────────────────────┐
                         │        Next.js  (apps/web)           │
                         │  • Storefront (App Router, SSR/ISR)  │
                         │  • Custom Admin (/admin)             │
                         │  • CMS API route handlers (Prisma)   │
                         │  • Image-search proxy                │
                         └───────┬───────────────────┬─────────┘
                                 │ Store/Admin API    │ Prisma Client
                                 ▼                    ▼
                 ┌───────────────────────┐   ┌────────────────────────┐
                 │   Medusa (apps/medusa) │   │   PostgreSQL (single)   │
                 │   Node commerce engine │   │  • medusa schema (Mikro)│
                 │   • products/variants  │   │  • cms schema (Prisma)  │
                 │   • cart/checkout      │   │  • pgvector (img search)│
                 │   • orders/fulfillment │   └────────────────────────┘
                 │   • customers/payments │
                 └───────────┬────────────┘
                             │ events/cache
                             ▼
                         ┌────────┐
                         │ Redis  │   (Medusa cache, event bus, workflows)
                         └────────┘
```

## Monorepo layout

```
e-com/
├── apps/
│   ├── web/              # Next.js storefront + custom admin + CMS API
│   └── medusa/           # Medusa commerce backend
├── packages/
│   ├── ui/               # shared design system (React components, tokens)
│   ├── config/           # shared tsconfig, eslint, tailwind preset
│   └── cms/              # Prisma schema + client + CMS domain services
├── docs/                 # PLAN.md, ARCHITECTURE.md, ROADMAP.md
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md
```

## Data flow patterns

### Landing page render (SSR/ISR)
1. Server component requests **page layout** from CMS (`packages/cms` via Prisma):
   ordered list of section blocks (hero, product-row, banner, editorial…).
2. For each product-bearing section, fetch products from **Medusa Store API**
   (by collection/handle/ids).
3. Render with the shared **design system**; hydrate interactive bits (carousel,
   add-to-cart, popup) on the client.
4. Revalidate on a tag (`revalidateTag('cms:home')`) when admin saves content.

### Hero (video | carousel)
- CMS hero config: `{ mode: 'video' | 'carousel', video?, slides[], cta, theme }`.
- Server picks the component by `mode`; client adds motion (Framer Motion).
- `prefers-reduced-motion` respected; video lazy + poster fallback.

### Cart & checkout (guest + registered)
- Medusa cart created on first add; cart id stored in cookie.
- Guest checkout: collect email/address on Medusa cart, complete order.
- **Guest lead capture**: when a guest fills contact/address but abandons,
  a CMS `GuestLead` row is upserted (email, cart id, captured fields, source)
  for admin remarketing. Triggered by step completion / debounced field blur.

### Parcel tracking
- Order fulfillment status + tracking numbers from Medusa fulfillment module.
- Public tracker page: lookup by order number + email (rate-limited), returns
  status timeline. Admin can update fulfillment/tracking in Medusa admin or
  custom admin.

### Image search (later phase)
- Upload → embed query image (CLIP) → vector similarity over product image
  embeddings stored in `pgvector` → return ranked Medusa product ids → fetch.

## CMS content model (Prisma `cms` schema — initial)
- `PageLayout` (slug, published, sections[])
- `Section` (type enum, position, config Json, pageLayoutId)
- `HeroConfig` (mode, videoUrl, poster, slides Json, cta Json, theme)
- `NavMenu` / `NavItem` (label, href, children, megaMenu Json)
- `Popup` (trigger, schedule, content Json, targeting, active)
- `Campaign` ("run": name, startsAt, endsAt, payload Json, status)
- `GuestLead` (email, phone, capturedFields Json, cartId, source, createdAt)
- `MediaAsset` (url, type, alt, width, height, focalPoint)

All `config`/`Json` fields are validated with **Zod schemas** in `packages/cms`
before write, so the admin can't persist malformed content.

## Rendering & caching strategy
- Home/collections: **ISR** + tag-based revalidation on CMS publish.
- PDP: ISR per product; revalidate on Medusa product update webhook.
- Cart/account/checkout: dynamic (no cache), per-request.
- Admin: dynamic, auth-gated.

## Security
- Admin routes gated by session + RBAC roles (`admin`, `editor`, `viewer`).
- CMS write endpoints: server-side auth check + Zod validation + audit log.
- Public endpoints (tracker, lead capture, image search): rate-limited, captcha
  on abuse. Secrets only via env (`.env`, never committed).

## Environments
- Local: Postgres (Homebrew) + Redis (docker/brew) + Medusa + Next dev servers.
- **Node**: use **Node 20 LTS for `apps/medusa`** (Medusa support window). `apps/web`
  runs on current Node. `.nvmrc` pins 20 for the repo to keep Medusa safe.
