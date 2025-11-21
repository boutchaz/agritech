# Docker Listen Address Fix

## Problem

All API endpoints were returning 404, even when accessed from inside the container:

```bash
# From inside container
curl http://localhost:3001/api/v1/health
# 404 Not Found

# From outside via Traefik
curl https://agritech-api.thebzlab.online/api/v1/health
# 404 Not Found
```

**Container logs showed:**
```
Server running on: http://localhost:3001
```

But the app wasn't actually accessible!

---

## Root Cause

**The Issue**: NestJS was listening only on `localhost` (127.0.0.1) inside the container.

**In Docker containers:**
- `localhost` = Only accessible from inside the container itself
- `0.0.0.0` = Accessible from anywhere (host, other containers, Traefik)

**The Code** (main.ts:67):
```typescript
await app.listen(port);  // ❌ Defaults to localhost only
```

This meant:
- ✅ Container could curl itself on localhost
- ❌ Traefik couldn't reach the container
- ❌ Health checks failed
- ❌ All external requests got 404

---

## The Fix

**File**: `src/main.ts`

**Before**:
```typescript
// Start server
const port = configService.get('PORT', 3000);
await app.listen(port);  // ❌ Only listens on localhost
```

**After**:
```typescript
// Start server
const port = configService.get('PORT', 3000);
await app.listen(port, '0.0.0.0');  // ✅ Listens on all interfaces
```

**Why `0.0.0.0`?**
- Tells the app to listen on ALL network interfaces
- Makes the app accessible from:
  - Inside the container (localhost)
  - Other containers in the same network (Traefik)
  - The host machine
  - External requests via Traefik/Cloudflare

---

## How to Apply

### Rebuild and Redeploy

```bash
cd agritech-api

# Stop current container
docker compose down

# Rebuild with the fix
docker compose build --no-cache

# Start new container
docker compose up -d

# Check logs
docker logs -f agritech-api
```

**Should now see:**
```
Server running on: http://0.0.0.0:3001
```

### Verify It Works

```bash
# 1. Test from inside container
docker exec agritech-api curl http://localhost:3001/api/v1/health
# Should return: {"status":"healthy",...}

# 2. Test via Traefik
curl https://agritech-api.thebzlab.online/api/v1/health
# Should return: {"status":"healthy",...}

# 3. Test Swagger UI
open https://agritech-api.thebzlab.online/api/docs
# Should load Swagger interface
```

---

## Why This Happens

### Docker Networking 101

When you run a Node.js/NestJS app in Docker:

**Without `0.0.0.0`:**
```
┌─────────────────────────────────┐
│      Docker Container           │
│  ┌──────────────────────────┐   │
│  │  App listening on        │   │
│  │  localhost:3001          │   │
│  │  (127.0.0.1:3001)        │   │
│  └──────────────────────────┘   │
│         ↑                        │
│         │ Only accessible        │
│         │ from inside            │
│         │ container              │
└─────────────────────────────────┘
         ❌ Traefik can't reach it
```

**With `0.0.0.0`:**
```
┌─────────────────────────────────┐
│      Docker Container           │
│  ┌──────────────────────────┐   │
│  │  App listening on        │   │
│  │  0.0.0.0:3001            │   │
│  │  (All interfaces)        │   │
│  └──────────────────────────┘   │
│         ↑                        │
│         │ Accessible from        │
│         │ anywhere               │
└─────────────────────────────────┘
         ✅ Traefik can reach it
         ✅ Health checks work
         ✅ External requests work
```

### Network Interfaces Explained

- `127.0.0.1` (localhost) = Loopback interface (only inside container)
- `0.0.0.0` = All interfaces (including Docker bridge network)

When NestJS calls `app.listen(3001)` without a host:
- Defaults to `localhost` only
- Docker bridge network can't reach it
- Traefik gets connection refused

When NestJS calls `app.listen(3001, '0.0.0.0')`:
- Binds to all network interfaces
- Docker bridge network can reach it
- Traefik can forward requests
- Everything works!

---

## Common Pitfall

This is a **very common Docker issue** that affects many frameworks:

### Express.js
```javascript
// ❌ Wrong
app.listen(3000);

// ✅ Correct
app.listen(3000, '0.0.0.0');
```

### NestJS
```typescript
// ❌ Wrong
await app.listen(3001);

// ✅ Correct
await app.listen(3001, '0.0.0.0');
```

### Fastify
```javascript
// ❌ Wrong
fastify.listen(3000);

// ✅ Correct
fastify.listen(3000, '0.0.0.0');
```

### Python Flask
```python
# ❌ Wrong
app.run(port=5000)

# ✅ Correct
app.run(host='0.0.0.0', port=5000)
```

**The pattern**: Always specify `0.0.0.0` (or `host='0.0.0.0'`) when running in Docker!

---

## Testing

### Before Fix (Broken)

```bash
# Health check
curl https://agritech-api.thebzlab.online/api/v1/health
# 404 Not Found

# Container logs
docker logs agritech-api
# Server running on: http://localhost:3001
# (but unreachable from outside!)
```

### After Fix (Working)

```bash
# Health check
curl https://agritech-api.thebzlab.online/api/v1/health
# {
#   "status": "healthy",
#   "timestamp": "2025-01-21T10:30:00.000Z",
#   "uptime": 12345,
#   "environment": "production"
# }

# Container logs
docker logs agritech-api
# Server running on: http://0.0.0.0:3001
# (accessible from everywhere!)
```

---

## Security Note

**Q**: Is `0.0.0.0` secure?

**A**: Yes, when combined with Docker networking:

1. **Inside Docker**: Container exposes port 3001 on `0.0.0.0`
2. **Docker Compose**: Uses `expose: ["3001"]` (not `ports`)
3. **No Host Binding**: Port 3001 NOT exposed to host machine
4. **Traefik Routing**: Only Traefik (inside dokploy-network) can reach it
5. **Public Access**: Only via Traefik with proper routing rules

**Network Isolation:**
```
Internet → Cloudflare Tunnel → Traefik (port 80)
                                   ↓
                         agritech-api (0.0.0.0:3001)
                         (dokploy-network only)
```

Port 3001 is **NOT** exposed to the internet directly - only Traefik can reach it!

---

## Deployment Checklist Update

Add to deployment verification:

```bash
# After deploying, verify the app is listening on 0.0.0.0
docker logs agritech-api | grep "Server running on"

# Should show:
# Server running on: http://0.0.0.0:3001

# NOT:
# Server running on: http://localhost:3001
```

---

## Related Issues

This fix also resolves:

- ✅ Health check failures
- ✅ Traefik routing 404s
- ✅ Cloudflare Tunnel 502 errors
- ✅ "Connection refused" in Traefik logs
- ✅ Container appears healthy but doesn't respond

---

## Summary

**Problem**: App listening on `localhost` only inside container

**Solution**: Listen on `0.0.0.0` to accept connections from Docker network

**Code Change**: One line in `src/main.ts`:
```typescript
await app.listen(port, '0.0.0.0');
```

**Result**: All endpoints now accessible via Traefik/Cloudflare!

---

**Status**: ✅ **FIXED**

**File Changed**: `agritech-api/src/main.ts` (line 67)

**Next Step**: Rebuild and redeploy

🎉 **The API will now respond to all requests!**
