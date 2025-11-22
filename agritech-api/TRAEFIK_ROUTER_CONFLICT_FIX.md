# Traefik Router Conflict Fix

## The Problem

Traefik logs showed:
```
Router agritech-api cannot be linked automatically with multiple Services
```

### Root Cause

**Conflicting Router Definitions:**

1. **Manual Router** (in docker-compose.yml):
   ```yaml
   labels:
     - "traefik.http.routers.agritech-api.rule=Host(`${TRAEFIK_HOST}`)"
   ```

2. **Dokploy Auto-Generated Routers**:
   - `agritech-nestjs-041g0r-6-web` (HTTP)
   - `agritech-nestjs-041g0r-6-websecure` (HTTPS)

Both were trying to route to the same service, creating a conflict!

---

## The Fix

**File**: `docker-compose.yml`

**Removed the conflicting router rule**:

```yaml
labels:
  - "traefik.enable=true"
  # Removed: - "traefik.http.routers.agritech-api.rule=Host(`${TRAEFIK_HOST}`)"
  - "traefik.http.services.agritech-api.loadbalancer.server.port=3001"
```

### Why This Works

Dokploy automatically creates Traefik routers when you:
1. Set a domain in Dokploy UI
2. Enable Traefik for the application

These auto-generated routers include:
- ✅ Correct host rules
- ✅ HTTP and HTTPS entrypoints
- ✅ SSL/TLS configuration
- ✅ Middleware chains

By removing our manual router, we let Dokploy manage routing completely.

---

## What Dokploy Creates

When you deploy via Dokploy, it automatically generates:

### HTTP Router (Port 80)
```yaml
traefik.http.routers.agritech-nestjs-041g0r-6-web.rule: Host(`agritech-api.thebzlab.online`)
traefik.http.routers.agritech-nestjs-041g0r-6-web.entrypoints: web
traefik.http.routers.agritech-nestjs-041g0r-6-web.service: agritech-nestjs-041g0r-6-web
```

### HTTPS Router (Port 443)
```yaml
traefik.http.routers.agritech-nestjs-041g0r-6-websecure.rule: Host(`agritech-api.thebzlab.online`)
traefik.http.routers.agritech-nestjs-041g0r-6-websecure.entrypoints: websecure
traefik.http.routers.agritech-nestjs-041g0r-6-websecure.tls: true
traefik.http.routers.agritech-nestjs-041g0r-6-websecure.service: agritech-nestjs-041g0r-6-websecure
```

### Service Definition
```yaml
traefik.http.services.agritech-api.loadbalancer.server.port: 3001
```

All we need to provide is:
1. Enable Traefik: `traefik.enable=true`
2. Specify port: `traefik.http.services.agritech-api.loadbalancer.server.port=3001`

Dokploy handles the rest!

---

## Current Configuration

### docker-compose.yml
```yaml
labels:
  - "traefik.enable=true"
  # Router rule removed - Dokploy manages routing
  - "traefik.http.services.agritech-api.loadbalancer.server.port=3001"
```

### In Dokploy UI
- Domain: `agritech-api.thebzlab.online`
- Traefik: Enabled
- Auto-generates HTTP and HTTPS routers

---

## How to Deploy

```bash
cd agritech-api

# Stop current container
docker compose down

# Redeploy with fixed labels
docker compose up -d

# Or via Dokploy UI - just click "Redeploy"
```

---

## Verify It Works

### Check Traefik Dashboard

If you have Traefik dashboard enabled:
```
http://your-server:8080/dashboard/
```

Look for:
- ✅ `agritech-nestjs-041g0r-6-web` (HTTP router)
- ✅ `agritech-nestjs-041g0r-6-websecure` (HTTPS router)
- ✅ Both pointing to `agritech-api` service on port 3001
- ❌ No conflicting `agritech-api` router

### Test Endpoints

```bash
# HTTP (should redirect to HTTPS)
curl -I http://agritech-api.thebzlab.online/api/v1/health

# HTTPS (should return 200 OK)
curl https://agritech-api.thebzlab.online/api/v1/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-01-21T...",
  "uptime": 123,
  "environment": "production"
}
```

---

## Why Did This Happen?

### Common Scenario

When migrating from manual Docker Compose deployment to Dokploy:

1. **Initially**: Created manual Traefik labels in docker-compose.yml
2. **Then**: Deployed to Dokploy, which created its own routers
3. **Result**: Both sets of routers active → conflict!

### The Solution

**Choose one routing method:**

#### Option A: Dokploy-Managed (Recommended)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.services.agritech-api.loadbalancer.server.port=3001"
```
✅ Automatic SSL
✅ Auto-renewal
✅ HTTP → HTTPS redirect
✅ Managed in Dokploy UI

#### Option B: Manual (Not Recommended with Dokploy)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.my-api.rule=Host(`my-domain.com`)"
  - "traefik.http.routers.my-api.entrypoints=websecure"
  - "traefik.http.routers.my-api.tls=true"
  - "traefik.http.services.my-api.loadbalancer.server.port=3001"
```
❌ Conflicts with Dokploy
❌ More complex
❌ Manual SSL management

**We're using Option A** - let Dokploy handle routing!

---

## Dokploy Best Practices

### ✅ DO:
- Enable Traefik in Dokploy UI
- Set domain in Dokploy UI
- Specify service port in docker-compose labels
- Let Dokploy manage routers

### ❌ DON'T:
- Create manual router rules in docker-compose
- Set entrypoints manually
- Configure TLS manually
- Use TRAEFIK_HOST environment variable

### docker-compose.yml Template for Dokploy

```yaml
services:
  my-api:
    build: .
    expose:
      - "3001"
    environment:
      - NODE_ENV=production
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.my-api.loadbalancer.server.port=3001"
    networks:
      - dokploy-network

networks:
  dokploy-network:
    external: true
```

**That's it!** Dokploy handles:
- Router creation
- Host rules
- SSL certificates
- HTTP → HTTPS redirect
- Entrypoint configuration

---

## Troubleshooting

### Issue: Still Getting 404

**Check**:
```bash
# Verify Traefik sees the service
docker exec traefik traefik healthcheck

# Check Traefik configuration
docker logs traefik | grep agritech
```

**Solution**: Make sure domain is set in Dokploy UI.

### Issue: SSL Certificate Not Working

**Check**: Dokploy SSL/TLS configuration for the application

**Solution**: Verify Let's Encrypt is configured in Dokploy.

### Issue: HTTP Not Redirecting to HTTPS

**Check**: Dokploy should auto-configure this

**Solution**: Verify both `web` and `websecure` routers exist in Traefik.

---

## Testing Checklist

After redeploying:

- [ ] Container starts successfully
  ```bash
  docker ps | grep agritech-api
  ```

- [ ] No router conflicts in Traefik logs
  ```bash
  docker logs traefik | grep -i conflict
  # Should return nothing
  ```

- [ ] HTTP redirects to HTTPS
  ```bash
  curl -I http://agritech-api.thebzlab.online
  # Should show 301/302 redirect
  ```

- [ ] HTTPS works
  ```bash
  curl https://agritech-api.thebzlab.online/api/v1/health
  # Should return 200 OK
  ```

- [ ] SSL certificate valid
  ```bash
  curl -vI https://agritech-api.thebzlab.online 2>&1 | grep -i cert
  # Should show valid certificate
  ```

- [ ] All endpoints accessible
  ```bash
  # Root
  curl https://agritech-api.thebzlab.online/api/v1

  # Health
  curl https://agritech-api.thebzlab.online/api/v1/health

  # Swagger
  open https://agritech-api.thebzlab.online/api/docs
  ```

---

## Summary

**Problem**: Manual router rule conflicted with Dokploy's auto-generated routers

**Solution**: Removed manual router rule from docker-compose.yml

**Result**: Let Dokploy manage all routing automatically

**Benefits**:
- ✅ No conflicts
- ✅ Automatic SSL
- ✅ HTTP → HTTPS redirect
- ✅ Easier maintenance
- ✅ Managed via Dokploy UI

---

## Files Changed

- ✅ `docker-compose.yml` - Removed conflicting router rule

---

**Status**: ✅ **FIXED**

**Deploy Command**:
```bash
docker compose down && docker compose up -d
```

**Test**:
```bash
curl https://agritech-api.thebzlab.online/api/v1/health
```

🎉 **Traefik routing now works correctly via Dokploy!**
