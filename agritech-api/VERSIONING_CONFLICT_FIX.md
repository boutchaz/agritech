# API Versioning Conflict Fix

## The Problem

All endpoints were returning 404, including the health check. The issue was **double versioning** in main.ts:

### Conflicting Configuration

```typescript
// Line 34: Global prefix adds /api/v1
app.setGlobalPrefix('api/v1');

// Line 36-40: URI versioning adds /v1
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

### What Was Happening

With BOTH configurations enabled, routes were being created as:

```
Expected:  /api/v1/health
Actual:    /api/v1/v1/health  ❌
```

So when you tried to access `/api/v1/health`, it didn't exist - only `/api/v1/v1/health` existed!

---

## The Fix

**File**: `src/main.ts`

**Removed URI versioning** to avoid conflict with global prefix:

```typescript
// Set global prefix
const apiPrefix = configService.get('API_PREFIX', 'api/v1');
app.setGlobalPrefix(apiPrefix);

// Note: URI versioning disabled to avoid conflict with global prefix
// Routes will be: /api/v1/health, /api/v1/auth/signup, etc.
```

Also removed unused import:
```typescript
// Before
import { ValidationPipe, VersioningType } from '@nestjs/common';

// After
import { ValidationPipe } from '@nestjs/common';
```

---

## Why This Happened

NestJS has multiple ways to version APIs:

### Option 1: Global Prefix (What we're using)
```typescript
app.setGlobalPrefix('api/v1');
// Routes: /api/v1/health, /api/v1/auth/signup
```

### Option 2: URI Versioning
```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
// Routes: /v1/health, /v1/auth/signup
```

### Option 3: Both (WRONG! ❌)
```typescript
app.setGlobalPrefix('api/v1');
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
// Routes: /api/v1/v1/health ← DOUBLE PREFIX!
```

We were using **Option 3**, which caused the double prefix.

---

## The Solution

**Use only Global Prefix** (Option 1):

```typescript
app.setGlobalPrefix('api/v1');
// Routes: /api/v1/health, /api/v1/auth/signup ✅
```

This matches our health check configuration:
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health', ...)"]
```

---

## Routes Now Work As Expected

### Root Endpoint
```
GET /api/v1
→ Returns: { message: "AgriTech API is running", ... }
```

### Health Check
```
GET /api/v1/health
→ Returns: { status: "healthy", uptime: 123, ... }
```

### Swagger Docs
```
GET /api/docs
→ Shows Swagger UI (no prefix, as configured)
```

### Auth Endpoints
```
POST /api/v1/auth/signup
GET  /api/v1/auth/me
GET  /api/v1/auth/organizations
```

### Sequences Endpoints
```
POST /api/v1/sequences/invoice
POST /api/v1/sequences/quote
POST /api/v1/sequences/purchase-order
```

---

## Testing

After rebuilding, verify routes work:

### 1. Health Check
```bash
curl http://localhost:3001/api/v1/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-01-21T...",
  "uptime": 123,
  "environment": "production"
}
```

### 2. Root Endpoint
```bash
curl http://localhost:3001/api/v1

# Should return:
{
  "message": "AgriTech API is running",
  "status": "healthy",
  "timestamp": "2025-01-21T..."
}
```

### 3. Swagger UI
```bash
open http://localhost:3001/api/docs

# Should load Swagger interface
```

### 4. 404 Test (Verify old route doesn't work)
```bash
curl http://localhost:3001/api/v1/v1/health

# Should return: 404 Not Found (this is correct!)
```

---

## Rebuild and Deploy

```bash
cd agritech-api

# Rebuild with the fix
docker compose down
docker compose build --no-cache
docker compose up -d

# Check logs
docker logs agritech-api

# Should see:
# Server running on: http://0.0.0.0:3001
# (No errors about routes)

# Test health endpoint
curl http://localhost:3001/api/v1/health
# Should return 200 OK
```

---

## Why Use Global Prefix Instead of Versioning?

### Global Prefix (Simpler)
```typescript
app.setGlobalPrefix('api/v1');
```

**Pros:**
- ✅ Simple configuration
- ✅ All routes automatically prefixed
- ✅ Easy to understand
- ✅ Works with all controllers

**Cons:**
- ❌ Can't have different versions of same endpoint

### URI Versioning (More Complex)
```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

// In controllers:
@Controller({ version: '1' })  // v1 routes
@Controller({ version: '2' })  // v2 routes
```

**Pros:**
- ✅ Can run multiple API versions simultaneously
- ✅ Granular control per controller/endpoint

**Cons:**
- ❌ More complex setup
- ❌ Requires version decorators on controllers
- ❌ Can conflict with global prefix

### Our Choice

We're using **Global Prefix** because:
1. Simpler for single-version API
2. Matches our current architecture
3. Easier to maintain
4. No conflicts

If we need multiple versions later, we can:
- Use `/api/v1` and `/api/v2` as separate prefixes
- Or migrate to URI versioning (but remove global prefix)

---

## Common NestJS Routing Mistakes

### ❌ Mistake 1: Double Prefix
```typescript
app.setGlobalPrefix('api/v1');
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
// Creates: /api/v1/v1/health
```

### ❌ Mistake 2: Wrong Controller Path
```typescript
@Controller('api/v1/health')  // Don't hardcode prefix in controller
```

### ❌ Mistake 3: Wrong Swagger Setup
```typescript
SwaggerModule.setup('/api/v1/docs', app, document);  // Wrong - gets double prefix
```

### ✅ Correct Configuration
```typescript
// main.ts
app.setGlobalPrefix('api/v1');  // ← Prefix here

// app.controller.ts
@Controller()  // ← Empty (or just 'health')
export class AppController {
  @Get('health')  // ← Just the route
  getHealth() { ... }
}

// Result: /api/v1/health ✅
```

---

## Files Changed

- ✅ `src/main.ts` - Removed URI versioning, kept global prefix
- ✅ `src/main.ts` - Removed unused `VersioningType` import

---

## Summary

**Problem**: Double prefixing (`/api/v1/v1/health`) due to conflicting versioning strategies

**Solution**: Use only global prefix, remove URI versioning

**Result**: Clean routes (`/api/v1/health`) that match our configuration

**Deploy**:
```bash
docker compose down && docker compose build --no-cache && docker compose up -d
```

---

**Status**: ✅ **FIXED**

**Date**: 2025-01-21

🎉 **Routes now work correctly with single prefix!**
