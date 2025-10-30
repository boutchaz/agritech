---
title: First Deployment
sidebar_position: 4
---

# First Deployment

This guide walks you through deploying the AgriTech Platform to production for the first time. We'll cover setting up Supabase, deploying the satellite service, and configuring the frontend.

## Prerequisites

Before deploying, ensure you have:

- Completed the [Installation](./installation.md) and [Environment Setup](./environment-setup.md) guides
- A Supabase account ([sign up here](https://app.supabase.com))
- A Google Cloud account with Earth Engine access (for satellite features)
- A hosting platform for the satellite service (AWS, GCP, DigitalOcean, etc.)
- A hosting platform for the frontend (Vercel, Netlify, AWS S3 + CloudFront, etc.)

## Deployment Architecture

The production architecture consists of:

1. **Frontend**: Static React app hosted on CDN (Vercel, Netlify, etc.)
2. **Database & Auth**: Supabase managed PostgreSQL
3. **Satellite Service**: FastAPI backend on cloud hosting (AWS EC2, GCP Compute, etc.)
4. **Redis**: Managed Redis for background jobs (optional)
5. **Storage**: Supabase Storage for files

## Part 1: Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Fill in project details:
   - **Project name**: `agritech-production` (or your preferred name)
   - **Database Password**: Generate a strong password (save this securely!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select based on your needs (Pro plan recommended for production)
4. Click **Create new project**
5. Wait for the project to be provisioned (takes 2-3 minutes)

### Step 2: Link Your Local Project

Link your local Supabase CLI to the production project:

```bash
cd project
npx supabase link --project-ref your_project_ref
```

**Find your project ref:**
- In the Supabase dashboard, your project ref is in the URL: `app.supabase.com/project/your_project_ref`
- Or go to **Settings** → **General** → **Reference ID**

### Step 3: Push Database Schema

Push your local database migrations to production:

```bash
# Review what will be pushed
npm run db:diff

# Push migrations to production
npm run db:push
```

:::warning
This will apply all migrations to your production database. Make sure you've tested these migrations locally first.
:::

**Verify the migration:**

1. Go to your Supabase dashboard
2. Navigate to **Database** → **Tables**
3. Verify all tables are created correctly

### Step 4: Configure Storage Buckets

Create the required storage buckets:

1. In Supabase dashboard, go to **Storage**
2. Create the following buckets:

**Invoices Bucket:**
- **Name**: `invoices`
- **Public**: No (private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `application/pdf`, `image/jpeg`, `image/png`

**Documents Bucket:**
- **Name**: `documents`
- **Public**: No (private)
- **File size limit**: 50 MB
- **Allowed MIME types**: All document types

**Satellite Exports Bucket:**
- **Name**: `satellite-exports`
- **Public**: No (private)
- **File size limit**: 100 MB
- **Allowed MIME types**: `image/tiff`, `application/x-geotiff`

### Step 5: Configure Row Level Security (RLS) Policies

RLS policies are automatically created via migrations, but verify they're in place:

1. Go to **Authentication** → **Policies**
2. Check that policies exist for all tables
3. Policies should restrict access based on organization membership

### Step 6: Set Up Edge Functions (Optional)

Deploy Supabase Edge Functions:

```bash
# Deploy all functions
npx supabase functions deploy

# Or deploy specific function
npx supabase functions deploy generate-index-image
```

### Step 7: Get Production Credentials

Collect your Supabase credentials:

1. Go to **Settings** → **API**
2. Save the following:
   - **Project URL**: For `VITE_SUPABASE_URL` (frontend) and `SUPABASE_URL` (backend)
   - **anon/public key**: For `VITE_SUPABASE_ANON_KEY` (frontend only)
   - **service_role key**: For `SUPABASE_KEY` (backend only)

:::danger
Keep the service_role key secure! Never expose it in frontend code or commit it to version control.
:::

## Part 2: Satellite Service Deployment

### Option A: Deploy to AWS EC2

#### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Click **Launch Instance**
3. Configure:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t3.medium or larger (recommended: t3.large for production)
   - **Storage**: 30 GB gp3
   - **Security Group**: Allow inbound traffic on ports 22 (SSH), 8001 (API), and 443 (HTTPS)
4. Create or select a key pair for SSH access
5. Launch the instance

#### Step 2: Connect and Set Up

SSH into your instance:

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

Install dependencies:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.9+
sudo apt install python3.9 python3-pip python3-venv -y

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Nginx (for reverse proxy)
sudo apt install nginx -y

# Install certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 3: Clone and Set Up Application

```bash
# Clone repository
git clone https://github.com/your-org/agritech.git
cd agritech/satellite-indices-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Step 4: Configure Environment

Create production environment file:

```bash
nano .env
```

Add your production configuration:

```bash
# Google Earth Engine
GEE_SERVICE_ACCOUNT=production-account@your-project.iam.gserviceaccount.com
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GEE_PROJECT_ID=your-gee-project-id

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Redis
REDIS_URL=redis://localhost:6379/0

# Environment
ENVIRONMENT=production
```

#### Step 5: Set Up Systemd Service

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/agritech-satellite.service
```

Add the following content:

```ini
[Unit]
Description=AgriTech Satellite Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/agritech/satellite-indices-service
Environment="PATH=/home/ubuntu/agritech/satellite-indices-service/venv/bin"
ExecStart=/home/ubuntu/agritech/satellite-indices-service/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable agritech-satellite
sudo systemctl start agritech-satellite
sudo systemctl status agritech-satellite
```

#### Step 6: Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/agritech-satellite
```

Add the following:

```nginx
server {
    listen 80;
    server_name satellite-api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/agritech-satellite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 7: Set Up SSL Certificate

Use Let's Encrypt for free SSL:

```bash
sudo certbot --nginx -d satellite-api.yourdomain.com
```

Follow the prompts to configure SSL. Certbot will automatically update your Nginx configuration.

#### Step 8: Set Up Celery Worker (Optional)

For background jobs, set up Celery:

```bash
sudo nano /etc/systemd/system/agritech-celery.service
```

Add:

```ini
[Unit]
Description=AgriTech Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/agritech/satellite-indices-service
Environment="PATH=/home/ubuntu/agritech/satellite-indices-service/venv/bin"
ExecStart=/home/ubuntu/agritech/satellite-indices-service/venv/bin/celery -A app.celery_app worker --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable agritech-celery
sudo systemctl start agritech-celery
```

### Option B: Deploy to Google Cloud Run

For a serverless option, deploy to Google Cloud Run:

#### Step 1: Create Dockerfile

Create `Dockerfile` in `satellite-indices-service`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8001

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### Step 2: Build and Push Container

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project your-project-id

# Build and push to Google Container Registry
cd satellite-indices-service
gcloud builds submit --tag gcr.io/your-project-id/agritech-satellite

# Or use Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

#### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy agritech-satellite \
  --image gcr.io/your-project-id/agritech-satellite \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEE_SERVICE_ACCOUNT=...,GEE_PROJECT_ID=...,SUPABASE_URL=..." \
  --set-secrets "GEE_PRIVATE_KEY=gee-private-key:latest,SUPABASE_KEY=supabase-service-key:latest"
```

## Part 3: Frontend Deployment

### Option A: Deploy to Vercel

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Configure Environment Variables

Create `.env.production` in the `project` directory:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SATELLITE_SERVICE_URL=https://satellite-api.yourdomain.com
VITE_POLAR_ACCESS_TOKEN=your_polar_token
```

#### Step 3: Deploy

```bash
cd project
vercel --prod
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Link to existing project**: No (first time)
- **Project name**: agritech-platform
- **Directory**: `./` (current directory)
- **Build command**: `npm run build`
- **Output directory**: `dist`

#### Step 4: Configure Environment Variables in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from `.env.production`
5. Redeploy: `vercel --prod`

### Option B: Deploy to Netlify

#### Step 1: Build Production Bundle

```bash
cd project
npm run build
```

#### Step 2: Deploy with Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

#### Step 3: Configure Environment Variables

1. Go to [app.netlify.com](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add all `VITE_*` variables from your `.env.production`
5. Trigger a rebuild

## Part 4: Post-Deployment Configuration

### Step 1: Configure CORS

Update your satellite service CORS settings to allow your frontend domain:

```python
# satellite-indices-service/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.vercel.app",
        "https://yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy the satellite service after this change.

### Step 2: Set Up Custom Domain (Optional)

**For Vercel:**
1. Go to your project settings
2. Navigate to **Domains**
3. Add your custom domain
4. Configure DNS records as instructed

**For the satellite service:**
1. Point your DNS A record to your server's IP
2. Ensure SSL is configured (via Certbot on EC2 or automatic on Cloud Run)

### Step 3: Configure Polar.sh Webhooks

Set up webhooks to sync subscription status:

1. Go to your Polar.sh dashboard
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL: `https://your-project.supabase.co/functions/v1/polar-webhook`
4. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
5. Save the webhook secret

Add the webhook secret to your Supabase secrets:

```bash
npx supabase secrets set POLAR_WEBHOOK_SECRET=your_webhook_secret
```

### Step 4: Set Up Monitoring

#### Application Monitoring

**For the satellite service:**
- Set up CloudWatch (AWS) or Cloud Logging (GCP)
- Monitor `/health` endpoint
- Set up alerts for errors and high latency

**For the frontend:**
- Use Vercel Analytics or Netlify Analytics
- Set up error tracking (Sentry, LogRocket, etc.)

#### Database Monitoring

1. In Supabase dashboard, go to **Reports**
2. Monitor:
   - Database size and growth
   - Query performance
   - Connection usage
   - API requests

### Step 5: Run Fresh Deployment Script

Execute the fresh deployment script to initialize the database with seed data:

```bash
cd project
npm run deploy:fresh:remote
```

This will:
- Apply all migrations
- Set up RLS policies
- Create initial subscription tiers
- Seed default data

### Step 6: Create Admin User

1. Sign up through your production frontend
2. Verify email
3. Manually promote to system admin in Supabase:

```sql
-- In Supabase SQL Editor
UPDATE user_profiles
SET role = 'system_admin'
WHERE user_id = 'your-user-id';
```

## Verification Checklist

After deployment, verify everything is working:

- [ ] Frontend loads at your production URL
- [ ] User registration and login work
- [ ] Create an organization
- [ ] Create a farm and parcel
- [ ] Upload a document to storage
- [ ] Request satellite data (if GEE is configured)
- [ ] Test subscription checkout flow (if Polar.sh is configured)
- [ ] Check that background jobs process (if Celery is set up)
- [ ] Verify database queries are fast (check slow query log)
- [ ] Test on mobile devices
- [ ] Verify SSL certificates are valid

## Ongoing Maintenance

### Database Backups

Supabase automatically backs up your database, but for critical data:

```bash
# Manual backup
npm run db:dump > backup-$(date +%Y%m%d).sql
```

### Monitoring and Alerts

Set up alerts for:
- High error rates
- Slow API responses
- Database connection issues
- Storage quota approaching limit
- SSL certificate expiration

### Updates and Migrations

When deploying updates:

```bash
# Test locally first
npm run db:diff

# Push to production
npm run db:push

# Deploy frontend
cd project
vercel --prod

# Update satellite service
ssh ubuntu@your-server
cd agritech/satellite-indices-service
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart agritech-satellite
```

## Rollback Strategy

If deployment fails, rollback:

**Frontend (Vercel):**
1. Go to your project dashboard
2. Find the previous successful deployment
3. Click **Promote to Production**

**Satellite Service:**
```bash
ssh ubuntu@your-server
cd agritech/satellite-indices-service
git checkout previous-stable-commit
sudo systemctl restart agritech-satellite
```

**Database:**
```bash
# Restore from backup
psql -h your-project.supabase.co -U postgres -d postgres < backup-20240101.sql
```

## Troubleshooting Production Issues

### Frontend Not Loading

1. Check browser console for errors
2. Verify environment variables in hosting platform
3. Check if API endpoints are accessible
4. Verify Supabase credentials

### Satellite Service Timeout

1. Check server logs: `sudo journalctl -u agritech-satellite -f`
2. Verify GEE credentials are correct
3. Check Redis connection
4. Increase server resources if needed

### Database Connection Issues

1. Check connection limits in Supabase dashboard
2. Optimize slow queries
3. Consider upgrading to a higher tier
4. Review RLS policies for performance issues

## Next Steps

- [Configure Monitoring and Alerts](../deployment/monitoring.md)
- [Set Up CI/CD Pipeline](../deployment/ci-cd.md)
- [Performance Optimization](../deployment/optimization.md)
- [Security Best Practices](../deployment/security.md)

## Additional Resources

- [Supabase Deployment Docs](https://supabase.com/docs/guides/hosting)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [AWS EC2 Getting Started](https://docs.aws.amazon.com/ec2/index.html)
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
