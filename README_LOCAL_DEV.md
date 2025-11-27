# AgriTech Local Development Setup

Complete local development environment using Docker Compose with domain simulation.

## 📋 Files Overview

This setup includes the following files:

| File | Purpose |
|------|---------|
| `docker-compose.local.yml` | Main Docker Compose configuration |
| `.env.local` | Environment variables (create from template) |
| `setup-local-hosts.sh` | Configure `/etc/hosts` for local domains |
| `generate-secrets.sh` | Generate all required secrets |
| `local-dev.sh` | Helper script for common operations |
| `LOCAL_DEVELOPMENT.md` | Complete documentation |
| `QUICK_START_LOCAL.md` | Quick start guide |
| `supabase/kong.yml` | Supabase API Gateway configuration |
| `supabase/vector.yml` | Log collection configuration |

## 🚀 Quick Start

### Step 1: Generate Secrets

```bash
./generate-secrets.sh
```

This creates `.env.local` with all required secrets.

### Step 2: Update Google Earth Engine Credentials

Edit `.env.local` and update:

```bash
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type": "service_account", ...}'
GEE_PROJECT_ID=your-project-id
GOOGLE_API_KEY=your-api-key
```

### Step 3: Setup Local Domains

```bash
./setup-local-hosts.sh
```

### Step 4: Start Everything

```bash
./local-dev.sh start
```

Wait 1-2 minutes for all services to initialize.

### Step 5: Access Services

Open in your browser:

- **Traefik Dashboard**: http://traefik.local.thebzlab.online:8080
- **Supabase Studio**: http://supabase.local.thebzlab.online
- **AgriTech Dashboard**: http://agritech-dashboard.local.thebzlab.online
- **AgriTech API**: http://agritech-api.local.thebzlab.online
- **Strapi CMS**: http://cms.local.thebzlab.online
- **Satellite API**: http://satellite-api.local.thebzlab.online
- **MinIO Console**: http://minio.local.thebzlab.online
- **Adminer**: http://adminer.local.thebzlab.online

## 📚 Documentation

- **Quick Start**: See [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md)
- **Full Documentation**: See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)

## 🛠️ Common Commands

```bash
# Start all services
./local-dev.sh start

# Stop all services
./local-dev.sh stop

# View status
./local-dev.sh status

# View logs
./local-dev.sh logs [service]

# Restart services
./local-dev.sh restart

# Rebuild after code changes
./local-dev.sh rebuild

# Reset everything (removes all data!)
./local-dev.sh reset

# Execute shell in container
./local-dev.sh exec <service>
```

## 🏗️ Architecture

```
Local Domains (*.local.thebzlab.online)
                ↓
            Traefik (Reverse Proxy)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Supabase Stack          Application Services
    ├── Database            ├── Frontend (React)
    ├── Auth                ├── API (NestJS)
    ├── Storage             ├── Satellite API (Python)
    ├── Realtime            └── CMS (Strapi)
    └── Studio
```

## 🔧 Services Included

### Core Infrastructure
- **Traefik**: Reverse proxy and routing
- **Supabase**: Complete backend (Auth, Database, Storage, Realtime)

### Application Services
- **Frontend**: React/Vite dashboard
- **AgriTech API**: NestJS backend
- **Satellite API**: Python FastAPI for satellite data
- **Strapi CMS**: Content management

### Supporting Services
- **MinIO**: S3-compatible object storage
- **Adminer**: Database management UI
- **PostgreSQL**: Databases for Supabase and Strapi

## 🌐 Domain Mapping

All services use `.local.thebzlab.online` domains that mirror production:

| Production | Local |
|------------|-------|
| `agritech.thebzlab.online` | `agritech.local.thebzlab.online` |
| `agritech-dashboard.thebzlab.online` | `agritech-dashboard.local.thebzlab.online` |
| `cms.thebzlab.online` | `cms.local.thebzlab.online` |
| `satellite-api.thebzlab.online` | `satellite-api.local.thebzlab.online` |

## 📦 Requirements

- Docker Desktop (or Docker Engine + Docker Compose)
- 8GB+ RAM allocated to Docker
- 20GB+ free disk space
- macOS, Linux, or Windows with WSL2

## 🔐 Security Notes

⚠️ **This is for LOCAL DEVELOPMENT ONLY**

- Uses HTTP (no SSL/TLS)
- Contains default/demo credentials
- Services exposed without authentication
- **DO NOT use in production!**

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker resources
docker info

# Check what's running
./local-dev.sh status

# View error logs
./local-dev.sh logs
```

### Can't access domains

```bash
# Verify hosts file
cat /etc/hosts | grep thebzlab

# Re-run setup
./setup-local-hosts.sh

# Flush DNS (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Reset everything

```bash
./local-dev.sh reset
./local-dev.sh start
```

## 📖 Additional Resources

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Traefik Docs](https://doc.traefik.io/traefik/)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Strapi Docs](https://docs.strapi.io/)

## 🤝 Support

1. Check the [troubleshooting section](#-troubleshooting)
2. View logs: `./local-dev.sh logs <service>`
3. Check [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for detailed docs
4. Review the [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md) guide

---

Made with ❤️ for AgriTech Development
