#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MIGRATIONS_DB_URL:-}" ]]; then
  echo "MIGRATIONS_DB_URL is required."
  echo "Example (private network):"
  echo "  postgresql://postgres:<password>@db:5432/postgres?sslmode=disable"
  exit 1
fi

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  docker compose run --rm --profile migrations db-migrator \
    sh -lc 'supabase db push --db-url "$MIGRATIONS_DB_URL" --dry-run'
  exit 0
fi

docker compose run --rm --profile migrations db-migrator
