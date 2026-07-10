#!/usr/bin/env bash
#
# seed-live-catalog.sh — make the LIVE storefront look like local by seeding the
# rich Fashion-Nova catalog + enriched home into PRODUCTION.
#
# It runs TWO production operations:
#   1) Medusa catalog  — ⚠️ DESTRUCTIVE: WIPES the current live products,
#      categories & collections, then rebuilds the 26-product Fashion-Nova
#      catalog (color×size variants, BDT/USD/EUR prices, category-matched
#      images, inventory, offers). Runs on Node 20 via `medusa exec`.
#   2) CMS home layout — idempotent: rebuilds the live `home` PageLayout's 10
#      sections (nav/popups/site settings are left untouched).
#
# Usage:
#   bash scripts/seed-live-catalog.sh
#
# Requirements: bun; Node 20 (Homebrew node@20); a .env.deploy-secrets at the
# repo root with DATABASE_URL (live Medusa) and CMS_DATABASE_URL (live CMS).
#
# Prefer the SAFEST path for step 1: run the Medusa seed from the Render
# **Shell** for the backend service (its DATABASE_URL is already live, so there
# is no env juggling). This script is the local→live alternative; it sets
# DATABASE_URL inline (dotenv won't override it) so `medusa exec` hits live.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS="$ROOT/.env.deploy-secrets"
BACKEND="$ROOT/apps/medusa/apps/backend"

[[ -f "$SECRETS" ]] || { echo "✗ $SECRETS not found (needs DATABASE_URL + CMS_DATABASE_URL)."; exit 1; }

read_secret() {
  grep -E "^$1=" "$SECRETS" | head -1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}
MEDUSA_DB="$(read_secret DATABASE_URL)"
CMS_DB="$(read_secret CMS_DATABASE_URL)"
[[ -n "$MEDUSA_DB" ]] || { echo "✗ no DATABASE_URL line in $SECRETS"; exit 1; }
[[ -n "$CMS_DB" ]]    || { echo "✗ no CMS_DATABASE_URL line in $SECRETS"; exit 1; }

host_of() { echo "$1" | sed -E 's#.*@([^/:?]+).*#\1#'; }

echo "⚠️  LIVE / PRODUCTION catalog seed"
echo "    Medusa DB : $(host_of "$MEDUSA_DB")   ← step 1 WIPES & rebuilds the catalog"
echo "    CMS DB    : $(host_of "$CMS_DB")   ← step 2 rebuilds the home layout"
echo
echo "    Step 1 DELETES the current live products/categories/collections and"
echo "    replaces them with the Fashion-Nova demo catalog. This cannot be undone."
echo
read -r -p 'Type exactly  seed live  to proceed: ' CONFIRM
[[ "$CONFIRM" == "seed live" ]] || { echo "Aborted — nothing changed."; exit 0; }

# --- Node 20 for the Medusa step ----------------------------------------------
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
if ! node -v 2>/dev/null | grep -q '^v20'; then
  echo "✗ Node 20 required for Medusa (got: $(node -v 2>/dev/null || echo none))."
  echo "  Install with: brew install node@20"
  exit 1
fi

echo
echo "→ [1/2] Seeding live Medusa catalog (watch the first 'Deleted …' line —"
echo "         if those numbers look wrong, Ctrl-C immediately)…"
( cd "$BACKEND" && DATABASE_URL="$MEDUSA_DB" npx medusa exec ./src/scripts/seed-fashion-catalog.ts )

echo
echo "→ [2/2] Seeding live CMS home layout…"
( cd "$ROOT" && CMS_DATABASE_URL="$CMS_DB" bun packages/cms/prisma/seed-home.ts )

echo
echo "✓ Done. Give the storefront ~1 min (ISR revalidation) then reload your live site."
echo "  If products don't appear, confirm the live publishable key is linked to the"
echo "  Default Sales Channel the seed used."
