# AgriTech Local Development Environment

Complete Docker Compose setup for running the entire AgriTech stack locally with domain simulation.

## Overview

This setup provides a complete local development environment that mirrors your production infrastructure:

- **Traefik** - Reverse proxy with automatic SSL and routing
- **Supabase Stack** - Full Supabase deployment (Auth, Storage, Realtime, etc.)
- **AgriTech Dashboard** - React/Vite frontend
- **AgriTech API** - NestJS backend API
- **Satellite API** - Python FastAPI for satellite data processing
- **Strapi CMS** - Content management system
- **MinIO** - S3-compatible object storage
- **Adminer** - Database management UI

All services are accessible via `*.local.thebzlab.online` domains that mirror your production setup.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 8GB RAM allocated to Docker
- ~20GB free disk space

## Quick Start

### 1. Setup Local Hosts

Configure your `/etc/hosts` file to route local domains:

```bash
./setup-local-hosts.sh
```

This adds entries like:
- `127.0.0.1 agritech.local.thebzlab.online`
- `127.0.0.1 agritech-dashboard.local.thebzlab.online`
- etc.

### 2. Configure Environment

Copy the environment template and update with your values:

```bash
cp .env.local .env.local
```

Edit `.env.local` and update these critical values:

```bash
# Generate secure passwords
SUPABASE_DB_PASSWORD=$(openssl rand -base64 32)

# Generate JWT secret (at least 32 characters)
JWT_SECRET=$(openssl rand -base64 32)

# Generate Supabase keys
ANON_KEY=<your-anon-key>
SERVICE_ROLE_KEY=<your-service-role-key>

# Generate secret key base (at least 64 characters)
SECRET_KEY_BASE=$(openssl rand -base64 64)

# Strapi secrets
STRAPI_JWT_SECRET=$(openssl rand -base64 24)
STRAPI_ADMIN_JWT_SECRET=$(openssl rand -base64 24)
STRAPI_APP_KEYS=$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16)
STRAPI_API_TOKEN_SALT=$(openssl rand -base64 16)
STRAPI_TRANSFER_TOKEN_SALT=$(openssl rand -base64 16)

# Google Earth Engine (get from your GCP project)
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type": "service_account", ...}'
GEE_PROJECT_ID=your-project-id
```

### 3. Start Services

Use the helper script to start all services:

```bash
./local-dev.sh start
```

Or use Docker Compose directly:

```bash
docker compose -f docker-compose.local.yml --env-file .env.local up -d
```

### 4. Access Services

Once all services are running, access them via:

| Service | URL | Description |
|---------|-----|-------------|
| **Traefik Dashboard** | http://traefik.local.thebzlab.online:8080 | View routing and service health |
| **Supabase Studio** | http://supabase.local.thebzlab.online | Manage database, auth, storage |
| **Supabase API** | http://agritech.local.thebzlab.online | Main Supabase API endpoint |
| **AgriTech Dashboard** | http://agritech-dashboard.local.thebzlab.online | Main application frontend |
| **AgriTech API** | http://agritech-api.local.thebzlab.online | NestJS API |
| **Strapi CMS** | http://cms.local.thebzlab.online | Content management |
| **Satellite API** | http://satellite-api.local.thebzlab.online | Satellite data API |
| **MinIO Console** | http://minio.local.thebzlab.online | S3 storage management |
| **S3 API** | http://s3.local.thebzlab.online | S3-compatible API endpoint |
| **Adminer** | http://adminer.local.thebzlab.online | Database management |

## Helper Script Usage

The `local-dev.sh` script provides convenient commands:

```bash
# Start all services
./local-dev.sh start

# Stop all services
./local-dev.sh stop

# Restart all services
./local-dev.sh restart

# Show service status and URLs
./local-dev.sh status

# View logs (all services)
./local-dev.sh logs

# View logs for specific service
./local-dev.sh logs frontend
./local-dev.sh logs backend-service

# Execute shell in a container
./local-dev.sh exec frontend
./local-dev.sh exec supabase-db

# Rebuild services (after code changes)
./local-dev.sh rebuild

# Reset everything (removes all data!)
./local-dev.sh reset
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Traefik                              │
│                    (Reverse Proxy)                           │
│                  :80 (HTTP) / :443 (HTTPS)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├──────────────────────────────┐
                              │                              │
                    ┌─────────▼─────────┐          ┌────────▼────────┐
                    │  Supabase Kong    │          │    Frontend     │
                    │   API Gateway     │          │   (React/Vite)  │
                    └─────────┬─────────┘          └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼─────┐ ┌──────▼──────┐ ┌─────▼─────┐
    │  Supabase DB  │ │ Supabase    │ │ Supabase  │
    │  (Postgres)   │ │   Auth      │ │  Storage  │
    └───────────────┘ └─────────────┘ └───────────┘
```

### Network Communication

All services run on the `agritech-local-network` Docker network, enabling:

- Service-to-service communication via container names
- Centralized routing through Traefik
- Isolated development environment

## Service Details

### Supabase Stack

The local Supabase deployment includes:

- **supabase-db**: PostgreSQL 15 with Supabase extensions
- **supabase-kong**: API Gateway routing to all Supabase services
- **supabase-auth**: GoTrue authentication service
- **supabase-rest**: PostgREST API
- **supabase-realtime**: Realtime subscriptions
- **supabase-storage**: File storage with image transformation
- **supabase-studio**: Web UI for management
- **supabase-meta**: Postgres metadata API
- **supabase-analytics**: Logflare analytics

### Application Services

- **frontend**: React application built with Vite
- **backend-service**: Python FastAPI for satellite data processing
- **agritech-api**: NestJS API backend
- **strapi**: Headless CMS for content management

### Supporting Services

- **traefik**: Routes all HTTP traffic based on domain names
- **minio**: S3-compatible object storage
- **adminer**: Web-based database management
- **strapi-db**: PostgreSQL for Strapi

## Development Workflow

### Making Code Changes

#### Frontend Development

1. The frontend container uses hot-reload in development mode
2. Changes to files in `./project/src` are reflected immediately
3. Rebuild container after dependency changes:

```bash
docker compose -f docker-compose.local.yml build frontend
docker compose -f docker-compose.local.yml up -d frontend
```

#### Backend Development

1. Changes to Python code in `./backend-service` require container restart:

```bash
./local-dev.sh restart backend-service
```

2. For NestJS API changes:

```bash
./local-dev.sh restart agritech-api
```

#### Strapi Development

Strapi runs in development mode with hot-reload:

```bash
./local-dev.sh logs strapi
```

### Database Management

#### Via Adminer

1. Navigate to http://adminer.local.thebzlab.online
2. Login credentials:
   - **System**: PostgreSQL
   - **Server**: `supabase-db` or `strapi-db`
   - **Username**: `postgres` or `strapi`
   - **Password**: From your `.env.local`
   - **Database**: `postgres` or `agritech_strapi`

#### Via Supabase Studio

1. Navigate to http://supabase.local.thebzlab.online
2. Use the Table Editor, SQL Editor, and other tools

#### Direct psql Access

```bash
# Supabase database
./local-dev.sh exec supabase-db
psql -U postgres

# Strapi database
./local-dev.sh exec strapi-db
psql -U strapi -d agritech_strapi
```

### Viewing Logs

```bash
# All services
./local-dev.sh logs

# Specific service with follow
docker compose -f docker-compose.local.yml logs -f frontend

# Last 100 lines
docker compose -f docker-compose.local.yml logs --tail=100 backend-service
```

## Troubleshooting

### Services Not Starting

1. **Check Docker resources**: Ensure Docker has enough RAM (8GB+)
2. **Check port conflicts**: Ports 80, 443, 8080 must be available
3. **View service logs**:

```bash
./local-dev.sh logs <service-name>
```

### Cannot Access Domains

1. **Verify hosts file**:

```bash
cat /etc/hosts | grep thebzlab
```

2. **Flush DNS cache** (macOS):

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Database Connection Issues

1. **Check database is healthy**:

```bash
docker compose -f docker-compose.local.yml ps
```

2. **Verify environment variables**:

```bash
./local-dev.sh exec supabase-db env | grep POSTGRES
```

3. **Restart database**:

```bash
docker compose -f docker-compose.local.yml restart supabase-db
```

### Supabase Studio Not Loading

1. **Check all dependencies are running**:

```bash
./local-dev.sh status
```

2. **Verify Kong routing**:

```bash
./local-dev.sh logs supabase-kong
```

3. **Check Traefik dashboard** at http://traefik.local.thebzlab.online:8080

### Reset Environment

If things are broken beyond repair:

```bash
# Stop and remove everything
./local-dev.sh reset

# Recreate from scratch
./local-dev.sh start
```

## Production Parity

This local setup mirrors your production environment:

| Production | Local |
|------------|-------|
| `agritech.thebzlab.online` | `agritech.local.thebzlab.online` |
| `agritech-dashboard.thebzlab.online` | `agritech-dashboard.local.thebzlab.online` |
| `cms.thebzlab.online` | `cms.local.thebzlab.online` |
| `satellite-api.thebzlab.online` | `satellite-api.local.thebzlab.online` |
| `minio.thebzlab.online` | `minio.local.thebzlab.online` |

Environment variables are managed separately to allow different configurations.

## Performance Tips

1. **Allocate more RAM to Docker**: 8GB minimum, 12GB+ recommended
2. **Use Docker volumes for databases**: Already configured for persistence
3. **Enable BuildKit**: Add to `~/.docker/config.json`:

```json
{
  "features": {
    "buildkit": true
  }
}
```

4. **Prune unused resources regularly**:

```bash
docker system prune -a --volumes
```

## Security Notes

⚠️ **This setup is for LOCAL DEVELOPMENT ONLY**

- Default passwords and keys are insecure
- No SSL/TLS encryption (HTTP only)
- Traefik dashboard is accessible without authentication
- Services are exposed directly

**Never use this configuration in production!**

## Backup and Restore

### Backup Database

```bash
# Supabase
docker compose -f docker-compose.local.yml exec supabase-db \
  pg_dump -U postgres postgres > backup_supabase_$(date +%Y%m%d).sql

# Strapi
docker compose -f docker-compose.local.yml exec strapi-db \
  pg_dump -U strapi agritech_strapi > backup_strapi_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Supabase
cat backup_supabase_20231127.sql | \
  docker compose -f docker-compose.local.yml exec -T supabase-db \
  psql -U postgres postgres

# Strapi
cat backup_strapi_20231127.sql | \
  docker compose -f docker-compose.local.yml exec -T strapi-db \
  psql -U strapi agritech_strapi
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Strapi Documentation](https://docs.strapi.io/)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. View service logs: `./local-dev.sh logs <service>`
3. Check Traefik dashboard for routing issues
4. Review Docker Compose configuration in `docker-compose.local.yml`

---

**Happy coding! 🚀**
