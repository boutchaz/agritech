# Route Debugging Guide

## Enhanced Logging Added

I've added comprehensive logging to `main.ts` to help debug the 404 issues.

### What Was Added

1. **Logger Import**: Added `Logger` from `@nestjs/common`
2. **Verbose Logging**: Enabled all log levels during bootstrap
3. **Route Information**: Logs all configured endpoints on startup
4. **Test Command**: Shows example curl command in startup banner

---

## Deploy with Enhanced Logging

```bash
cd agritech-api
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Check Logs for Route Information

```bash
docker logs agritech-api
```

### Expected Output

```
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap] Global prefix set to: api/v1
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap] Swagger docs available at /api/docs
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap] Application is running on: http://[::]:3001

╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🌾 AgriTech API Server                             ║
║                                                       ║
║   Server running on: http://0.0.0.0:3001             ║
║   API Docs: http://0.0.0.0:3001/api/docs             ║
║   Environment: production                            ║
║   Global Prefix: /api/v1                             ║
║                                                       ║
║   Try: curl http://localhost:3001/api/v1/health      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]
📋 Available Endpoints:
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]    GET  /api/v1
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]    GET  /api/v1/health
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]    POST /api/v1/auth/signup
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]    GET  /api/v1/auth/me
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]    POST /api/v1/sequences/invoice
[Nest] 1  - 01/21/2025, 10:30:00 AM     LOG [Bootstrap]    GET  /api/docs (Swagger UI)
```

---

## Troubleshooting Steps

### Step 1: Verify Container is Running

```bash
docker ps | grep agritech-api
```

Should show container in "healthy" state.

### Step 2: Check Startup Logs

```bash
docker logs agritech-api
```

Look for:
- ✅ `Global prefix set to: api/v1`
- ✅ `Application is running on: http://[::]:3001`
- ✅ List of available endpoints
- ❌ Any ERROR or WARN messages

### Step 3: Test from Inside Container

```bash
# Test health endpoint
docker exec agritech-api curl -s http://localhost:3001/api/v1/health

# Test root endpoint
docker exec agritech-api curl -s http://localhost:3001/api/v1

# Test without prefix (should 404)
docker exec agritech-api curl -s http://localhost:3001/health
```

### Step 4: Check if Port is Listening

```bash
docker exec agritech-api netstat -tulpn | grep 3001
```

Should show:
```
tcp        0      0 0.0.0.0:3001            0.0.0.0:*               LISTEN      1/node
```

### Step 5: Test via Traefik

```bash
curl -v https://agritech-api.thebzlab.online/api/v1/health
```

Check response headers and status code.

---

## Common Issues and Solutions

### Issue 1: Routes Not Showing in Logs

**Symptoms**: Startup banner appears but no endpoint list

**Possible Causes**:
1. Controllers not imported in modules
2. Modules not imported in AppModule
3. Build error during startup

**Solution**:
```bash
# Check if all modules are imported
cat src/app.module.ts | grep -A 20 "imports:"

# Rebuild from scratch
docker compose build --no-cache
```

### Issue 2: Wrong Global Prefix

**Symptoms**: Logs show different prefix than expected

**Check**:
```bash
# Verify environment variable
docker exec agritech-api printenv API_PREFIX

# Should show: api/v1
```

**Fix**:
```bash
# Update .env file
echo "API_PREFIX=api/v1" >> .env

# Redeploy
docker compose down && docker compose up -d
```

### Issue 3: Module Import Errors

**Symptoms**: App crashes on startup with module errors

**Check Logs**:
```bash
docker logs agritech-api 2>&1 | grep -i error
```

**Common Errors**:
- `Cannot find module` → Missing dependency
- `Unexpected token` → TypeScript compilation error
- `Circular dependency` → Import cycle in modules

**Solution**:
```bash
# Reinstall dependencies
docker compose build --no-cache

# Check for circular dependencies
npm run build
```

### Issue 4: Database Connection Issues

**Symptoms**: App starts but crashes when accessing endpoints

**Check**:
```bash
# Test database connection
docker exec agritech-api node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
client.from('user_profiles').select('count').then(console.log).catch(console.error);
"
```

**Fix**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct.

---

## Debug Commands

### Show All Environment Variables
```bash
docker exec agritech-api printenv | sort
```

### Show Node Version
```bash
docker exec agritech-api node --version
```

### Show Installed Packages
```bash
docker exec agritech-api npm list --depth=0
```

### Test HTTP Server Directly
```bash
docker exec agritech-api node -e "
const http = require('http');
http.get('http://localhost:3001/api/v1/health', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', chunk => console.log(chunk.toString()));
});
"
```

### Check File System
```bash
# Verify dist folder exists
docker exec agritech-api ls -la dist/

# Check main.js was built
docker exec agritech-api ls -la dist/main.js

# Verify controllers exist
docker exec agritech-api ls -la dist/modules/auth/
```

---

## What to Report

If issues persist, gather this information:

### 1. Container Logs
```bash
docker logs agritech-api > agritech-api-logs.txt
```

### 2. Container Inspection
```bash
docker inspect agritech-api > agritech-api-inspect.json
```

### 3. Network Test
```bash
docker exec agritech-api curl -v http://localhost:3001/api/v1/health 2>&1 > health-check-output.txt
```

### 4. Environment Variables
```bash
docker exec agritech-api printenv | grep -E "(API_|SUPABASE_|JWT_|PORT|NODE_ENV)" > env-vars.txt
```

### 5. Build Logs
```bash
docker compose build --no-cache 2>&1 > build-logs.txt
```

---

## Verifying the Fix

Once deployed with enhanced logging, you should see:

### ✅ Success Indicators

1. **Startup Logs** show:
   ```
   Global prefix set to: api/v1
   Application is running on: http://[::]:3001
   📋 Available Endpoints: [list of routes]
   ```

2. **Health Check Works**:
   ```bash
   curl http://localhost:3001/api/v1/health
   # Returns: {"status":"healthy",...}
   ```

3. **Swagger UI Loads**:
   ```
   https://agritech-api.thebzlab.online/api/docs
   # Shows Swagger interface
   ```

4. **All Endpoints Listed**:
   ```
   GET  /api/v1
   GET  /api/v1/health
   POST /api/v1/auth/signup
   GET  /api/v1/auth/me
   POST /api/v1/sequences/invoice
   ```

### ❌ Failure Indicators

1. **No endpoint list** in logs → Module import issue
2. **404 for all routes** → Global prefix mismatch
3. **Connection refused** → Not listening on 0.0.0.0
4. **Module not found** → Build/dependency issue

---

## Next Steps Based on Logs

### If Logs Show Routes But Still 404

**Problem**: Routes registered but not accessible

**Check**:
1. Global guard blocking requests
2. Middleware rejecting requests
3. CORS blocking requests
4. Traefik routing issue

### If Logs Don't Show Routes

**Problem**: Routes not being registered

**Check**:
1. Controllers not in module
2. Module not in AppModule
3. Build error during compilation
4. Import path issues

### If App Doesn't Start

**Problem**: Startup failure

**Check**:
1. Database connection
2. Environment variables
3. Missing dependencies
4. Port already in use

---

## Summary

The enhanced logging will help identify:

1. ✅ Which routes are being registered
2. ✅ What global prefix is being used
3. ✅ If the app is actually starting correctly
4. ✅ Sample commands to test endpoints

After redeploying with this logging, check the container logs first to see what routes are registered and whether the prefix is correct.

---

**Deploy and check logs:**

```bash
cd agritech-api
docker compose down && docker compose build --no-cache && docker compose up -d
docker logs -f agritech-api
```

Look for the endpoint list in the logs - this will tell us exactly what's registered and what might be wrong!
