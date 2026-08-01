#!/usr/bin/env bash
# ==========================================
# Rentify — Supabase migration runner
# Applies the SQL files in the ONLY correct order:
#   1) schema.sql    tables, indexes, grants, base triggers
#   2) policies.sql  roles (user_roles + has_role) and RLS policies
#   3) logic.sql     business logic functions, triggers, views (logic.md)
#
# Usage:
#   export DATABASE_URL="postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres"
#   ./project-info/migrate.sh              # apply
#   ./project-info/migrate.sh --dry-run    # print the plan only
# ==========================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILES=(schema.sql policies.sql logic.sql)
DRY_RUN="${1:-}"

for f in "${FILES[@]}"; do
  [[ -f "$DIR/$f" ]] || { echo "missing file: $DIR/$f" >&2; exit 1; }
done

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "execution order:"
  i=1; for f in "${FILES[@]}"; do echo "  $i) project-info/$f"; i=$((i+1)); done
  exit 0
fi

: "${DATABASE_URL:?set DATABASE_URL to your Supabase connection string}"
command -v psql >/dev/null || { echo "psql not found (install postgresql-client)" >&2; exit 1; }

# single transaction: either the whole migration lands or nothing does
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
{
  echo "begin;"
  for f in "${FILES[@]}"; do
    echo "-- ---------- $f ----------"
    cat "$DIR/$f"
    echo
  done
  echo "commit;"
} > "$TMP"

echo "applying: ${FILES[*]}"
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 -f "$TMP"
echo "migration applied successfully."
