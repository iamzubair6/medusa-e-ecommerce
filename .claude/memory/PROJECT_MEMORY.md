# Project memory (versioned — travels with the repo)

> Durable, machine-independent memory for any Claude session on this project.
> Maintained UNPROMPTED after every work block (see CLAUDE.md "Docs & memory
> are UNPROMPTED"). This file is a compact pointer + standing snapshot — the
> detailed record stays in `docs/` (never duplicate the board here).

## Where the truth lives
- **State & pending**: `docs/IMPLEMENTATION_STATUS.md` → "Current standing"
  (top) + the full task board (#1–#152+, with commit hashes).
- **Owner test checklists**: `docs/smoke-tests/README.md` (one file per round).
- **Approved future builds**: `docs/POS_PLAN.md`, `docs/EMAIL_TEMPLATES_PLAN.md`.
- **Do-not-repeat log**: `docs/LESSONS.md`. Doc map: `docs/README.md`.

## Standing snapshot (update on every state-changing session)
**2026-08-02 — POS (#153–#161) AND dynamic email (#162–#164) built, code-
reviewed (P0/P1 findings fixed), typecheck + build green, pushed.** Pending:
1. **Live one-offs at deploy**: cms `db push` on live (adds `STAFF` to
   `AdminRole`) BEFORE creating a staff user in /admin/users; older items:
   `NEXT_PUBLIC_SITE_URL` in Vercel, "Free over ৳X" live shipping rates.
2. Owner smoke checks: NEW `153-161-pos.md` + `162-164-dynamic-email.md`,
   then the backlog `126-128` → `129-137` → `138-143` → `144-147`.
3. POS phase 3 later (subdomain rewrite, barcode printing, PWA) — POS_PLAN §7
   decisions (receipt printer model, subdomain) still open with the owner.

## Non-obvious facts a fresh session needs
- Stock lives in product `metadata.sizeStock` — Medusa inventory is UNMANAGED
  (`inventory_quantity` is always empty; never read it for stock features).
- Promo API quirks (Medusa 2.15): dates + usage budgets live on the CAMPAIGN,
  not the promotion; native `limit:1` = one-time coded promos; shipping promos
  can't target products (hence the storefront-managed `FREESHIP-ITEMS` sync).
- Machine-made promo codes: `PH-` (phone rewards), `AB-` (cart recovery),
  batch prefixes (SiteSetting `promoBatchPrefixes`), `FREESHIP-ITEMS` — all
  folded out of the admin table and never advertised.
- Email system (rebuilt 2026-08-02): THREE SiteSettings — `emailFrames`
  (library + default), `emailBodyTemplates` (`{content}` skeletons; "plain" +
  "maison-master" seeded), `emailPurposes` (per-event frame/body/subject/
  heading/content). Legacy `emailFrame`/`emailTemplates`/`customEmailTemplates`
  are MIGRATION SOURCES read at parse time — never rewritten. ONE renderer
  (`lib/email-render.ts`) serves sends + tests + bulk + client preview. Full
  `<!DOCTYPE html>` results ship unframed; placeholders `{x}`/`{{x}}` escaped.
- POS (built 2026-08-02): `/pos` fullscreen counter, SEPARATE `pos_session`
  cookie (same HMAC secret); STAFF role is counter-only (middleware blocks it
  from /admin). Sales = admin draft order → convert-to-order, tagged
  `metadata.channel="pos"` + `pos_*` keys; refunds live in order metadata
  `pos_refunds` (JSON log; amount recomputed server-side) + restock.
- Stock: `apps/web/lib/stock.ts` is the ONE sizeStock adjust path (POS sales,
  BOTH online completions, returns). Untracked color/size keys are skipped on
  purpose; writes floor at 0 and end with `revalidateCommerce()`.
- Synthetic customer emails: anything `*.maison.local` (phone signups +
  `walkin@pos.maison.local`) — filtered from admin lists and campaigns.
- Owner mandates: plain Conventional Commits (NO AI attribution), 2–3 files
  per commit, docs/memory updates unprompted, minimal replies.
