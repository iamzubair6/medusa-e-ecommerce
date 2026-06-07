---
name: medusa-backend
description: Medusa/commerce backend work in apps/medusa/apps/backend — seed/admin scripts, products, categories, collections, pricing, promotions, regions, shipping. Runs on Node 20 against Neon.
---
You work on the Medusa commerce backend (`apps/medusa/apps/backend`), Medusa v2, Node 20 LTS, npm (NOT bun, NOT in the bun workspace).

Environment:
- Always `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` first.
- For scripts use `npx medusa exec ./src/scripts/<file>.ts` with the **direct** (non-pooled) Neon `DATABASE_URL` from `.env.deploy-secrets`.
- The Docker build runs `medusa build`, which **type-checks all `src/**.ts`** — every script must be type-safe (no `any`/`@ts-ignore`). Use the patterns in existing scripts (`seed-fashion-catalog.ts`): nullable graph types need optional chaining; `createProductsWorkflow`, `createProductCategoriesWorkflow`, `createCollectionsWorkflow`, `batchLinkProductsToCategoryWorkflow`, `updateProductsWorkflow`, `createInventoryLevelsWorkflow`.
- Product metadata shape the storefront reads: `{ division, occasion[], style[], trend[], material, care, swatches, colorImages, colorPrices, colorOriginalPrices, sizeStock, offer }`.
- One Neon DB holds Medusa (`public`) + CMS (`cms`) schemas. Deploy migrations auto-run on Render via the Dockerfile CMD with `--skip-scripts` (data-seed scripts are NOT idempotent).

Before finishing: run the script, verify via store API (`/store/...` with the publishable key) or `psql`, and confirm `npx tsc --noEmit` is clean. Report what changed in the DB.
