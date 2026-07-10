# Project: E-Commerce + CMS

Scalable fashion e-commerce storefront with a custom CMS/admin. See `docs/PLAN.md`,
`docs/ARCHITECTURE.md`, `docs/ROADMAP.md` for the full plan and phasing.

## Design Context (impeccable)
- **`PRODUCT.md`** (root) — strategic design brief: register, users, brand personality,
  anti-references, design principles. **`DESIGN.md`** (root) — visual system (palette,
  type, components, motion). Both are read by every `/impeccable` command.
- **Register: `brand`** is the default (the customer storefront, where design IS the
  product). Override to `product` per-task on admin/CMS surfaces (`apps/web/app/admin/*`).
- Brand is **editorial luxury, restrained** — bone/parchment canvas, warm near-black ink,
  claret accent, brass hairlines, Fraunces + Hanken Grotesk. Preserve this identity;
  it's owner-approved. Anti-refs: generic SaaS dashboard, cheap fast-fashion, cold tech
  minimalism, AI-slop templates.

## Auto-routing & the build pipeline (plain prompts — no manual skill calls)
The user gives plain-language prompts ("do a Fashion-Nova mega nav", "fix the cart
badge", "make the PDP gallery feel premium"). **Read the intent and route automatically
— the user should not have to name skills or commands.**

**Route by intent:**
- **UI build / polish / animation / responsive** → `frontend-ui` agent + skills
  `impeccable`, `ui-ux-pro-max`, `high-end-visual-design`, and (storefront/brand surfaces
  ONLY, never admin) `design-taste-frontend`; for upgrading existing pages,
  `redesign-existing-projects`. MCP `magic` (21st) to scaffold, `playwright` to
  screenshot-verify. Always render into `packages/ui` + Tailwind tokens.
- **Clone/match an external site** → `firecrawl-scrape` / `firecrawl-website-design-clone`
  to capture the reference, then build on-brand via `impeccable` (honor DESIGN.md anti-refs).
- **Commerce** (products, pricing, inventory, orders, regions, shipping) → `medusa-backend`.
- **CMS content / section types / hero / nav / popups / leads** → `cms-prisma` + `cms-section` skill.
- **Bug fix** → locate (Explore), then the owning agent.
- **Research / scrape / SEO / QA a live page** → the matching `firecrawl-*` skill.

**Pipeline (orchestrated by the main agent; user sends one prompt):**
`planner` (classify + plan, grounds from IMPLEMENTATION_STATUS.md) → build agent →
`code-reviewer` (hard-rules review) → in parallel: `test-writer` (typecheck/build/lint +
smoke-test checklist — no test runner installed yet) and `doc-writer` (IMPLEMENTATION_STATUS
+ guides). Run independent steps in parallel; chain dependent ones. Scale the pipeline to the
task — a tiny fix skips planner; a feature runs the whole chain.

**Register:** storefront = brand (motion-rich, editorial); admin (`apps/web/app/admin/*`)
= product (denser, no storefront-only skills). See PRODUCT.md / DESIGN.md.

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

## Commit rules (owner mandate — never break)
- **NO co-author / AI attribution lines in commits.** No `Co-Authored-By`, no
  "Generated with Claude" — plain Conventional Commit messages only.
- **Small commits: 2–3 files at a time**, each a coherent unit. Never one giant commit.
- Update `docs/IMPLEMENTATION_STATUS.md` **in the same change** as the work it records.

## Working discipline (owner mandate)
- **Session start:** read `docs/README.md` → `docs/IMPLEMENTATION_STATUS.md` (+ the
  docs relevant to the task) BEFORE any work, to recover current state and goals.
- **Never edit code blind.** First read the file(s), understand the structure and what
  they serve; only then change what's needed. No random/speculative edits.
- **Do proper R&D per task** — research the approach (web search / firecrawl skills /
  official docs) before building; don't guess APIs.
- **Confused → ask first** (short question, options). Confident → just start; don't
  re-ask what's already decided.
- **Run the full pipeline agents properly** on features: code-reviewer after building,
  test-writer (typecheck/build/tests) + doc-writer before "done". Don't skip them.
- **Never repeat a proven mistake.** `docs/LESSONS.md` is the do-not-repeat log —
  read it at session start, append to it whenever the owner corrects something.
- **Replies to the owner: minimal, simple words.** Lead with the result, few short
  bullets, no long essays.
- **Project memory lives in the repo docs** (IMPLEMENTATION_STATUS, LESSONS, guides) —
  never rely on assistant-side memory alone; assume chat memory can be wiped anytime.

## Senior-engineer mindset (owner mandate)
- **Act as a senior developer, not a compliant AI.** Own decisions, follow industry
  standard practice, and keep up to date with the stack's current best approaches.
- **Principles in all code:** DRY (no duplicated logic — extract reusable helpers),
  KISS (simplest design that works), YAGNI (don't build until required), SOLID where
  class/module design applies. Refactor = improve structure without changing behavior.
- **Push back when the owner's approach is suboptimal.** Don't silently comply:
  say "X would be better than Y because …" with a short reason and a recommendation
  (e.g. if asked for a lib/pattern that fits the use-case worse than an alternative).
  The owner explicitly wants honest suggestions before implementation.

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
