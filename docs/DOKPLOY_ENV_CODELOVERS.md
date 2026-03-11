# Codelovers Dokploy – Env Variables from thebzlab

Compose and the push script are **server-agnostic**: no hardcoded thebzlab/Codelovers URLs or keys. Set all required vars in `.env.dokploy` (see `.env.dokploy.example`) for whichever server you target.

**Automated option:** Push env via Dokploy API:

```bash
cp .env.dokploy.example .env.dokploy
# Edit .env.dokploy: set DOKPLOY_URL, DOKPLOY_API_KEY and all required per-server vars
# (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, POSTGRES_PASSWORD,
#  SUPABASE_NETWORK_NAME, SUPABASE_DB_HOST, API_URL, DASHBOARD_URL, SATELLITE_URL, CMS_URL)
node scripts/set-dokploy-env.mjs
```

Then redeploy each compose stack (api, satellite, dashboard, cms) in Dokploy.

---

**Manual option** (if you prefer to copy from thebzlab UI):

**Codelovers agritech project** has 5 compose stacks:

| Service    | Compose ID (Codelovers)   | Purpose                          |
|-----------|---------------------------|-----------------------------------|
| dashboard | `yWxDZCuYYS9zJc5WZ_7zB`   | Main frontend (Vite/React)        |
| api       | `JLfCPchu5VwGpiDPGqlhw`   | NestJS API                       |
| satellite | `khtRQZT_omBZwRy5B4wi9`   | Python backend (GEE, satellite)   |
| supabase  | `wrpzqD1x0LEWqzo9uov2B`   | PostgreSQL + Auth + Storage      |
| cms       | `GoUpFeVUACKA3BGnbBGSc`   | Strapi CMS                       |

**How to use:** In thebzlab Dokploy, open each service → **Environment** (or compose env section). Copy the variables listed below. In Codelovers Dokploy, open the matching service and set the same keys; replace thebzlab hostnames/URLs with your Codelovers domains where noted.

---

## 1. Supabase (compose: `supabase`)

Set these first; other services depend on Supabase URL and keys.

| Variable | Copy from thebzlab? | Notes |
|----------|---------------------|--------|
| `POSTGRES_PASSWORD` | ✅ | DB password |
| `JWT_SECRET` | ✅ | Used by API and frontend auth |
| `ANON_KEY` | ✅ | Public anon key (same as `SUPABASE_ANON_KEY` elsewhere) |
| `SERVICE_ROLE_KEY` | ✅ | Server-only; never expose in frontend |
| `LOGFLARE_API_KEY` | If used | Optional |

After deploy, note your **Supabase base URL** (e.g. `https://agritech-supabase-xxx.codelovers.traefik.me`) and **ANON_KEY** / **SERVICE_ROLE_KEY** for the other services.

---

## 2. API (compose: `api`)

NestJS agritech-api. Point to Codelovers Supabase and dashboard URL.

**Traefik routing (compose labels):** Set these in the compose stack env so routing works:

| Variable | Purpose |
|----------|--------|
| `API_TRAEFIK_HOST` | Traefik.me host for this stack (e.g. `agritech-api-xxx.traefik.me`). |
| `API_PUBLIC_HOST` | Custom domain (e.g. `api.wearecodelovers.com`). Also used for X-Forwarded-Host. |
| `TRAEFIK_NETWORK` | Network Traefik uses (default `dokploy-network`). |

| Variable | Copy from thebzlab? | Set in Codelovers |
|----------|---------------------|-------------------|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `3001` (or your exposed port) |
| `SUPABASE_URL` | ✅ → replace | Your **Codelovers** Supabase URL (e.g. `https://agritech-supabase-xxx.codelovers.traefik.me`) |
| `SUPABASE_ANON_KEY` | ✅ | Same anon key from Codelovers Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Same service role key from Codelovers Supabase |
| `JWT_SECRET` | ✅ | Same `JWT_SECRET` as Supabase |
| `JWT_EXPIRES_IN` | ✅ | e.g. `1h` |
| `DATABASE_URL` | ✅ → replace | `postgresql://postgres:<POSTGRES_PASSWORD>@<supabase-compose-service>:5432/postgres` — use Codelovers Supabase internal host/port if same compose network |
| `CORS_ORIGIN` | → replace | Your dashboard + API + marketplace origins (e.g. `https://agritech-dashboard.codelovers.traefik.me,https://agritech-api.codelovers.traefik.me`) |
| `FRONTEND_URL` | → replace | `https://agritech-dashboard.xxx.codelovers.traefik.me` (or your dashboard domain) |
| `CMS_URL` | → replace | Your Codelovers CMS URL (e.g. `https://agritech-cms.xxx.codelovers.traefik.me`) |
| `EMAIL_*` / `SMTP_*` | ✅ | Copy if you use SMTP |
| `POLAR_*` | ✅ | Copy all Polar.sh vars if using subscriptions |

---

## 3. Satellite (compose: `satellite`)

Python backend-service (GEE, indices, CDSE). Point to Codelovers Supabase.

**Traefik routing (compose labels):** Set these in the compose stack env:

| Variable | Purpose |
|----------|--------|
| `SATELLITE_TRAEFIK_HOST` | Traefik.me host for this stack (e.g. `agritech-satellite-xxx.traefik.me`). |
| `SATELLITE_PUBLIC_HOST` | Custom domain (e.g. `satellite.wearecodelovers.com`). |
| `TRAEFIK_NETWORK` | Network Traefik uses (default `dokploy-network`). |

| Variable | Copy from thebzlab? | Set in Codelovers |
|----------|---------------------|-------------------|
| `SATELLITE_PROVIDER` | ✅ | `gee` or `auto` |
| `SATELLITE_COMMERCIAL_MODE` | ✅ | `false` (or `true` for CDSE) |
| `GEE_SERVICE_ACCOUNT` | ✅ | GCP service account email |
| `GEE_PRIVATE_KEY` | ✅ | Full JSON key (escape newlines in Dokploy) |
| `GEE_PROJECT_ID` | ✅ | GCP project ID |
| `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` | If using CDSE | From Copernicus Data Space |
| `SUPABASE_URL` | ✅ → replace | Codelovers Supabase URL |
| `SUPABASE_ANON_KEY` | ✅ | Codelovers anon key |
| `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Codelovers service role key |
| `SATELLITE_DOMAIN` | → replace | Your Codelovers satellite public domain (e.g. `agritech-satellite-xxx.codelovers.traefik.me`) |
| `DEBUG` | ✅ | `false` |
| `PORT` | ✅ | `8000` |

---

## 4. Dashboard (compose: `dashboard`)

Vite/React frontend. All `VITE_*` vars are baked in at build time.

**Traefik routing (compose labels):** The dashboard compose includes Traefik labels. Set these in the **compose stack env** in Dokploy so routing works:

| Variable | Purpose |
|----------|--------|
| `DASHBOARD_TRAEFIK_HOST` | Traefik.me host for this stack (e.g. `agritech-dashboard-pu6ujw-aade68-37-27-217-1.traefik.me`). Used for HTTP/HTTPS routers. |
| `DASHBOARD_PUBLIC_HOST` | Custom domain (e.g. `agriprofy.wearecodelovers.com`). Omit or set to a non-matching value to disable custom-domain routing. |
| `TRAEFIK_NETWORK` | Network Traefik uses to reach the container (default `dokploy-network`). Ensure the stack is attached to this network in Dokploy. |

| Variable | Copy from thebzlab? | Set in Codelovers |
|----------|---------------------|-------------------|
| `VITE_SUPABASE_URL` | ✅ → replace | Codelovers Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Codelovers anon key |
| `VITE_API_URL` | → replace | Codelovers API URL (e.g. `https://agritech-api.xxx.codelovers.traefik.me`) |
| `VITE_BACKEND_SERVICE_URL` | → replace | Codelovers satellite URL |
| `VITE_SATELLITE_SERVICE_URL` | → replace | Same as above |
| `VITE_AUTH_SUPABASE_URL` / `VITE_AUTH_SUPABASE_ANON_KEY` | If used | Auth Supabase (cloud) if separate |
| `VITE_MARKETPLACE_URL` | → replace | Codelovers marketplace URL if you have one |
| `VITE_OPENWEATHER_API_KEY` | ✅ | Optional |
| `VITE_GA_MEASUREMENT_ID` / `VITE_CLARITY_*` | ✅ | Optional analytics |
| `VITE_MAP_PROVIDER` / `VITE_MAPBOX_TOKEN` | ✅ | Optional |

---

## 5. CMS (compose: `cms`)

Strapi. Database and admin URL.

**Traefik routing (compose labels):** Set these in the compose stack env:

| Variable | Purpose |
|----------|--------|
| `CMS_TRAEFIK_HOST` | Traefik.me host for this stack (e.g. `agritech-cms-xxx.traefik.me`). |
| `CMS_PUBLIC_HOST` | Custom domain (e.g. `cms.wearecodelovers.com`). |
| `TRAEFIK_NETWORK` | Network Traefik uses (default `dokploy-network`). |

| Variable | Copy from thebzlab? | Set in Codelovers |
|----------|---------------------|-------------------|
| `DATABASE_CLIENT` | ✅ | `postgres` |
| `HOST` | ✅ | `0.0.0.0` |
| `PORT` | ✅ | `1337` |
| `APP_KEYS` / `API_TOKEN_SALT` / `ADMIN_JWT_SECRET` / `TRANSFER_TOKEN_SALT` | ✅ | Copy from thebzlab (keep same or regenerate for new env) |
| `STRAPI_*` / Postgres connection | ✅ → replace | Point to Codelovers Postgres (Supabase or dedicated DB) |

---

## Quick copy order

1. **Supabase** – get URL, `ANON_KEY`, `SERVICE_ROLE_KEY`, `JWT_SECRET`, `POSTGRES_PASSWORD`.
2. **API** – Supabase URL/keys + CORS + `FRONTEND_URL` + `CMS_URL` (+ Polar/email if needed).
3. **Satellite** – GEE + Supabase URL/keys + `SATELLITE_DOMAIN`.
4. **Dashboard** – all `VITE_*` pointing to Codelovers API/Supabase/satellite URLs.
5. **CMS** – Strapi secrets + DB connection to Codelovers Postgres.

Replace any `*.thebzlab.online` or `*.traefik.me` (thebzlab) with your Codelovers domains (e.g. `*.codelovers.traefik.me` or your custom domain).

---

## Troubleshooting: API "network not found"

**Error:** `Could not attach to network agritech-supabase-8pqkna_default: network not found`

**Cause:** The API compose is configured to join the Supabase stack’s Docker network. That network only exists after Supabase is running, and its name depends on how Dokploy/compose created it.

**Fix:**

1. **Deploy Supabase first**  
   In Dokploy, deploy/start the **Supabase** compose stack before the API. That creates the network.

2. **Use the exact network name (no `_default` suffix)**  
   On the **Dokploy host**, run:
   ```bash
   docker network ls | grep -i supabase
   ```
   Use the **exact** name shown (e.g. `agritech-supabase-8pqkna`). Do **not** append `_default` — Dokploy may create the network without that suffix.

3. **Set it in env and push**  
   In `.env.dokploy` set:
   ```bash
   SUPABASE_NETWORK_NAME=agritech-supabase-8pqkna
   ```
   (or the name from step 2). Then:
   ```bash
   node scripts/set-dokploy-env.mjs
   ```
   and redeploy the **API** stack in Dokploy.

---

## Reference: repo env examples

- **API:** `agritech-api/.env.example`
- **Satellite:** `backend-service/.env.example`, `backend-service/.satellite-env.example`
- **Frontend:** `project/.env.example`
- **AGENTS.md:** “Environment Variables” and “Key Files” sections
