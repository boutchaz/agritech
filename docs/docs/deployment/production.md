# Production Deployment

Comprehensive guide for deploying the AgriTech Platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Frontend Deployment](#frontend-deployment)
- [Backend Deployment](#backend-deployment)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Domain and SSL](#domain-and-ssl)
- [Deployment Checklist](#deployment-checklist)
- [Post-Deployment](#post-deployment)
- [Rollback Procedure](#rollback-procedure)

## Prerequisites

### Required Accounts

- [ ] Vercel/Netlify account (frontend hosting)
- [ ] Supabase account (database & backend)
- [ ] Cloud provider account (satellite service: AWS/GCP/DigitalOcean)
- [ ] Polar.sh account (payments)
- [ ] Google Earth Engine service account
- [ ] Domain registrar account
- [ ] Error tracking service (optional: Sentry)

### Required Tools

```bash
# Install CLI tools
npm install -g vercel
npm install -g netlify-cli
npm install -g supabase
npm install -g pm2  # For Node.js process management
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

**1. Connect Repository**:

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select `project/` as root directory

**2. Configure Build Settings**:

```bash
# Framework Preset: Vite
# Build Command
npm run build

# Output Directory
dist

# Install Command
npm install
```

**3. Environment Variables**:

Add in Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SATELLITE_SERVICE_URL=https://satellite.yourdomain.com
VITE_POLAR_ACCESS_TOKEN=polar_at_xxx
VITE_POLAR_ORGANIZATION_ID=your-polar-org-id
VITE_POLAR_SERVER=production
VITE_POLAR_CHECKOUT_URL=https://polar.sh/checkout/your-checkout-id
NODE_ENV=production
```

**4. Deploy**:

```bash
# Manual deployment
cd project
vercel --prod

# Or push to main branch for automatic deployment
git push origin main
```

**5. Custom Domain**:

1. Go to Vercel → Settings → Domains
2. Add your domain: `app.yourdomain.com`
3. Configure DNS records as instructed
4. SSL certificate auto-provisioned

### Option 2: Netlify

**1. Connect Repository**:

```bash
netlify init
```

**2. Configure netlify.toml**:

```toml
[build]
  base = "project/"
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**3. Deploy**:

```bash
netlify deploy --prod
```

### Build Optimization

**Pre-deployment checklist**:

```bash
# 1. Run tests
npm test

# 2. Type check
npm run type-check

# 3. Lint
npm run lint

# 4. Build locally
npm run build

# 5. Preview build
npm run preview

# 6. Check bundle size
npm run build -- --analyze
```

## Backend Deployment

### Satellite Service (FastAPI)

**Option 1: Docker on Cloud VM**:

**1. Prepare Dockerfile**:

```dockerfile
# satellite-indices-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

**2. Deploy to Cloud VM** (DigitalOcean example):

```bash
# SSH to server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repository
git clone https://github.com/yourusername/agritech.git
cd agritech/satellite-indices-service

# Create .env file
cat > .env << EOF
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GEE_PROJECT_ID=your-gee-project-id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
EOF

# Build and run
docker build -t satellite-service .
docker run -d -p 8001:8001 --env-file .env --name satellite satellite-service

# Set up process management
docker update --restart unless-stopped satellite
```

**3. Configure Nginx Reverse Proxy**:

```nginx
# /etc/nginx/sites-available/satellite
server {
    listen 80;
    server_name satellite.yourdomain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running requests
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/satellite /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Set up SSL with Let's Encrypt
certbot --nginx -d satellite.yourdomain.com
```

**Option 2: Cloud Functions** (AWS Lambda/GCP Cloud Functions):

Convert to serverless function (more complex, better scaling).

## Database Setup

### Supabase Production

**1. Create Production Project**:

1. Go to [supabase.com](https://supabase.com)
2. Create new organization (if needed)
3. Create new project
4. Choose region closest to users
5. Set strong database password
6. Wait for provisioning (~2 minutes)

**2. Run Migrations**:

```bash
cd project

# Link to production project
npx supabase link --project-ref your-prod-ref

# Apply migrations
npx supabase db push
```

**3. Verify Schema**:

```bash
# Check tables
npx supabase db pull

# Generate types
npm run db:generate-types-remote
```

**4. Configure RLS Policies**:

Verify all tables have proper Row Level Security policies enabled:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS if needed
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
```

**5. Set up Backups**:

Supabase Pro:
- Automatic daily backups
- Point-in-time recovery
- Configure in Dashboard → Settings → Database → Backups

**6. Configure Connection Pooling**:

For high traffic:

```sql
-- Increase connection limit
ALTER SYSTEM SET max_connections = 200;
```

Use Supabase connection pooler:
```
postgresql://postgres.{ref}:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Storage Buckets

**Configure production buckets**:

```sql
-- Create buckets via Supabase Dashboard or SQL
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('invoices', 'invoices', false),
  ('documents', 'documents', false),
  ('satellite-exports', 'satellite-exports', false);

-- Set up policies
CREATE POLICY "Users can upload their organization's invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);
```

## Environment Configuration

### Frontend Environment Variables

**Production .env** (stored in Vercel/Netlify):

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Satellite Service
VITE_SATELLITE_SERVICE_URL=https://satellite.yourdomain.com

# Polar.sh
VITE_POLAR_ACCESS_TOKEN=polar_at_xxx
VITE_POLAR_ORGANIZATION_ID=org_xxx
VITE_POLAR_SERVER=production
VITE_POLAR_CHECKOUT_URL=https://polar.sh/checkout/polar_c_xxx

# Environment
NODE_ENV=production
```

### Backend Environment Variables

**Satellite Service .env**:

```bash
# Google Earth Engine
GEE_SERVICE_ACCOUNT=satellite@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GEE_PROJECT_ID=your-gee-project

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Service role key

# Optional
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
```

### Secrets Management

**Option 1: Environment Variables** (simple, less secure)

**Option 2: Secret Manager** (recommended):

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name prod/agritech/gee-credentials \
  --secret-string file://credentials.json

# Google Secret Manager
gcloud secrets create gee-credentials \
  --data-file=credentials.json

# Retrieve in code
import boto3
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='prod/agritech/gee-credentials')
```

## Domain and SSL

### DNS Configuration

**Setup DNS records**:

```
# Main app
A     app.yourdomain.com     →  Vercel IP (or CNAME)
CNAME www.yourdomain.com     →  cname.vercel-dns.com

# API
A     api.yourdomain.com     →  Your server IP
A     satellite.yourdomain.com  →  Your server IP

# Email
MX    yourdomain.com         →  Your email provider
```

### SSL Certificates

**Automatic (Vercel/Netlify)**:
- SSL auto-provisioned
- Auto-renewal

**Manual (Nginx + Let's Encrypt)**:

```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d satellite.yourdomain.com

# Auto-renewal (cron)
0 0 * * * certbot renew --quiet
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Type checking passing
- [ ] No ESLint errors
- [ ] Build succeeds locally
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Secrets secured
- [ ] SSL certificates ready
- [ ] DNS configured
- [ ] Backup strategy in place

### Security

- [ ] HTTPS enabled everywhere
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] SQL injection prevention (RLS)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Sensitive data encrypted
- [ ] API keys secured
- [ ] Supabase RLS policies tested

### Performance

- [ ] CDN configured
- [ ] Images optimized
- [ ] Bundle size optimized
- [ ] Caching headers set
- [ ] Database indexes created
- [ ] Connection pooling enabled
- [ ] Lazy loading implemented
- [ ] Code splitting enabled

### Monitoring

- [ ] Error tracking set up (Sentry)
- [ ] Logging configured
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring
- [ ] Database monitoring
- [ ] Alerts configured

## Post-Deployment

### Verification

**1. Smoke Tests**:

```bash
# Health check endpoints
curl https://app.yourdomain.com/health
curl https://satellite.yourdomain.com/health

# Test authentication
# - Login
# - Signup
# - Password reset

# Test critical paths
# - Create farm
# - Create parcel
# - Request satellite analysis
# - Create worker
# - Create task

# Test integrations
# - Supabase connection
# - Polar.sh checkout
# - Satellite service
# - Email sending
```

**2. Monitor Logs**:

```bash
# Vercel logs
vercel logs --prod

# Server logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
docker logs satellite

# Supabase logs
# Check in Dashboard → Logs
```

**3. Performance Check**:

```bash
# Run Lighthouse
npx lighthouse https://app.yourdomain.com --view

# Check Core Web Vitals
# Use Google PageSpeed Insights
```

### Monitoring Setup

**1. Error Tracking (Sentry)**:

```typescript
// In main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'https://xxx@sentry.io/xxx',
    environment: 'production',
    tracesSampleRate: 0.1,
  });
}
```

**2. Uptime Monitoring**:

Services:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor:
- Main app: https://app.yourdomain.com
- API: https://satellite.yourdomain.com/health
- Supabase: Check via API call

**3. Analytics** (optional):

```typescript
// Google Analytics or Plausible
import { Analytics } from '@vercel/analytics/react';

<App />
<Analytics />
```

## Rollback Procedure

### Frontend Rollback (Vercel)

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>

# Or via dashboard: Deployments → Previous → Promote to Production
```

### Database Rollback

```bash
# If migration failed

# 1. Create rollback migration
npx supabase migration new rollback_xxx

# 2. Write reverse migration
-- In rollback_xxx.sql
DROP TABLE IF EXISTS new_table;
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

# 3. Apply
npx supabase db push

# Or restore from backup
# Supabase Dashboard → Settings → Database → Backups → Restore
```

### Backend Rollback

```bash
# If using Git deployment
git revert HEAD
git push origin main

# If using Docker
docker stop satellite
docker rm satellite
docker run -d -p 8001:8001 --env-file .env --name satellite satellite-service:previous-tag
```

## Production Maintenance

### Regular Tasks

**Daily**:
- Check error logs
- Monitor performance metrics
- Verify backups completed

**Weekly**:
- Review uptime reports
- Check disk space
- Update dependencies (if security patches)
- Review slow queries

**Monthly**:
- Full security audit
- Performance review
- Cost optimization
- Backup restoration test
- Update documentation

### Scaling

**Frontend** (auto-scales with Vercel/Netlify)

**Database**:
- Upgrade Supabase plan
- Enable connection pooling
- Add read replicas

**Backend**:
- Horizontal scaling: Add more servers
- Load balancer: Nginx/HAProxy
- Auto-scaling: Kubernetes

### Cost Optimization

- Monitor Supabase bandwidth usage
- Optimize satellite service calls (cache results)
- Use CDN for static assets
- Implement request rate limiting
- Review and remove unused resources

---

Following this production deployment guide ensures a smooth, secure, and reliable deployment of the AgriTech Platform.
