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

## Keep docs in sync (IMPORTANT — the product changes daily)
**`docs/README.md` is the doc map** — read it; each doc has one job. The **canonical
status doc is `docs/IMPLEMENTATION_STATUS.md`** (done / in-progress / on-hold /
deployed, with commit hashes). When a change adds/removes/alters a feature, flow,
route, env var, or deploy step, **update docs in the same change**:
- **`docs/IMPLEMENTATION_STATUS.md`** — ALWAYS, for any feature change (status + commit).
- `docs/ARCHITECTURE.md` — structure, data flow, new modules/routes.
- `docs/GO_LIVE_GUIDE.md` / `docs/LOCAL_DEV.md` — deploy or local-run changes.
- `docs/PRODUCTION_DECISIONS.md` — deferred prod choices (upload storage, SMS, hosting).
- `docs/ADMIN_GUIDE.md` / `docs/PRODUCT_GUIDE.md` — admin or merchandising changes.
Don't scatter status across docs (ROADMAP/PLAN are historical baselines). Treat doc
updates as part of "done", not optional.

## Turning feedback into tracked tasks (ALWAYS)
Every time the user gives a **fix, update, or feedback**:
1. **Break it into numbered tasks/phases** (use the TaskCreate task list).
2. **Write them down** in `docs/IMPLEMENTATION_STATUS.md` → "Task board" — append the
   new numbered rows so it stays a durable, complete record (not just the ephemeral
   in-session list).
3. **Maintain status** as work progresses: update both the task list and the doc's
   board (⬜ planned → 🟡 in progress → ✅ done & deployed, with the commit hash).
This is mandatory, not optional — the user relies on the doc board being current.

**Ground yourself from the board:** at the start of work, and whenever the user
references prior work without specifics ("the last task", "what we did", "continue"),
**read `docs/IMPLEMENTATION_STATUS.md` first** to recover exact current standing
(what's done, what's next, counts) before responding — don't guess.

## Tooling, skills & MCP (use the right tool)
- **Frontend / modern UI**: prefer the `ui-ux-pro-max` and `frontend-design` skills for
  design intent, and the **shadcn/ui MCP** + **magic** MCP (`21st_magic_component_builder`,
  `logo_search`) for component scaffolding. Always render the result into our design
  system (`packages/ui` + Tailwind tokens) — never introduce a new UI lib/icon set.
- **Backend / commerce**: Medusa work runs on **Node 20** (`apps/medusa/apps/backend`);
  seed/admin scripts via `npx medusa exec`. CMS domain logic lives in `packages/cms`.
- **Deploy is push-based**: web → Vercel, Medusa → Render (both auto-deploy on push to
  master). Always `typecheck` + `bun run build` (clean `.next` + warm the backend) before pushing.
- **Specialized subagents** live in `.claude/agents/` (frontend-ui, medusa-backend,
  cms-prisma). **Slash commands** live in `.claude/commands/` (`/verify`, `/ship`,
  `/seed`, `/sync-docs`). Use them to keep work consistent.
- **Persistent decisions** that aren't in code go to the auto-memory; **deferred prod
  decisions** go to `docs/PRODUCTION_DECISIONS.md`.
