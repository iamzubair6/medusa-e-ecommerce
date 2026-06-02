# Project: E-Commerce + CMS

Scalable fashion e-commerce storefront with a custom CMS/admin. See `docs/PLAN.md`,
`docs/ARCHITECTURE.md`, `docs/ROADMAP.md` for the full plan and phasing.

## Stack (do not introduce alternatives without asking)
- **Monorepo**: **bun workspaces** = `apps/web` (Next.js) + `packages/*`
  (`ui` design system, `cms` Prisma+domain, `config`). `apps/medusa` (commerce) is
  NOT in the bun workspace — it uses **npm + Node 20** and is run separately.
- **Storefront + Admin**: Next.js App Router, TypeScript (strict), Tailwind CSS,
  Framer Motion for animation, shadcn-style primitives in `packages/ui`.
- **Commerce**: Medusa.js (Node 20 LTS) on PostgreSQL + Redis.
- **CMS content**: Prisma → Postgres `cms` schema (separate from Medusa's tables).
- **Data fetching**: server components / route handlers on the server; TanStack
  Query on the client. Never `useEffect` + fetch.
- **Forms**: React Hook Form + Zod. Never raw `useState` for form state.

## Hard rules
- TypeScript: no `any`, no `@ts-ignore`, no unsafe `as`. Derive types from Zod.
- Every async UI handles loading + error + empty states.
- All list endpoints paginated and scoped to the current user/session.
- Respect `prefers-reduced-motion` in every animation.
- Validate all input (Zod on web, Medusa validators on commerce).
- Secrets via env only. Never commit `.env`, secrets, or debug logs.
- Conventional Commits. Never commit to `main`. No `console.log`/`print`/TODOs in commits.
- Do NOT mix UI libraries/icon sets/styling systems — use the design system in `packages/ui`.

## Node versions
- `apps/medusa` requires **Node 20 LTS** (Medusa support window). Repo `.nvmrc` pins 20.
- `apps/web` works on current Node; prefer 20 for consistency.

## Commands
- `bun run dev` — storefront + admin (script targets :3000; this machine: 3000 is
  taken by another app, so run `bunx next dev -p 3200` from `apps/web`).
- Medusa backend (Node 20, separate — npm, not bun):
  `export PATH="/opt/homebrew/opt/node@20/bin:$PATH" && cd apps/medusa/apps/backend && npm run dev` (:9000).
- `bun run typecheck` — all workspace packages; must be clean before "done".
- Medusa uses a dedicated `medusa` Postgres DB; CMS uses `ecom` db, `cms` schema.

## Before saying "done"
- `bun run typecheck` across workspace packages — zero errors. `bun run build` for web.
- No console logs, TODOs, or hardcoded secrets in committed code.
