# Deployment Checklist

Quick checklist for deploying the NestJS API to Dokploy.

---

## Pre-Deployment

- [ ] Code pushed to Git repository
- [ ] `.env` file configured (DON'T commit it!)
- [ ] `.env.production.example` reviewed
- [ ] `docker-compose.yml` verified
- [ ] Health check path updated to `/api/v1/health`

---

## Environment Variables (Dokploy UI)

Set these in Dokploy UI under "Environment Variables":

```bash
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
TRAEFIK_HOST=agritech-api.thebzlab.online  # ⚠️ IMPORTANT!
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

---

## Deployment Steps

### 1. In Dokploy UI

- [ ] Create new application: "agritech-api"
- [ ] Connect Git repository
- [ ] Select directory: `agritech-api`
- [ ] Add environment variables (above)
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~3-5 minutes)

### 2. Verify Deployment

```bash
# Check container status
docker ps | grep agritech-api

# Check logs
docker logs agritech-api --tail 50

# Test health endpoint
curl https://agritech-api.thebzlab.online/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:30:00.000Z",
  "uptime": 12345,
  "environment": "production"
}
```

---

## Post-Deployment Tests

### 1. Health Check
```bash
curl https://agritech-api.thebzlab.online/api/v1/health
```
- [ ] Returns 200 OK
- [ ] Response contains `"status": "healthy"`

### 2. Root Endpoint
```bash
curl https://agritech-api.thebzlab.online/api/v1
```
- [ ] Returns 200 OK
- [ ] Response contains `"message": "AgriTech API is running"`

### 3. Swagger UI
Open: https://agritech-api.thebzlab.online/api/docs
- [ ] Swagger UI loads
- [ ] All endpoints visible
- [ ] Can test endpoints

### 4. Signup Endpoint
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
- [ ] Returns 201 Created
- [ ] Response contains user, organization, and session

### 5. Frontend Integration
- [ ] Update frontend `VITE_API_URL=https://agritech-api.thebzlab.online`
- [ ] Test signup from frontend
- [ ] Verify no CORS errors
- [ ] Verify user can login after signup

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs agritech-api

# Common issues:
# 1. TRAEFIK_HOST not set → Add to env vars
# 2. Database connection failed → Check SUPABASE_URL
# 3. Missing JWT_SECRET → Add to env vars
```

### Health Check Failing

```bash
# Test health check manually
docker exec agritech-api curl http://localhost:3001/api/v1/health

# If 404: Health check path is wrong
# Should be: /api/v1/health (not /health)
```

### Traefik Can't Route

```bash
# Check Traefik logs
docker logs traefik

# Verify TRAEFIK_HOST is set
docker inspect agritech-api | grep TRAEFIK_HOST

# Should show: TRAEFIK_HOST=agritech-api.thebzlab.online
```

### CORS Errors

```bash
# Check CORS_ORIGIN includes your frontend domain
docker inspect agritech-api | grep CORS_ORIGIN

# Should include:
# https://agritech-dashboard.thebzlab.online
```

---

## Rollback Plan

If deployment fails:

### 1. Quick Rollback
```bash
# In Dokploy UI
# Click "Rollback to Previous Version"
```

### 2. Manual Rollback
```bash
# Find previous image
docker images | grep agritech-api

# Run previous version
docker stop agritech-api
docker run -d --name agritech-api-temp \
  --env-file .env \
  --network dokploy-network \
  agritech-api:previous-tag
```

---

## Monitoring

### Container Status
```bash
docker ps | grep agritech-api
docker stats agritech-api
```

### Logs
```bash
# Follow logs
docker logs -f agritech-api

# Last 100 lines
docker logs --tail 100 agritech-api
```

### Health
```bash
# Health status
docker inspect agritech-api | jq '.[0].State.Health'

# Should show: "Status": "healthy"
```

---

## Security Verification

- [ ] `NODE_ENV=production` (not development)
- [ ] `LOG_LEVEL=info` (not debug)
- [ ] Strong JWT_SECRET (32+ chars)
- [ ] CORS only allows trusted domains
- [ ] Service role key not exposed to frontend
- [ ] HTTPS enabled (via Traefik/Cloudflare)
- [ ] Rate limiting active (100 req/min)

---

## Performance Check

- [ ] Response time < 500ms
- [ ] Memory usage < 512MB
- [ ] CPU usage < 50%
- [ ] No memory leaks after 24h

```bash
# Monitor resources
docker stats agritech-api

# Should see:
# MEM USAGE < 512MB
# CPU % < 50%
```

---

## Cloudflare Tunnel (Optional)

If using Cloudflare Tunnel:

```yaml
# config.yml
ingress:
  - hostname: agritech-api.thebzlab.online
    service: http://localhost:80  # Via Traefik (not 3001!)
```

- [ ] Tunnel config updated
- [ ] Tunnel restarted
- [ ] DNS points to tunnel
- [ ] SSL certificate valid

---

## Success Criteria

✅ **Deployment Successful If:**

1. Health endpoint returns 200 OK
2. Swagger UI accessible
3. Signup creates user + organization
4. Frontend can call API without CORS errors
5. Container stays healthy for 24 hours
6. No critical errors in logs
7. Response times < 500ms
8. Memory usage stable

---

## Next Steps After Deployment

1. **Monitor for 24 hours**
   - Check logs regularly
   - Monitor resource usage
   - Watch for errors

2. **Test all endpoints**
   - Use Swagger UI
   - Test from frontend
   - Verify multi-tenant isolation

3. **Update frontend**
   - Change `VITE_API_URL`
   - Test signup flow
   - Test authenticated endpoints

4. **Documentation**
   - Update API documentation
   - Share Swagger URL with team
   - Document any issues encountered

---

## Support

**Issue?** Check:
1. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full deployment guide
2. Container logs: `docker logs agritech-api`
3. Traefik logs: `docker logs traefik`
4. Dokploy dashboard for errors

**Still Stuck?**
- Verify all environment variables set
- Check network connectivity (dokploy-network)
- Verify TRAEFIK_HOST is correct
- Test health endpoint directly: `curl localhost:3001/api/v1/health`

---

**Last Updated**: 2025-01-21

🚀 **Ready to deploy!**
