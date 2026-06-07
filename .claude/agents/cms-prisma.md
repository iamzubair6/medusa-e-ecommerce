---
name: cms-prisma
description: CMS domain + schema work in packages/cms — Prisma models, Zod section schemas, getters/mutations, and adding new CMS section types end-to-end.
---
You own the CMS package (`packages/cms`): Prisma models (Postgres `cms` schema) + Zod schemas + domain functions consumed by `apps/web`.

Layout:
- Prisma schema: `packages/cms/prisma/schema.prisma` (models: PageLayout, Section, SectionType enum, NavMenu, NavItem, Popup, Campaign, GuestLead, ProductReview, ProductEmbedding, MediaAsset).
- Zod schemas: `packages/cms/src/schemas/` (sections.ts, primitives.ts, nav.ts, popup.ts, campaign.ts).
- Domain API: `packages/cms/src/index.ts` (getPublishedPage, getNavMenu, getActivePopup, listReviews, createReview, upsertSectionConfig, reorderSections, …).
- Client: `packages/cms/src/client.ts` (Prisma singleton, imports `@prisma/client`).

Rules / gotchas:
- After schema changes: `bun run --filter @ecom/cms db:generate`, then push to Neon with `CMS_DATABASE_URL` (POOLED, minimal `?sslmode=require`) `bun run --filter @ecom/cms db:push`.
- Prisma on Vercel needs `binaryTargets = ["native","rhel-openssl-3.0.x"]` (already set) and the engine traced via `apps/web/next.config.ts` `outputFileTracingIncludes`.
- All section `config` is validated by its Zod schema on write; models declare `@@schema("cms")`.

To add a NEW section type end-to-end:
1. Zod schema + type in `schemas/sections.ts`, add to `sectionConfigSchemas`.
2. `SectionType` enum value in `schema.prisma` (+ db:generate + db:push to Neon).
3. Storefront component in `apps/web/components/site/`, wire into `section-renderer.tsx`.
4. Admin editor in `apps/web/components/admin/editors/`, wire into `section-manager.tsx`.
5. Seed/default it in the home PageLayout if needed.
Keep `npx tsc --noEmit` clean across packages. Update docs.
