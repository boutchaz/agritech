# Satellite Indices Service - Deployment Instructions

## Quick Deploy with Dokploy

### 1. Prerequisites
Make sure you have:
- Docker and Docker Compose installed
- Access to the Dokploy server
- The `dokploy-network` created

### 2. Deploy Steps

```bash
# 1. SSH into your server
ssh your-server

# 2. Clone or update the repository
git clone <your-repo> agritech
cd agritech/satellite-indices-service

# 3. Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your actual credentials
nano .env

# 4. Make sure dokploy-network exists
docker network create dokploy-network 2>/dev/null || true

# 5. Build and deploy
docker-compose build
docker-compose up -d

# 6. Check if container is running
docker ps | grep satellite-indices-service

# 7. Check logs
docker logs satellite-indices-service

# 8. Test the health endpoint internally
docker exec satellite-indices-service curl http://localhost:8000/api/health
```

### 3. Verify Deployment

The service should be accessible at:
- **HTTPS**: https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me
- **Health Check**: https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me/api/health

### 4. Troubleshooting

#### If HTTPS is not working:

1. **Check if Traefik is running:**
```bash
docker ps | grep traefik
```

2. **Check container logs:**
```bash
docker logs satellite-indices-service
```

3. **Verify labels are applied:**
```bash
docker inspect satellite-indices-service | grep -A 20 Labels
```

4. **Test without HTTPS first:**
```bash
# Port forward to test locally
docker run --rm -it --network dokploy-network curlimages/curl \
  curl http://satellite-indices-service:8000/api/health
```

5. **Check DNS resolution:**
```bash
nslookup agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me
```

6. **Restart the container:**
```bash
docker-compose restart
```

7. **Check Traefik logs (if you have access):**
```bash
docker logs traefik 2>&1 | grep -i satellite
```

### 5. Alternative: Direct Port Access

If HTTPS through Traefik is not working, you can temporarily access the service directly:

```bash
# In docker-compose.yml, ensure ports are exposed:
ports:
  - "8000:8000"

# Then access via:
http://your-server-ip:8000/api/health
```

### 6. Required Environment Variables

```env
# Google Earth Engine
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY={"type":"service_account",...}
GEE_PROJECT_ID=your-project-id

# Optional (with defaults)
GOOGLE_API_KEY=AIzaSyDSsY61Uj4QEgrJU9d0xKpq401-vGU8VbI
SUPABASE_URL=https://agritech-supabase-652186-5-75-154-125.traefik.me
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker logs satellite-indices-service` |
| Network not found | Create it: `docker network create dokploy-network` |
| Port already in use | Change port in docker-compose.yml or stop conflicting service |
| HTTPS certificate error | Wait for Let's Encrypt to issue cert (can take a few minutes) |
| 502 Bad Gateway | Service is starting up, wait 30 seconds and retry |
| DNS not resolving | Check domain configuration in your DNS provider |

### 8. Update Deployment

To update the service:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d --force-recreate

# Check status
docker ps | grep satellite
docker logs satellite-indices-service --tail 50
```

### 9. Clean Deployment (Full Reset)

If you need to start fresh:

```bash
# Stop and remove container
docker-compose down

# Remove old image
docker rmi satellite-indices-service:latest

# Clean build and restart
docker-compose build --no-cache
docker-compose up -d

# Follow logs
docker-compose logs -f
```

### 10. Verify API Endpoints

Once deployed, test these endpoints:

```bash
# Health check
curl https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me/api/health

# API documentation (if enabled)
curl https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me/docs
```

## Contact

If issues persist, check:
1. Dokploy dashboard for service status
2. Traefik dashboard for routing configuration
3. Container logs for application errors