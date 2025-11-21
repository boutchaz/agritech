# NestJS API Deployment Guide (Dokploy)

## Overview

This guide walks you through deploying the AgriTech NestJS API to Dokploy with Traefik routing.

---

## Prerequisites

- Dokploy installed and running
- Traefik configured in Dokploy
- Domain pointing to your server: `agritech-api.thebzlab.online`
- Self-hosted Supabase instance running

---

## Step 1: Environment Variables

### Required Variables

Set these in Dokploy UI or in a `.env` file:

```bash
# Application
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1

# Traefik (IMPORTANT!)
TRAEFIK_HOST=agritech-api.thebzlab.online

# Supabase (Self-hosted)
SUPABASE_URL=https://dokploy.thebzlab.online
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT (Use Supabase JWT Secret)
JWT_SECRET=xt01wec6p0wfiuqgtpnmna7zf0ne7cl7
JWT_EXPIRES_IN=1h

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@host:5433/postgres

# CORS (Important for frontend)
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online,https://agritech-api.thebzlab.online

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### In Dokploy UI

1. Navigate to your agritech-api application
2. Go to "Environment Variables"
3. Add each variable above
4. **IMPORTANT**: Make sure `TRAEFIK_HOST` is set correctly

---

## Step 2: Docker Compose Configuration

The `docker-compose.yml` is already configured correctly:

### Key Points:

1. **Port Configuration**:
   ```yaml
   expose:
     - "3001"  # Internal only, no host binding
   ```

2. **Traefik Labels**:
   ```yaml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.agritech-api.rule=Host(`${TRAEFIK_HOST}`)"
     - "traefik.http.services.agritech-api.loadbalancer.server.port=3001"
   ```

3. **Health Check** (FIXED):
   ```yaml
   healthcheck:
     test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
   ```
   ⚠️ **Note**: Health check uses `/api/v1/health` (not `/health`)

4. **Network**:
   ```yaml
   networks:
     - agritech-network

   networks:
     agritech-network:
       external: true
       name: dokploy-network
   ```

---

## Step 3: Deploy

### Option A: Via Dokploy UI

1. Push your code to Git repository
2. In Dokploy, create a new application
3. Connect to your Git repository
4. Select `agritech-api` directory
5. Set environment variables (Step 1)
6. Click "Deploy"

### Option B: Via Docker Compose

```bash
cd agritech-api
docker compose down
docker compose up -d --build
```

### Verify Deployment

Check container status:
```bash
docker ps | grep agritech-api
```

Check logs:
```bash
docker logs agritech-api
```

Should see:
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🌾 AgriTech API Server                             ║
║                                                       ║
║   Server running on: http://localhost:3001           ║
║   API Docs: http://localhost:3001/api/docs           ║
║   Environment: production                            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

## Step 4: Verify Endpoints

### Health Check (via Traefik)

```bash
curl https://agritech-api.thebzlab.online/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:30:00.000Z",
  "uptime": 12345,
  "environment": "production"
}
```

### Root Endpoint

```bash
curl https://agritech-api.thebzlab.online/api/v1
```

**Expected Response:**
```json
{
  "message": "AgriTech API is running",
  "status": "healthy",
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

### Swagger Docs

Open in browser:
```
https://agritech-api.thebzlab.online/api/docs
```

Should see Swagger UI with all endpoints.

---

## Step 5: Test Signup Endpoint

```bash
curl -X POST https://agritech-api.thebzlab.online/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "firstName": "Test",
    "lastName": "User",
    "organizationName": "Test Farm"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User"
  },
  "organization": {
    "id": "uuid",
    "name": "Test Farm",
    "slug": "test-farm"
  },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600
  }
}
```

---

## Step 6: Cloudflare Tunnel (Optional)

If using Cloudflare Tunnel, configure it to route through Traefik:

### Current Setup (Direct to Container)
```yaml
ingress:
  - hostname: agritech-api.thebzlab.online
    service: http://localhost:3001  # ❌ Direct to container
```

### Recommended Setup (Via Traefik)
```yaml
ingress:
  - hostname: agritech-api.thebzlab.online
    service: http://localhost:80  # ✅ Via Traefik
```

**Why?**
- Traefik handles SSL termination
- Traefik manages load balancing
- Traefik provides centralized routing

**Update Command:**
```bash
cloudflared tunnel route dns agritech-api agritech-api.thebzlab.online
```

Then update your `config.yml`:
```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: agritech-api.thebzlab.online
    service: http://localhost:80
    originRequest:
      httpHostHeader: agritech-api.thebzlab.online
  - service: http_status:404
```

Restart tunnel:
```bash
sudo systemctl restart cloudflared
```

---

## Troubleshooting

### Issue 1: Health Check Failing

**Symptom**: Container keeps restarting

**Check**:
```bash
docker logs agritech-api
```

**Solution**:
- Verify health check path is `/api/v1/health`
- Check if API is actually running on port 3001
- Test manually:
  ```bash
  docker exec agritech-api curl http://localhost:3001/api/v1/health
  ```

### Issue 2: TRAEFIK_HOST Not Set

**Symptom**: Traefik can't find service

**Error in Traefik logs**:
```
Host() is not a valid rule
```

**Solution**:
```bash
# Set environment variable
export TRAEFIK_HOST=agritech-api.thebzlab.online

# Or add to .env file
echo "TRAEFIK_HOST=agritech-api.thebzlab.online" >> .env

# Redeploy
docker compose down && docker compose up -d
```

### Issue 3: CORS Errors

**Symptom**: Frontend can't call API

**Error in browser console**:
```
Access to fetch at 'https://agritech-api.thebzlab.online' has been blocked by CORS policy
```

**Solution**:
Update `CORS_ORIGIN` to include your frontend domain:
```bash
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online,https://agritech-api.thebzlab.online
```

### Issue 4: 404 Not Found

**Symptom**: All API calls return 404

**Possible Causes**:
1. API prefix misconfigured (should be `api/v1`)
2. Traefik routing wrong
3. Container not connected to dokploy-network

**Check**:
```bash
# Check if container is on correct network
docker inspect agritech-api | grep -A 10 Networks

# Should show:
# "dokploy-network": { ... }
```

**Solution**:
```bash
# Recreate with correct network
docker compose down
docker compose up -d
```

### Issue 5: Can't Connect to Supabase

**Symptom**: Database connection errors

**Check**:
```bash
# Test database connection
docker exec agritech-api node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.from('user_profiles').select('count').then(console.log);
"
```

**Solution**:
- Verify `SUPABASE_URL` is correct
- Verify `SUPABASE_ANON_KEY` is correct
- Check if Supabase is accessible from container network

---

## Monitoring

### View Logs
```bash
# Follow logs
docker logs -f agritech-api

# Last 100 lines
docker logs --tail 100 agritech-api

# With timestamps
docker logs -t agritech-api
```

### Check Resource Usage
```bash
docker stats agritech-api
```

### Check Health
```bash
docker inspect agritech-api | jq '.[0].State.Health'
```

---

## Updating

### Pull Latest Changes
```bash
git pull origin main
```

### Rebuild and Redeploy
```bash
cd agritech-api
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Zero-Downtime Update (with Dokploy)
```bash
# In Dokploy UI, click "Redeploy"
# OR
dokploy deploy agritech-api
```

---

## Security Checklist

- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` (not debug)
- [ ] Strong `JWT_SECRET` (32+ characters)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` kept secret
- [ ] CORS only allows trusted domains
- [ ] Rate limiting enabled
- [ ] Health check working
- [ ] HTTPS enabled (via Traefik/Cloudflare)
- [ ] Secrets not in Git (use .env, not committed)

---

## Performance Optimization

### 1. Enable Caching
```typescript
// In NestJS modules
@UseInterceptors(CacheInterceptor)
```

### 2. Connection Pooling
Already configured in Supabase client.

### 3. Rate Limiting
Already configured (100 requests/min per org).

### 4. Compression
Add to `main.ts`:
```typescript
import compression from 'compression';
app.use(compression());
```

---

## Backup Strategy

### Database Backups
Handled by Supabase (separate guide).

### Container Backups
```bash
# Backup container
docker commit agritech-api agritech-api-backup-$(date +%Y%m%d)

# List backups
docker images | grep agritech-api-backup
```

---

## References

- **Signup Migration**: [SIGNUP_MIGRATION.md](SIGNUP_MIGRATION.md)
- **API Endpoints**: [API_ENDPOINTS.md](API_ENDPOINTS.md)
- **Multi-Tenant Security**: [MULTI_TENANT_SECURITY.md](MULTI_TENANT_SECURITY.md)
- **Dokploy Docs**: https://docs.dokploy.com
- **Traefik Docs**: https://doc.traefik.io/traefik/

---

**Status**: ✅ Ready for Deployment

**Last Updated**: 2025-01-21

**Deployment URL**: https://agritech-api.thebzlab.online
