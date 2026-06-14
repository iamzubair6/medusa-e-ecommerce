#!/usr/bin/env bash
#
# setup-live-db.sh — bring the LIVE (production) CMS database in sync with the
# current Prisma schema, then create a live admin login.
#
# Both steps are ADDITIVE — they never delete live data:
#   1) prisma db push : adds any missing tables/enums (e.g. AdminUser, new
#      section types) to the live Neon CMS database so it matches the code.
#   2) create-admin   : inserts an ADMIN login so you can sign in at /admin.
#
# Run this whenever you deploy a change that altered the CMS Prisma schema
# (new model, new column, new SectionType, etc.) — it's the "apply to live"
# half of the local `db push` you run during development.
#
# Usage:
#   bash scripts/setup-live-db.sh <admin-email> [name] [role]
# Example:
#   bash scripts/setup-live-db.sh owner@maison.com "Owner" ADMIN
#
# To ONLY sync the schema (skip creating an admin), pass --schema-only:
#   bash scripts/setup-live-db.sh --schema-only
#
# Requirements: bun installed; a .env.deploy-secrets file at the repo root that
# contains a CMS_DATABASE_URL=... line (the live Neon connection string).

set -euo pipefail

# --- resolve paths (works no matter where you run it from) ---------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS="$ROOT_DIR/.env.deploy-secrets"
CMS_DIR="$ROOT_DIR/packages/cms"

# --- parse args ----------------------------------------------------------------
SCHEMA_ONLY=false
EMAIL=""
NAME="Owner"
ROLE="ADMIN"

if [[ "${1:-}" == "--schema-only" ]]; then
  SCHEMA_ONLY=true
else
  EMAIL="${1:-}"
  NAME="${2:-Owner}"
  ROLE="${3:-ADMIN}"
  if [[ -z "$EMAIL" ]]; then
    echo "✗ Missing admin email."
    echo "  Usage: bash scripts/setup-live-db.sh <admin-email> [name] [role]"
    echo "     or: bash scripts/setup-live-db.sh --schema-only"
    exit 1
  fi
fi

# --- load the LIVE database URL from the secrets file --------------------------
if [[ ! -f "$SECRETS" ]]; then
  echo "✗ Cannot find $SECRETS (the live secrets file with CMS_DATABASE_URL)."
  exit 1
fi

CMS_DATABASE_URL="$(grep -E '^CMS_DATABASE_URL=' "$SECRETS" | head -1 | cut -d= -f2- \
  | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "$CMS_DATABASE_URL" ]]; then
  echo "✗ No CMS_DATABASE_URL line found in $SECRETS."
  exit 1
fi
export CMS_DATABASE_URL

HOST="$(echo "$CMS_DATABASE_URL" | sed -E 's#.*@([^/:?]+).*#\1#')"

# --- confirm (this touches PRODUCTION) ----------------------------------------
echo "⚠️  This will modify the LIVE (production) CMS database:"
echo "      host:  $HOST"
if [[ "$SCHEMA_ONLY" == false ]]; then
  echo "      admin: $EMAIL  ($ROLE)"
fi
read -r -p "Proceed? [y/N] " REPLY
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
  echo "Aborted — nothing changed."
  exit 0
fi

# --- 1) sync schema (additive) ------------------------------------------------
echo "→ Applying schema to live (prisma db push)…"
( cd "$CMS_DIR" && bunx prisma db push --skip-generate )

# --- 2) create the live admin (unless --schema-only) --------------------------
if [[ "$SCHEMA_ONLY" == false ]]; then
  echo "→ Creating live admin $EMAIL (you'll be prompted for a password)…"
  ( cd "$CMS_DIR" && bun scripts/create-admin.ts --email "$EMAIL" --name "$NAME" --role "$ROLE" )
fi

echo "✓ Done. Live database is in sync; sign in at your live /admin/login."
