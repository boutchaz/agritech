# ✅ NestJS API Ready for Deployment

## Summary

Fixed all deployment issues and the NestJS API is now ready to deploy to Dokploy with Traefik routing!

---

## What Was Fixed

### 1. ✅ Added TRAEFIK_HOST Environment Variable

**File**: `agritech-api/.env`

```bash
TRAEFIK_HOST=agritech-api.thebzlab.online
```

This tells Traefik which domain to route to this service.

### 2. ✅ Fixed Health Check Path

**File**: `agritech-api/docker-compose.yml`

**Before** (Wrong):
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', ...)"]
```

**After** (Correct):
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health', ...)"]
```

The API uses a global prefix `/api/v1`, so the health endpoint is at `/api/v1/health`, not `/health`.

### 3. ✅ Updated CORS_ORIGIN

**File**: `agritech-api/.env`

```bash
CORS_ORIGIN=http://localhost:5173,http://localhost:3001,http://agritech-supabase-97b49f-196-75-242-33.traefik.me,https://agritech-dashboard.thebzlab.online,https://agritech-api.thebzlab.online
```

Added production domains to allow frontend to call API without CORS errors.

### 4. ✅ Created Production Environment Example

**File**: `agritech-api/.env.production.example`

Template for production environment variables.

### 5. ✅ Created Deployment Documentation

- **[DEPLOYMENT_GUIDE.md](agritech-api/DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[DEPLOYMENT_CHECKLIST.md](agritech-api/DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist

---

## Quick Deploy Steps

### Step 1: Set Environment Variables in Dokploy

In Dokploy UI, add these variables:

```bash
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
TRAEFIK_HOST=agritech-api.thebzlab.online  # ⚠️ CRITICAL!
SUPABASE_URL=https://dokploy.thebzlab.online
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=xt01wec6p0wfiuqgtpnmna7zf0ne7cl7
JWT_EXPIRES_IN=1h
DATABASE_URL=postgresql://postgres:password@host:5433/postgres
CORS_ORIGIN=https://agritech-dashboard.thebzlab.online,https://agritech-api.thebzlab.online
LOG_LEVEL=info
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Step 2: Deploy

In Dokploy UI:
1. Create new application: "agritech-api"
2. Connect Git repository
3. Select directory: `agritech-api`
4. Click "Deploy"

Or via Docker:
```bash
cd agritech-api
docker compose down
docker compose up -d --build
```

### Step 3: Verify

```bash
# Health check
curl https://agritech-api.thebzlab.online/api/v1/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:30:00.000Z",
  "uptime": 12345,
  "environment": "production"
}

# Swagger UI
open https://agritech-api.thebzlab.online/api/docs
```

---

## API Endpoints

### Base URL
```
https://agritech-api.thebzlab.online/api/v1
```

### Key Endpoints

#### Health Check
```bash
GET /api/v1/health
```

#### Signup
```bash
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "My Farm"
}
```

#### Get Profile
```bash
GET /api/v1/auth/me
Authorization: Bearer {token}
```

#### Generate Invoice Number
```bash
POST /api/v1/sequences/invoice
Authorization: Bearer {token}
X-Organization-Id: {org-uuid}
```

**Full API Reference**: [API_ENDPOINTS.md](agritech-api/API_ENDPOINTS.md)

---

## Docker Configuration

### docker-compose.yml (Verified)

```yaml
services:
  agritech-api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: agritech-api
    expose:
      - "3001"  # Internal only
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=3001
      # ... other env vars ...
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.agritech-api.rule=Host(`${TRAEFIK_HOST}`)"
      - "traefik.http.services.agritech-api.loadbalancer.server.port=3001"
    networks:
      - agritech-network

networks:
  agritech-network:
    external: true
    name: dokploy-network
```

---

## Frontend Integration

Update frontend environment variables:

```bash
# project/.env
VITE_API_URL=https://agritech-api.thebzlab.online
```

The signup page is already configured to use this:

```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const response = await fetch(`${apiUrl}/api/v1/auth/signup`, {
  method: 'POST',
  // ...
})
```

---

## Cloudflare Tunnel (Optional)

If using Cloudflare Tunnel, update to route through Traefik:

### Current (Direct to Container)
```yaml
ingress:
  - hostname: agritech-api.thebzlab.online
    service: http://localhost:3001  # ❌ Bypass Traefik
```

### Recommended (Via Traefik)
```yaml
ingress:
  - hostname: agritech-api.thebzlab.online
    service: http://localhost:80  # ✅ Via Traefik
    originRequest:
      httpHostHeader: agritech-api.thebzlab.online
```

**Why?**
- Traefik handles SSL termination
- Traefik provides load balancing
- Centralized routing for all services

---

## Troubleshooting

### Issue 1: Container Won't Start

```bash
docker logs agritech-api
```

**Common causes:**
- Missing `TRAEFIK_HOST` → Add to environment variables
- Database connection failed → Check `SUPABASE_URL`
- Missing `JWT_SECRET` → Add to environment variables

### Issue 2: Health Check Failing

```bash
# Test manually
docker exec agritech-api curl http://localhost:3001/api/v1/health
```

**If 404**: Health check path is wrong (should be `/api/v1/health`)

### Issue 3: Traefik Can't Route

```bash
# Check Traefik logs
docker logs traefik

# Verify TRAEFIK_HOST
docker inspect agritech-api | grep TRAEFIK_HOST
```

**Solution**: Set `TRAEFIK_HOST=agritech-api.thebzlab.online`

### Issue 4: CORS Errors

```bash
# Check CORS_ORIGIN includes frontend domain
docker inspect agritech-api | grep CORS_ORIGIN
```

**Should include**: `https://agritech-dashboard.thebzlab.online`

---

## Testing Checklist

After deployment, verify:

- [ ] Health endpoint returns 200 OK
  ```bash
  curl https://agritech-api.thebzlab.online/api/v1/health
  ```

- [ ] Swagger UI accessible
  ```
  https://agritech-api.thebzlab.online/api/docs
  ```

- [ ] Signup creates user + organization
  ```bash
  curl -X POST https://agritech-api.thebzlab.online/api/v1/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User","organizationName":"Test Farm"}'
  ```

- [ ] Frontend can call API (no CORS errors)

- [ ] Container stays healthy for 24 hours

---

## Files Changed

### Updated
- ✅ `agritech-api/.env` - Added TRAEFIK_HOST, updated CORS_ORIGIN
- ✅ `agritech-api/docker-compose.yml` - Fixed health check path

### Created
- ✅ `agritech-api/.env.production.example` - Production environment template
- ✅ `agritech-api/DEPLOYMENT_GUIDE.md` - Complete deployment guide
- ✅ `agritech-api/DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- ✅ `DEPLOYMENT_READY.md` - This file

---

## Related Documentation

### Deployment
- **[DEPLOYMENT_GUIDE.md](agritech-api/DEPLOYMENT_GUIDE.md)** - Full guide with troubleshooting
- **[DEPLOYMENT_CHECKLIST.md](agritech-api/DEPLOYMENT_CHECKLIST.md)** - Quick checklist

### API
- **[API_ENDPOINTS.md](agritech-api/API_ENDPOINTS.md)** - Complete API reference
- **[SIGNUP_MIGRATION.md](agritech-api/SIGNUP_MIGRATION.md)** - Signup migration details
- **[MULTI_TENANT_SECURITY.md](agritech-api/MULTI_TENANT_SECURITY.md)** - Security architecture

### Frontend
- **[SIGNUP_LOADING_FIX.md](SIGNUP_LOADING_FIX.md)** - Frontend signup loading fix
- **[REGISTER_CLEANUP.md](REGISTER_CLEANUP.md)** - Register page cleanup

---

## What's Next

### 1. Deploy to Dokploy
Follow the steps above or use the [DEPLOYMENT_CHECKLIST.md](agritech-api/DEPLOYMENT_CHECKLIST.md)

### 2. Update Frontend
```bash
# project/.env
VITE_API_URL=https://agritech-api.thebzlab.online
```

### 3. Test End-to-End
- Signup from frontend
- Verify organization created
- Test other endpoints

### 4. Monitor
- Check logs: `docker logs -f agritech-api`
- Monitor resources: `docker stats agritech-api`
- Watch for errors

---

## Success Criteria

✅ **Deployment Successful If:**

1. ✅ Health endpoint returns 200 OK
2. ✅ Swagger UI accessible
3. ✅ Signup works (creates user + org + session)
4. ✅ No CORS errors from frontend
5. ✅ Container stays healthy
6. ✅ Response times < 500ms
7. ✅ No critical errors in logs

---

**Status**: ✅ **READY TO DEPLOY**

**Last Updated**: 2025-01-21

**Deployment URL**: https://agritech-api.thebzlab.online

🚀 **Everything is configured and ready - you can now deploy!**

---

## Quick Command Reference

```bash
# Deploy
docker compose up -d --build

# Check status
docker ps | grep agritech-api

# View logs
docker logs -f agritech-api

# Test health
curl https://agritech-api.thebzlab.online/api/v1/health

# Test signup
curl -X POST https://agritech-api.thebzlab.online/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User","organizationName":"Test Farm"}'

# View Swagger
open https://agritech-api.thebzlab.online/api/docs
```
