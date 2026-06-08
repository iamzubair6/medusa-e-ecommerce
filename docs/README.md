# 📖 Docs — START HERE (index & maintenance rules)

This is the entry point: it points to which doc covers which subject. The folder has
many docs written at different times — each now has **one job**. **`IMPLEMENTATION_STATUS.md` is the single source of truth for
status** (what's done / in progress / on hold / deployed). Everything else is
reference. Keep docs updated **in the same change** as the code (see CLAUDE.md
"Keep docs in sync").

## What each doc is for

| Doc | Purpose | Update when… |
|---|---|---|
| **IMPLEMENTATION_STATUS.md** | ⭐ Canonical status: done / in-progress / on-hold / deployed (with commit hashes) | **every feature change** |
| PRODUCTION_DECISIONS.md | Deferred prod choices (upload storage, SMS gateway, hosting) — built mocked for now | a mock is added or a real provider is wired |
| ROADMAP.md | Original platform phases 0–5 (historical) | rarely — points to IMPLEMENTATION_STATUS for current work |
| PLAN.md | Product vision / scope (historical baseline) | vision/scope changes |
| ARCHITECTURE.md | System structure, data flow, modules, routes | structure/routes/modules change |
| DEVELOPER_GUIDE.md | How to run/build/work on the project | dev workflow/commands change |
| LOCAL_DEV.md | Run + verify **locally** before deploy (fast path = live data at :3200) | local-run steps change |
| DATABASE.md | DB topology + **dev↔live migrations** (Medusa + Prisma), seeding, safety | schema/migration/seed flow changes |
| GO_LIVE_GUIDE.md | Beginner deploy walkthrough (Neon + Render + Vercel) | deploy/env/setup changes |
| DEPLOYMENT.md / DEPLOY_DOCKER.md | Alternative deploy recipes (managed / single-VPS Docker) | those recipes change |
| ADMIN_GUIDE.md | Running the store from `/admin` (non-technical) | admin features change |
| PRODUCT_GUIDE.md | Adding products (prices/colors/sizes/images/attrs) | product form changes |
| PAYMENTS.md | COD live; online payments planned | payment work |

## Rules
1. **Status → `IMPLEMENTATION_STATUS.md`** only. Don't scatter "done/todo" notes across other docs.
2. Reference, don't duplicate: link to another doc instead of copying its content.
3. Convert relative dates to absolute. Note commit hashes for shipped work.
4. If a doc becomes historical (e.g. ROADMAP phases 0–5), keep a one-line banner pointing to the current source.
