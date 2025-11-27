# AgriTech Local Development - Quick Start Guide

## Prerequisites

- Docker Desktop installed and running
- 8GB+ RAM allocated to Docker
- 20GB+ free disk space

## Setup (First Time Only)

### 1. Configure Local Hosts

```bash
./setup-local-hosts.sh
```

This adds local domain entries to `/etc/hosts`.

### 2. Create Environment File

```bash
cp .env.local .env.local
```

**Generate secure secrets:**

```bash
# Generate all secrets at once
cat > .env.local << EOF
# Database
SUPABASE_DB_PASSWORD=$(openssl rand -base64 32)

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# Supabase Keys
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Analytics
LOGFLARE_API_KEY=$(openssl rand -base64 32)
SECRET_KEY_BASE=$(openssl rand -base64 64)

# Strapi
STRAPI_DB_NAME=agritech_strapi
STRAPI_DB_USER=strapi
STRAPI_DB_PASSWORD=$(openssl rand -base64 24)
STRAPI_JWT_SECRET=$(openssl rand -base64 24)
STRAPI_ADMIN_JWT_SECRET=$(openssl rand -base64 24)
STRAPI_APP_KEYS=$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16)
STRAPI_API_TOKEN_SALT=$(openssl rand -base64 16)
STRAPI_TRANSFER_TOKEN_SALT=$(openssl rand -base64 16)

# Google Earth Engine (UPDATE THESE!)
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type": "service_account", "project_id": "...", "private_key": "..."}'
GEE_PROJECT_ID=agrisat-463314
GOOGLE_API_KEY=your-google-api-key

# Database URL
DATABASE_URL=postgresql://postgres:your-super-secret-db-password@supabase-db:5432/postgres

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
EOF
```

**Important:** Update `GEE_SERVICE_ACCOUNT`, `GEE_PRIVATE_KEY`, `GEE_PROJECT_ID`, and `GOOGLE_API_KEY` with your actual values!

### 3. Start Everything

```bash
./local-dev.sh start
```

Wait 1-2 minutes for all services to initialize.

## Daily Usage

### Start Development Environment

```bash
./local-dev.sh start
```

### Stop Everything

```bash
./local-dev.sh stop
```

### Check Status

```bash
./local-dev.sh status
```

## Access Your Services

Once started, open these URLs in your browser:

| Service | URL |
|---------|-----|
| 📊 **Traefik Dashboard** | http://traefik.local.thebzlab.online:8080 |
| 🗄️ **Supabase Studio** | http://supabase.local.thebzlab.online |
| 🌐 **AgriTech Dashboard** | http://agritech-dashboard.local.thebzlab.online |
| 🚀 **AgriTech API** | http://agritech-api.local.thebzlab.online |
| 📝 **Strapi CMS** | http://cms.local.thebzlab.online |
| 🛰️ **Satellite API** | http://satellite-api.local.thebzlab.online |
| 💾 **MinIO Console** | http://minio.local.thebzlab.online |
| 🗃️ **Adminer** | http://adminer.local.thebzlab.online |

## Common Commands

```bash
# View all logs
./local-dev.sh logs

# View specific service logs
./local-dev.sh logs frontend
./local-dev.sh logs backend-service

# Restart a service
docker compose -f docker-compose.local.yml restart frontend

# Execute shell in container
./local-dev.sh exec frontend
./local-dev.sh exec supabase-db

# Rebuild after code changes
./local-dev.sh rebuild

# Reset everything (DANGER: removes all data!)
./local-dev.sh reset
```

## Troubleshooting

### Services won't start?

```bash
# Check Docker is running
docker info

# Check what's running
docker ps

# View errors
./local-dev.sh logs
```

### Can't access domains?

```bash
# Verify hosts file
cat /etc/hosts | grep thebzlab

# Re-run setup if missing
./setup-local-hosts.sh

# Flush DNS (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Supabase Studio not loading?

```bash
# Check all Supabase services are running
docker compose -f docker-compose.local.yml ps | grep supabase

# Check Traefik routing
open http://traefik.local.thebzlab.online:8080
```

### Database connection errors?

```bash
# Restart database
docker compose -f docker-compose.local.yml restart supabase-db

# Check database logs
./local-dev.sh logs supabase-db
```

### Everything is broken!

```bash
# Nuclear option - reset everything
./local-dev.sh reset

# Start fresh
./local-dev.sh start
```

## Development Tips

### Frontend Changes

Hot-reload is enabled. Just edit files in `./project/src/` and see changes immediately.

### Backend Changes

Restart the service after code changes:

```bash
docker compose -f docker-compose.local.yml restart backend-service
```

### Database Changes

1. Use Supabase Studio: http://supabase.local.thebzlab.online
2. Or use Adminer: http://adminer.local.thebzlab.online
3. Or psql directly:

```bash
./local-dev.sh exec supabase-db
psql -U postgres
```

## Next Steps

- Read the full documentation: [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)
- Configure your Google Earth Engine credentials in `.env.local`
- Start developing! 🚀

## Getting Help

1. Check the logs: `./local-dev.sh logs <service>`
2. Check Traefik dashboard: http://traefik.local.thebzlab.online:8080
3. Read the full docs: [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)

---

**Happy coding! 🎉**
