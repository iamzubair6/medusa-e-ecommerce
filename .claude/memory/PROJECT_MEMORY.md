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
**2026-07-27 — shipped through `8a276a8`.** All board work through #152 is
deployed (Vercel/Render auto-deploy on push). Pending, in order:
1. Owner smoke checks: rounds `126-128` → `129-137` → `138-143` → `144-147`.
2. Live one-offs: `NEXT_PUBLIC_SITE_URL` in Vercel; paste
   `docs/email-templates/maison-master.html` into live /admin/email-templates;
   set "Free over ৳X" on live shipping rates.
3. Next builds on owner "go": **POS phase 1** (POS_PLAN.md — also closes the
   gap that online orders don't decrement `sizeStock`), **dynamic email
   phases 1–3** (EMAIL_TEMPLATES_PLAN.md).

## Non-obvious facts a fresh session needs
- Stock lives in product `metadata.sizeStock` — Medusa inventory is UNMANAGED
  (`inventory_quantity` is always empty; never read it for stock features).
- Promo API quirks (Medusa 2.15): dates + usage budgets live on the CAMPAIGN,
  not the promotion; native `limit:1` = one-time coded promos; shipping promos
  can't target products (hence the storefront-managed `FREESHIP-ITEMS` sync).
- Machine-made promo codes: `PH-` (phone rewards), `AB-` (cart recovery),
  batch prefixes (SiteSetting `promoBatchPrefixes`), `FREESHIP-ITEMS` — all
  folded out of the admin table and never advertised.
- Email system: shared frame (SiteSetting `emailFrame`) wraps fragment bodies;
  full `<!DOCTYPE html>` bodies are sent AS-IS; placeholders `{x}` and `{{x}}`.
- Owner mandates: plain Conventional Commits (NO AI attribution), 2–3 files
  per commit, docs/memory updates unprompted, minimal replies.
