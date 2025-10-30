# Deployment Guide

This comprehensive guide covers deploying the AgriTech Platform to production, including frontend, backend satellite service, database migrations, and environment configuration.

## Overview

The AgriTech Platform consists of multiple services:

1. **Frontend (React)** - Static site (Vite build)
2. **Backend (Supabase)** - Database, Auth, Storage, Edge Functions
3. **Satellite Service (FastAPI)** - Python service for satellite imagery
4. **External Services** - Polar.sh (payments), Google Earth Engine

## Deployment Architecture

```
┌─────────────────┐
│   Cloudflare    │  (CDN for frontend)
│     Pages       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   React SPA     │  (Vite build)
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │  FastAPI Server │
│   (PostgreSQL)  │  │  (GEE Service)  │
│   Auth/Storage  │  │                 │
│  Edge Functions │  │                 │
└─────────────────┘  └─────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│    Polar.sh     │  │ Google Earth    │
│   (Payments)    │  │    Engine       │
└─────────────────┘  └─────────────────┘
```

## Prerequisites

### Required Accounts

- **Supabase Account** - https://supabase.com (Free tier available)
- **Vercel/Netlify/Cloudflare** - For frontend hosting
- **Railway/Render/Fly.io** - For satellite service
- **Polar.sh Account** - For payment processing
- **Google Cloud Account** - For Earth Engine (service account)

### Required Tools

```bash
# Node.js and npm
node -v  # v18+ required
npm -v

# Supabase CLI
npm install -g supabase

# Docker (for local satellite service)
docker -v
```

## Part 1: Database Deployment

### Step 1: Set Up Supabase Project

1. Go to https://app.supabase.com
2. Create new project
3. Save your project details:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon key: `eyJhbGc...`
   - Service role key: `eyJhbGc...` (keep secret!)

### Step 2: Link Local Project to Remote

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Test connection
npx supabase db remote ls
```

### Step 3: Push Migrations

```bash
# Review migrations to be applied
npm run db:diff

# Backup current schema (optional)
npm run schema:backup

# Push all migrations to remote
npm run db:push

# Verify migrations applied
npx supabase db remote ls
```

### Step 4: Generate Production Types

```bash
# Generate types from remote database
npm run db:generate-types-remote

# Commit updated types
git add src/types/database.types.ts
git commit -m "Update database types for production"
```

### Step 5: Seed Initial Data (Optional)

```bash
# Run seed script if you have one
npx supabase db remote exec < supabase/seed.sql

# Or insert via SQL Editor in Supabase dashboard
```

## Part 2: Frontend Deployment

### Option A: Vercel (Recommended)

**Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

**Step 2: Configure Environment Variables**

Create `.env.production`:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SATELLITE_SERVICE_URL=https://your-satellite-service.com
VITE_POLAR_ACCESS_TOKEN=your_polar_token
```

**Step 3: Deploy**

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Build locally first to test
npm run build
npm run preview

# Deploy to Vercel
vercel --prod

# Or link to Git repository for auto-deployment
vercel link
```

**Step 4: Configure Vercel Settings**

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.production`
3. Set Build Command: `npm run build`
4. Set Output Directory: `dist`
5. Set Install Command: `npm install`

### Option B: Netlify

**Step 1: Create `netlify.toml`**

**File:** `/project/netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

**Step 2: Deploy**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Option C: Cloudflare Pages

**Step 1: Push to Git**

```bash
git push origin main
```

**Step 2: Connect in Cloudflare Dashboard**

1. Go to Workers & Pages → Create Application
2. Connect your Git repository
3. Set build settings:
   - Build command: `npm run build`
   - Build output: `dist`
   - Root directory: `project`
4. Add environment variables
5. Deploy

## Part 3: Satellite Service Deployment

### Option A: Railway (Recommended)

**Step 1: Create `railway.json`**

**File:** `/satellite-indices-service/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Step 2: Create Production Dockerfile**

**File:** `/satellite-indices-service/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8001/health')"

# Start server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Step 3: Deploy to Railway**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd /Users/boutchaz/Documents/CodeLovers/agritech/satellite-indices-service
railway init

# Add environment variables
railway variables set GEE_SERVICE_ACCOUNT=your_service_account
railway variables set GEE_PRIVATE_KEY=your_private_key
railway variables set GEE_PROJECT_ID=your_project_id
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_KEY=your_service_role_key

# Deploy
railway up
```

### Option B: Render

**Step 1: Create `render.yaml`**

**File:** `/satellite-indices-service/render.yaml`

```yaml
services:
  - type: web
    name: agritech-satellite-service
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    plan: starter
    autoDeploy: true
    healthCheckPath: /health
    envVars:
      - key: GEE_SERVICE_ACCOUNT
        sync: false
      - key: GEE_PRIVATE_KEY
        sync: false
      - key: GEE_PROJECT_ID
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
```

**Step 2: Deploy**

1. Go to https://render.com
2. Connect Git repository
3. Create new Web Service
4. Select `satellite-indices-service` directory
5. Add environment variables
6. Deploy

## Part 4: Environment Configuration

### Production Environment Variables

**Frontend (.env.production)**

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Satellite Service
VITE_SATELLITE_SERVICE_URL=https://your-satellite-service.railway.app

# Polar.sh
VITE_POLAR_ACCESS_TOKEN=polar_at_...

# Optional: Analytics
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

**Satellite Service**

```bash
# Google Earth Engine
GEE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GEE_PROJECT_ID=your-gee-project

# Supabase (for direct database access)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc... (service_role key)

# Optional: Redis (for caching)
REDIS_URL=redis://localhost:6379

# Optional: Sentry (for error tracking)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

## Part 5: Post-Deployment

### Step 1: Verify Deployment

**Frontend Checks:**

```bash
# Test production URL
curl https://your-app.vercel.app

# Check that environment variables are loaded
# Open browser console and check:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

**Satellite Service Checks:**

```bash
# Health check
curl https://your-satellite-service.railway.app/health

# Test an endpoint
curl -X POST https://your-satellite-service.railway.app/api/health \
  -H "Content-Type: application/json"
```

**Database Checks:**

```bash
# Connect to remote database
npx supabase db remote ls

# Test a query
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) FROM organizations;"
```

### Step 2: Set Up Monitoring

**Supabase Monitoring:**

1. Go to Supabase Dashboard → Database
2. Enable Database Metrics
3. Set up alerts for:
   - High CPU usage
   - Storage limits
   - Connection pool exhaustion

**Application Monitoring (Optional):**

**Add Sentry for Error Tracking:**

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project
npm install @sentry/react
```

**File:** `/project/src/main.tsx`

```typescript
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.1,
  });
}
```

### Step 3: Configure Backups

**Supabase Backups:**

Supabase provides automatic daily backups on paid plans. For free tier:

```bash
# Manual backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  > backups/backup_$DATE.sql

# Upload to cloud storage
aws s3 cp backups/backup_$DATE.sql s3://your-bucket/backups/
```

### Step 4: Set Up CI/CD

**GitHub Actions Example:**

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./project
        run: npm ci

      - name: Run tests
        working-directory: ./project
        run: npm test

      - name: Build
        working-directory: ./project
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_SATELLITE_SERVICE_URL: ${{ secrets.VITE_SATELLITE_SERVICE_URL }}
          VITE_POLAR_ACCESS_TOKEN: ${{ secrets.VITE_POLAR_ACCESS_TOKEN }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./project

  deploy-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        run: |
          npm install -g supabase

      - name: Push migrations
        working-directory: ./project
        run: |
          npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Part 6: Domain & SSL

### Custom Domain Setup

**Vercel:**

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `app.agritech.com`)
3. Update DNS records as instructed
4. SSL certificate is auto-provisioned

**Netlify:**

1. Go to Domain Settings → Custom domains
2. Add domain
3. Update DNS or use Netlify DNS
4. SSL auto-enabled

### DNS Configuration

For `app.agritech.com`:

```
Type    Name    Value
A       app     76.76.21.21 (Vercel IP)
AAAA    app     2606:4700:... (Vercel IPv6)
```

Or CNAME:

```
Type     Name    Value
CNAME    app     cname.vercel-dns.com
```

## Part 7: Performance Optimization

### Frontend Optimization

**1. Enable Compression:**

Most hosts enable this automatically. Verify:

```bash
curl -H "Accept-Encoding: gzip" -I https://your-app.com
# Should see: Content-Encoding: gzip
```

**2. Configure Caching Headers:**

**File:** `/project/vercel.json`

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

**3. Analyze Bundle Size:**

```bash
npm run build

# Install analyzer
npm install -D rollup-plugin-visualizer

# Generate report
npm run build -- --mode analyze
```

### Database Optimization

**1. Add Connection Pooling:**

In Supabase Dashboard:
- Go to Database Settings
- Enable Connection Pooler (pgBouncer)
- Use pooler connection string in production

**2. Create Indexes:**

```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX CONCURRENTLY idx_satellite_data_parcel_date ON satellite_data(parcel_id, date DESC);
```

**3. Enable Row Level Security:**

Verify RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
```

## Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing (`npm test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] TypeScript checks pass (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Database migrations tested locally

**Database:**
- [ ] Supabase project created
- [ ] Project linked to remote
- [ ] Migrations pushed successfully
- [ ] RLS policies enabled and tested
- [ ] Initial data seeded (if needed)
- [ ] Database backups configured

**Frontend:**
- [ ] Environment variables configured
- [ ] Build deployed successfully
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] All routes accessible
- [ ] API connections working

**Satellite Service:**
- [ ] Docker image builds successfully
- [ ] Service deployed and running
- [ ] Health check endpoint responding
- [ ] GEE authentication working
- [ ] Environment variables set correctly

**Post-Deployment:**
- [ ] Smoke tests performed
- [ ] Error monitoring set up (Sentry)
- [ ] Performance monitoring enabled
- [ ] Backups scheduled
- [ ] CI/CD pipeline configured
- [ ] Documentation updated

## Troubleshooting

### Issue 1: Build Fails

**Error:** "Module not found"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue 2: Environment Variables Not Loading

**Error:** `undefined` for `import.meta.env.VITE_*`

**Solution:**
- Ensure variables start with `VITE_` prefix
- Rebuild after changing env vars
- Check deployment platform has variables set
- Verify `.env.production` is not gitignored

### Issue 3: Database Connection Fails

**Error:** "connection refused"

**Solution:**
```bash
# Check Supabase connection string
# Verify project is not paused (free tier)
# Test connection:
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### Issue 4: Satellite Service Timeout

**Error:** Gateway timeout from satellite service

**Solution:**
- Increase timeout in deployment config
- Check GEE authentication
- Verify service has enough resources (RAM/CPU)
- Add Redis caching for repeated requests

## Next Steps

- Monitor application performance
- Set up alerts for errors and downtime
- Plan for scaling (database, CDN, etc.)
- Review security best practices
- Schedule regular backups

## Reference

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs
- **Cloudflare Pages:** https://developers.cloudflare.com/pages
