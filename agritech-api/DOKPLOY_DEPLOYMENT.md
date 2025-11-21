# Dokploy Deployment Guide

Complete guide to deploy the AgriTech NestJS API on Dokploy.

---

## 🚀 Quick Deploy

### Step 1: Create New Application in Dokploy

1. Log into Dokploy dashboard
2. Click **"Create Application"**
3. Select **"Docker Compose"**
4. Name: `agritech-nestjs` (or your choice)
5. Repository: Point to your Git repo containing `agritech-api/`

### Step 2: Configure Environment Variables

In Dokploy, add these environment variables:

```env
# Application
NODE_ENV=production
API_PREFIX=api/v1

# Supabase (Self-hosted)
SUPABASE_URL=http://agritech-supabase-97b49f-196-75-242-33.traefik.me
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.B5XItiUtzrorL_VD1jphx6q2COYPPKqw6hjtMQ65g4M

# JWT (Use Supabase JWT Secret)
JWT_SECRET=xt01wec6p0wfiuqgtpnmna7zf0ne7cl7
JWT_EXPIRES_IN=1h

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:5z5cmtp5mofn6oldkwssn26yeyzt2mnv@agritech-supabase-97b49f-196-75-242-33.traefik.me:5433/postgres

# CORS (Update with your frontend domains)
CORS_ORIGIN=https://your-frontend-domain.com,http://agritech-supabase-97b49f-196-75-242-33.traefik.me

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Traefik (Dokploy will generate this)
TRAEFIK_HOST=agritech-api-your-random-id.traefik.me
```

### Step 3: Configure Domain/Routing

In Dokploy:
1. Go to **Domains** tab
2. Dokploy will auto-generate: `agritech-api-xxxxx.traefik.me`
3. Or add your custom domain: `api.yourdomain.com`

### Step 4: Deploy

1. Click **"Deploy"** button
2. Watch build logs
3. Wait for health check to pass
4. Access your API at the generated domain

---

## 🔧 Docker Compose Configuration

The `docker-compose.yml` is configured for Dokploy:

```yaml
services:
  agritech-api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: agritech-api
    expose:
      - "3001"  # Internal only, not exposed to host
    environment:
      # Environment variables from Dokploy
    labels:
      # Traefik routing (Dokploy manages this)
      - "traefik.enable=true"
      - "traefik.http.routers.agritech-api.rule=Host(`${TRAEFIK_HOST}`)"
      - "traefik.http.services.agritech-api.loadbalancer.server.port=3001"
    networks:
      - dokploy-network  # Dokploy's network

networks:
  agritech-network:
    external: true
    name: dokploy-network
```

**Key differences from standalone:**
- ✅ Uses `expose` instead of `ports` (no port binding conflicts)
- ✅ Connects to `dokploy-network` (Traefik routing)
- ✅ Traefik labels for automatic routing
- ✅ No version specified (Docker Compose v2+)

---

## 🌐 Networking

### How It Works

```
Internet
    ↓
Traefik (Port 80/443)
    ↓
agritech-api-xxxxx.traefik.me
    ↓
Docker Network: dokploy-network
    ↓
Container: agritech-api (Port 3001)
    ↓
NestJS API
```

### No Port Conflicts

- Container exposes port `3001` internally
- Traefik routes external traffic
- No binding to host port 3001
- Multiple services can use same internal port

---

## ✅ Health Checks

The API includes health checks for Dokploy monitoring:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 10s
```

**Dokploy will:**
- Monitor container health
- Show status in dashboard
- Auto-restart if unhealthy
- Alert on failures

---

## 🔐 CORS Configuration

**Important:** Update `CORS_ORIGIN` with your actual domains:

```env
# Development
CORS_ORIGIN=http://localhost:5173,http://agritech-supabase-97b49f-196-75-242-33.traefik.me

# Production
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com,http://agritech-supabase-97b49f-196-75-242-33.traefik.me
```

**Format:** Comma-separated list, no spaces

---

## 📊 Monitoring & Logs

### View Logs in Dokploy

1. Go to your application
2. Click **"Logs"** tab
3. Real-time log streaming
4. Filter by severity

### Health Check Endpoint

```bash
curl https://agritech-api-xxxxx.traefik.me/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-21T17:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

## 🔄 Updates & Redeployment

### Manual Redeploy

1. Push changes to Git
2. In Dokploy, click **"Redeploy"**
3. Watch build logs
4. Zero-downtime deployment

### Automatic Deployments

Enable webhooks in Dokploy:
1. Go to **Settings** → **Webhooks**
2. Copy webhook URL
3. Add to GitHub/GitLab
4. Auto-deploy on push to main

---

## 🛠️ Troubleshooting

### Port Already Allocated Error

**Cause:** Using `ports` instead of `expose`

**Solution:** ✅ Already fixed in docker-compose.yml
```yaml
# ❌ Don't use this with Dokploy
ports:
  - "3001:3001"

# ✅ Use this instead
expose:
  - "3001"
```

### Container Won't Start

**Check logs in Dokploy:**
1. Go to application
2. Click "Logs"
3. Look for errors

**Common issues:**
- Missing environment variables
- Database connection failed
- Invalid JWT secret

### Can't Access API

**Check Traefik routing:**
```bash
# Test health endpoint
curl https://your-api-domain.traefik.me/health

# Should return 200 OK
```

**Verify:**
- Domain is configured in Dokploy
- Traefik labels are correct
- Container is healthy
- Network is `dokploy-network`

### Database Connection Issues

**Test from container:**
```bash
# In Dokploy terminal
docker exec -it agritech-api sh

# Test database
node -e "console.log(process.env.DATABASE_URL)"
```

**Verify:**
- Database URL is correct
- Port 5433 is accessible
- Password is correct
- Supabase is running

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Update `CORS_ORIGIN` with production domains
- [ ] Set `NODE_ENV=production`
- [ ] Set `LOG_LEVEL=info` (not debug)
- [ ] Verify JWT_SECRET is secure
- [ ] Check database credentials
- [ ] Enable HTTPS (Traefik handles this)
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerts
- [ ] Review RLS policies in Supabase

---

## 📈 Scaling

### Horizontal Scaling

In Dokploy, increase replicas:
1. Go to application settings
2. Set **Replicas**: 2 or more
3. Traefik will load balance automatically

### Resource Limits

Configure in docker-compose.yml:
```yaml
services:
  agritech-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## 🧪 Testing Deployment

### Step 1: Test Health

```bash
curl https://your-api-domain.traefik.me/health
```

### Step 2: Test Authentication

```bash
# Get token from Supabase
TOKEN="your-supabase-jwt-token"

# Test auth endpoint
curl https://your-api-domain.traefik.me/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Test Business Logic

```bash
# Generate invoice number
curl -X POST https://your-api-domain.traefik.me/api/v1/sequences/invoice \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID"
```

---

## 📝 Environment Variables Checklist

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | Yes | `production` | Environment mode |
| `SUPABASE_URL` | Yes | `http://...` | Your Supabase URL |
| `SUPABASE_ANON_KEY` | Yes | `eyJ...` | Anon key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJ...` | Service key (secret!) |
| `JWT_SECRET` | Yes | `xt01...` | Must match Supabase |
| `DATABASE_URL` | No | `postgresql://...` | Optional, for direct DB |
| `CORS_ORIGIN` | Yes | `https://app.com` | Your frontend domains |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `TRAEFIK_HOST` | Yes | Auto-generated | Dokploy sets this |

---

## 🎯 Post-Deployment

After successful deployment:

1. **Update Frontend**: Point API calls to new domain
   ```typescript
   const API_BASE = 'https://agritech-api-xxxxx.traefik.me/api/v1';
   ```

2. **Test All Endpoints**: Use Swagger UI
   ```
   https://agritech-api-xxxxx.traefik.me/api/docs
   ```

3. **Monitor Logs**: Check for errors in Dokploy

4. **Set Up Alerts**: Configure Dokploy notifications

5. **Backup Strategy**: Regular database backups

---

## 🆘 Support

If deployment fails:

1. **Check Dokploy Logs**
   - Build logs
   - Container logs
   - Traefik logs

2. **Verify Configuration**
   - Environment variables set
   - docker-compose.yml correct
   - Network configuration

3. **Test Locally First**
   ```bash
   docker-compose up --build
   ```

4. **Check Dokploy Docs**
   - https://docs.dokploy.com

---

## ✅ Deployment Checklist

- [ ] Application created in Dokploy
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] Domain/routing configured
- [ ] Docker Compose validated
- [ ] Build successful
- [ ] Container started
- [ ] Health check passing
- [ ] API accessible via domain
- [ ] Authentication working
- [ ] CORS configured
- [ ] Monitoring enabled
- [ ] Logs visible
- [ ] Frontend updated with new API URL

---

**Status**: Ready to deploy with Dokploy! 🚀

**Network**: ✅ Configured for `dokploy-network`
**Ports**: ✅ No conflicts (using `expose`)
**Routing**: ✅ Traefik labels configured
**Health**: ✅ Health checks enabled
