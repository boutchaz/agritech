# Satellite Indices Service - Dokploy Deployment Guide

## HTTPS Configuration with Dokploy & Traefik

This service is configured to work with Dokploy's Traefik reverse proxy for automatic HTTPS support.

### Domain Configuration

The service is configured to be accessible at:
- **HTTPS**: `https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me`
- **HTTP**: Automatically redirects to HTTPS

### Deployment Steps

1. **Ensure Dokploy Network Exists**
   ```bash
   docker network create dokploy-network
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Verify Deployment**
   ```bash
   # Check service health
   curl https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me/api/health

   # Check container logs
   docker-compose logs -f satellite-indices-service
   ```

### Features Configured

#### 1. **Automatic HTTPS with Let's Encrypt**
- Traefik automatically obtains and renews SSL certificates
- HTTP traffic is redirected to HTTPS

#### 2. **CORS Middleware**
- Configured to allow cross-origin requests
- Supports all HTTP methods and headers

#### 3. **Load Balancing**
- Service configured on port 8000
- Health checks every 30 seconds

#### 4. **Network Configuration**
- Connected to both `agritech-network` (internal) and `dokploy-network` (Traefik)
- External network ensures Traefik can route traffic

### Traefik Labels Explained

| Label | Purpose |
|-------|---------|
| `traefik.enable=true` | Enables Traefik discovery for this container |
| `traefik.docker.network=dokploy-network` | Specifies which network Traefik should use |
| `traefik.http.routers.satellite-https.tls=true` | Enables TLS/HTTPS |
| `traefik.http.routers.satellite-https.tls.certresolver=letsencrypt` | Uses Let's Encrypt for certificates |
| `traefik.http.middlewares.redirect-to-https` | Redirects HTTP to HTTPS |
| `traefik.http.middlewares.satellite-cors` | Enables CORS support |

### Updating the Service

1. **Update Code**
   ```bash
   git pull origin main
   ```

2. **Rebuild and Deploy**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Zero-Downtime Deployment**
   ```bash
   docker-compose up -d --build --force-recreate
   ```

### Monitoring

1. **Check Service Status**
   ```bash
   docker-compose ps
   ```

2. **View Logs**
   ```bash
   # All logs
   docker-compose logs

   # Follow logs
   docker-compose logs -f

   # Last 100 lines
   docker-compose logs --tail=100
   ```

3. **Health Check**
   ```bash
   # Internal health check
   docker exec satellite-indices-service curl http://localhost:8000/api/health

   # External HTTPS health check
   curl https://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me/api/health
   ```

### Troubleshooting

#### Certificate Issues
If SSL certificates are not working:
1. Check Traefik logs: `docker logs traefik`
2. Ensure domain DNS is properly configured
3. Verify Let's Encrypt rate limits haven't been exceeded

#### Connection Issues
If service is not accessible:
1. Verify container is running: `docker ps`
2. Check network connectivity: `docker network ls`
3. Ensure ports are not blocked by firewall

#### CORS Issues
If experiencing CORS errors:
1. Check that the CORS middleware is applied
2. Verify allowed origins in the middleware configuration
3. Check browser console for specific CORS error messages

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GEE_SERVICE_ACCOUNT` | Google Earth Engine service account | `service@project.iam.gserviceaccount.com` |
| `GEE_PRIVATE_KEY` | GEE service account private key (JSON) | `{"type":"service_account",...}` |
| `GEE_PROJECT_ID` | Google Cloud project ID | `sublime-seat-428722-n5` |
| `GOOGLE_API_KEY` | Google API key for additional services | `AIzaSy...` |
| `SUPABASE_URL` | Supabase instance URL | `https://agritech-supabase-652186...` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbG...` |

### Security Notes

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Rotate API keys regularly**
3. **Monitor access logs** for suspicious activity
4. **Keep Docker images updated** for security patches

### Scaling

To scale the service horizontally:

```yaml
# docker-compose.yml
services:
  satellite-indices-service:
    deploy:
      replicas: 3
```

Traefik will automatically load balance between instances.

### Backup

1. **Data Volume**
   ```bash
   docker run --rm -v satellite-indices-service_temp-data:/data -v $(pwd):/backup alpine tar czf /backup/satellite-data-backup.tar.gz -C /data .
   ```

2. **Environment Configuration**
   ```bash
   cp .env .env.backup.$(date +%Y%m%d)
   ```

### Support

For issues or questions:
1. Check container logs: `docker-compose logs`
2. Verify environment variables are set correctly
3. Ensure network connectivity to external services (Google Earth Engine, Supabase)
4. Review Traefik dashboard for routing issues