---
name: cms-section
description: Add or edit an admin-editable CMS section type end-to-end (Zod schema + Prisma SectionType enum + storefront renderer + admin editor + seed). Use when a homepage/landing/marketing block needs to be manageable from /admin.
---

# Add a CMS section type (end-to-end, admin-editable)

Use this when a storefront block must be editable in `/admin → Pages` (i.e. driven by
a `Section` row's `config` JSON rather than hardcoded).

## Steps (do them in this order, keep typecheck clean throughout)

1. **Zod schema** — in `packages/cms/src/schemas/sections.ts`:
   - `export const xxxConfigSchema = z.object({ ... })` + `export type XxxConfig = z.infer<...>`.
   - Reuse primitives from `primitives.ts` (`mediaRefSchema`, `ctaSchema`, `productSourceSchema`).
   - Register it in the `sectionConfigSchemas` map (key = the SectionType enum value).

2. **Prisma enum** — add the value to `enum SectionType` in
   `packages/cms/prisma/schema.prisma`. Then:
   - `bun run --filter @ecom/cms db:generate`
   - `CMS_DATABASE_URL="<pooled neon ?sslmode=require>" bun run --filter @ecom/cms db:push`

3. **Storefront component** — `apps/web/components/site/<name>.tsx`, props typed from the
   Zod config. Handle empty/missing fields gracefully. Full-bleed vs `<Container>` as needed.
   Wire it into `apps/web/components/site/section-renderer.tsx` (validate config, render).

4. **Admin editor** — `apps/web/components/admin/editors/<name>-editor.tsx` using RHF+Zod
   and the shared field components (`components/admin/fields.tsx`, `rich-text-field.tsx`,
   plus the shadcn combobox/calendar in `packages/ui`). Wire into
   `components/admin/section-manager.tsx` (Editor switch + "add section" picker).

5. **Image/media fields**: use the upload widget (device upload) — never a bare URL input
   only. See the upload component + `/api/admin/uploads`.

6. **Seed/default**: if the home layout should include it by default, add it where the
   home `PageLayout` sections are seeded so the page looks right out of the box.

## Finish
- `cd apps/web && npx tsc --noEmit` clean; `bun run build` passes.
- Update `docs/ADMIN_GUIDE.md` (new editable section) per CLAUDE.md "Keep docs in sync".
- Reference: the `cms-prisma` and `frontend-ui` agents in `.claude/agents/`.
