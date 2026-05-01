# Supabase self-hosted — fresh deploy with upgraded stack (2026-04-18)

Context: the previous Dokploy service `agritech-supabase-8pqkna` was managed via the Dokploy UI, not git. The repo contents were stale and would not deploy. We are **deleting the old service and recreating as a fresh Dokploy compose app pointed at this branch.** No production users yet, so no data migration needed.

## What's in this branch

- `supabase/docker-compose.yml` — synced from the working prod compose, then bumped to the current stable image set (Postgres **17.6.1.108**).
- `supabase/kong.yml` — synced from prod, bumped to Kong 3 declarative format (`_format_version: '3.0'`).
- `supabase/.env.example` — all 53 env vars the stack reads, values stripped.
- `files/volumes/api/kong.yml` — same as `supabase/kong.yml`, mounted by the kong service.
- `files/volumes/db/*.sql` — Postgres init scripts (roles, jwt, realtime, webhooks, pooler, _supabase, logs). These run once against a fresh data dir.
- `files/volumes/pooler/pooler.exs` — Supavisor tenant config.
- `files/volumes/logs/vector.yml` — Vector config for log forwarding to Logflare.
- `files/volumes/functions/` — edge function sources (main, hello).
- `.gitignore` adds `files/volumes/db/data/` and `files/volumes/storage/` so runtime data never gets committed.

## Version bumps

| Service | Old | New |
|---|---|---|
| postgres | 15.8.1.060 | **17.6.1.108** |
| studio | 2025.04.21-sha-173cc56 | 2026.04.08-sha-205cbe7 |
| kong | kong:2.8.1 | kong/kong:3.9.1 |
| gotrue (auth) | v2.171.0 | v2.186.0 |
| postgrest | v12.2.11 | v14.8 |
| realtime | v2.34.47 | v2.76.5 |
| storage-api | v1.22.7 | v1.48.26 |
| imgproxy | v3.8.0 | v3.30.1 |
| postgres-meta | v0.88.9 | v0.96.3 |
| edge-runtime | v1.67.4 | v1.71.2 |
| logflare | 1.12.0 | 1.36.1 |
| supavisor | 2.5.1 | 2.7.4 |
| vector | 0.28.1-alpine | 0.53.0-alpine |

## Deploy steps (Dokploy)

### 1. Back up the .env from the old service (one-time, for reference)
```bash
cp /etc/dokploy/compose/agritech-supabase-8pqkna/code/.env /root/supabase-env-backup-$(date +%F).env
```
Useful if you want to reuse `JWT_SECRET` / `ANON_KEY` / `SERVICE_ROLE_KEY` so existing frontend/API clients keep working without re-issuing tokens. Otherwise you'll regenerate and update every client.

### 2. Delete the old Dokploy service
In Dokploy UI, delete `agritech-supabase-8pqkna`. This tears down containers, the network, and `/etc/dokploy/compose/agritech-supabase-8pqkna/`.

### 3. Create a new Dokploy "Compose" application
- **Source:** Git, pointed at `git@github.com:boutchaz/agritech.git`, branch `chore/supabase-upgrade` (or `main` after merge).
- **Compose path:** `supabase/docker-compose.yml`.
- **Build context:** repo root (so `../files/volumes/...` mounts resolve to `/etc/dokploy/compose/<new-id>/files/volumes/...`).

### 4. Fix hardcoded identifiers in the compose **before first deploy**

The compose file still has the old Dokploy prefix baked into two places. Dokploy's new service will have a different ID — search/replace after creation:

- **Network name** — 13 occurrences of `agritech-supabase-8pqkna`. Replace with the new Dokploy-generated network name (visible in Dokploy UI → Networks), OR remove `external: true` from the network definition and let Docker create it automatically (simpler for a single-stack deploy).
- **Traefik labels** — `agritech-supabase-8pqkna-12-web*` and the host `agrogina-supabase.wearecodelovers.com`. Easier to **delete all Traefik labels from the kong service** and configure the domain through Dokploy's Domains UI instead — it'll inject correct labels automatically.

### 5. Fill in the `.env` in Dokploy

Copy `supabase/.env.example` values in through the Dokploy UI env editor. Key choices:

- **`CONTAINER_PREFIX`** — give it a new value (e.g. `agritech-supabase-prod`).
- **`JWT_SECRET` / `ANON_KEY` / `SERVICE_ROLE_KEY`** — either reuse from old backup (zero client rework) or generate fresh via https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys.
- **`POSTGRES_PASSWORD`, `SECRET_KEY_BASE`, `VAULT_ENC_KEY`, `LOGFLARE_API_KEY`, `DASHBOARD_PASSWORD`** — generate fresh (32+ random chars).
- **`SITE_URL`, `API_EXTERNAL_URL`, `SUPABASE_PUBLIC_URL`** — point at the new domain.
- **`ADDITIONAL_REDIRECT_URLS`** — include all frontend origins.

### 6. Deploy and watch logs

In this order, watch for:
- **db** starts healthy → init SQL scripts ran → `\dx` shows extensions loaded.
- **analytics (logflare)** becomes healthy (depends on db).
- **auth (gotrue)** runs its own migrations on the `auth` schema — watch for migration failures on first boot.
- **realtime** runs migrations on `_realtime` schema.
- **storage** runs migrations on `storage` schema.
- **kong** — if it fails, it's almost always kong.yml format / plugin syntax. Logs will say "unsupported format version" or plugin not found.

### 7. Smoke tests

```bash
# Studio
curl -sI https://<your-domain>/ | head -5
# REST (expect 401 without key)
curl -sI https://<your-domain>/rest/v1/ | head -5
# REST with key (expect 200 or empty list)
curl -s -H "apikey: $ANON_KEY" https://<your-domain>/rest/v1/
# Auth health
curl -s https://<your-domain>/auth/v1/health
```

### 8. Update integration server

Once prod is green, repeat steps 2–7 on the integration Dokploy instance.

## Known risks (re-surfaced from audit)

1. **Kong 2.8 → 3.9** — config format bumped to `3.0` in this branch. If the new Kong container still rejects the file, most common cause is `_transform: true` + a plugin config that Kong 3 validates more strictly. Check the kong container logs first.
2. **PostgREST 12 → 14** — `PGRST_DB_USE_LEGACY_GUCS` is silently ignored in v13+ (left in compose as harmless dead var). v14 requires `authenticator` role to have `GRANT anon, authenticated, service_role TO authenticator` — verified present in `files/volumes/db/roles.sql`.
3. **Supabase Postgres 17 image** — ahead of upstream self-hosted reference (upstream compose still pins 15). Image is actively maintained (push 2026-04-18). Bundled extension versions differ from 15; on first boot, check `\dx` inside `postgres`, `_analytics`, and `_supabase` databases.
4. **Realtime / Storage schema migrations** run on first boot against the fresh DB — usually clean on a new data dir, but watch startup logs.

## Rollback

Since there's no prod data, rollback is just: delete the new Dokploy service, recreate pointing at a previous commit (or main before merge). No pg_dump needed.
