---
title: Environment Setup
sidebar_position: 3
---

# Environment Setup

This guide covers detailed environment variable configuration for both development and production environments.

## Overview

The AgriTech Platform requires configuration for two main services:

1. **Frontend (React/Vite)** - Environment variables prefixed with `VITE_`
2. **Satellite Service (FastAPI)** - Google Earth Engine and Supabase configuration

## Frontend Environment Variables

### Location

Create a `.env` file in the `/project` directory:

```bash
cd project
touch .env
```

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Satellite Service URL
VITE_SATELLITE_SERVICE_URL=http://localhost:8001

# Polar.sh (Subscription Management) - Optional
VITE_POLAR_ACCESS_TOKEN=your_polar_access_token
```

### Development Configuration

For local development with Supabase local instance:

```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
```

:::tip
Get your local Supabase anon key from Supabase Studio at [http://localhost:54323](http://localhost:54323) under Settings → API.
:::

### Production Configuration

For production deployment:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SATELLITE_SERVICE_URL=https://satellite-api.yourdomain.com
VITE_POLAR_ACCESS_TOKEN=polar_at_...
```

:::warning Security Note
Never commit `.env` files to version control. The `.env` file should be listed in `.gitignore`.
:::

### Getting Supabase Credentials

#### For Local Development

1. Start local Supabase:
   ```bash
   npm run db:start
   ```

2. Open Supabase Studio: [http://localhost:54323](http://localhost:54323)

3. Navigate to **Settings** → **API**

4. Copy the following:
   - **Project URL**: Use as `VITE_SUPABASE_URL`
   - **anon/public key**: Use as `VITE_SUPABASE_ANON_KEY`

#### For Production

1. Go to your Supabase project dashboard at [app.supabase.com](https://app.supabase.com)

2. Navigate to **Settings** → **API**

3. Copy the following:
   - **Project URL**: Use as `VITE_SUPABASE_URL`
   - **anon public key**: Use as `VITE_SUPABASE_ANON_KEY`

:::danger
Never use the `service_role` key in frontend code. Only use the `anon` key. The service role key bypasses Row Level Security and should only be used in backend services.
:::

## Satellite Service Environment Variables

### Location

Create a `.env` file in the `/satellite-indices-service` directory:

```bash
cd satellite-indices-service
touch .env
```

### Required Variables

```bash
# Google Earth Engine Configuration
GEE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----
GEE_PROJECT_ID=your-gee-project-id

# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your_service_role_key

# Redis Configuration (for background jobs)
REDIS_URL=redis://localhost:6379/0

# Optional: Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Google Earth Engine Setup

Google Earth Engine (GEE) is required for satellite vegetation analysis. Follow these steps to set up GEE credentials:

#### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your **Project ID**

#### 2. Enable Earth Engine API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Earth Engine API"
3. Click **Enable**

#### 3. Create a Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - **Name**: `agritech-earth-engine`
   - **Description**: `Service account for AgriTech satellite analysis`
4. Click **Create and Continue**
5. Grant the role: **Earth Engine Resource Writer**
6. Click **Done**

#### 4. Generate Service Account Key

1. Find your newly created service account in the list
2. Click the **Actions** menu (three dots) → **Manage keys**
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create** - A JSON file will be downloaded

#### 5. Register with Earth Engine

1. Go to [Google Earth Engine signup](https://signup.earthengine.google.com/)
2. Sign up with your Google account
3. Register your project for Earth Engine access
4. Wait for approval (usually instant for cloud projects)

#### 6. Configure Environment Variables

Extract values from the downloaded JSON file:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "agritech-earth-engine@your-project.iam.gserviceaccount.com",
  ...
}
```

Add to your `.env` file:

```bash
GEE_SERVICE_ACCOUNT=agritech-earth-engine@your-project.iam.gserviceaccount.com
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
GEE_PROJECT_ID=your-project-id
```

:::tip
When adding the private key to `.env`, keep the newlines as `\n` characters. Don't split the key across multiple lines in the `.env` file.
:::

#### 7. Test GEE Authentication

Test your Earth Engine connection:

```bash
cd satellite-indices-service
source venv/bin/activate
python -c "import ee; ee.Initialize(); print('Earth Engine initialized successfully!')"
```

If successful, you'll see: `Earth Engine initialized successfully!`

### Supabase Service Role Key

The satellite service needs the Supabase **service role key** (not the anon key) to:
- Bypass Row Level Security when writing satellite data
- Access storage buckets for GeoTIFF exports
- Perform admin operations

#### Get Service Role Key

**For local development:**

1. Open Supabase Studio: [http://localhost:54323](http://localhost:54323)
2. Navigate to **Settings** → **API**
3. Copy the **service_role key**

**For production:**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the **service_role key**

Add to your satellite service `.env`:

```bash
SUPABASE_URL=http://localhost:54321  # or production URL
SUPABASE_KEY=your_service_role_key_here
```

:::danger Security Warning
The service role key should NEVER be exposed to the frontend or committed to version control. Only use it in secure backend services.
:::

### Redis Configuration

Redis is used for Celery background jobs (batch satellite processing).

**Local development:**

```bash
REDIS_URL=redis://localhost:6379/0
```

**Production with Redis Cloud:**

```bash
REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345
```

**Production with ElastiCache (AWS):**

```bash
REDIS_URL=redis://your-elasticache-endpoint.amazonaws.com:6379
```

## Environment-Specific Configurations

### Development (.env.development)

Create separate environment files for different stages:

```bash
# Frontend: project/.env.development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=local_anon_key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001

# Satellite Service: satellite-indices-service/.env.development
GEE_SERVICE_ACCOUNT=dev-account@project.iam.gserviceaccount.com
SUPABASE_URL=http://localhost:54321
REDIS_URL=redis://localhost:6379/0
```

### Staging (.env.staging)

```bash
# Frontend: project/.env.staging
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging_anon_key
VITE_SATELLITE_SERVICE_URL=https://staging-satellite-api.yourdomain.com

# Satellite Service: satellite-indices-service/.env.staging
GEE_SERVICE_ACCOUNT=staging-account@project.iam.gserviceaccount.com
SUPABASE_URL=https://your-staging-project.supabase.co
REDIS_URL=redis://staging-redis.yourdomain.com:6379
```

### Production (.env.production)

```bash
# Frontend: project/.env.production
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=production_anon_key
VITE_SATELLITE_SERVICE_URL=https://satellite-api.yourdomain.com
VITE_POLAR_ACCESS_TOKEN=polar_at_production_token

# Satellite Service: satellite-indices-service/.env.production
GEE_SERVICE_ACCOUNT=production-account@project.iam.gserviceaccount.com
SUPABASE_URL=https://your-production-project.supabase.co
REDIS_URL=redis://production-redis.yourdomain.com:6379
```

## Optional: Polar.sh Configuration

Polar.sh provides subscription management and payment processing.

### Sign Up for Polar.sh

1. Go to [polar.sh](https://polar.sh)
2. Sign up for an account
3. Create an organization

### Get Access Token

1. Navigate to **Settings** → **Access Tokens**
2. Create a new access token with the following scopes:
   - `products:read`
   - `subscriptions:read`
   - `subscriptions:write`
   - `checkouts:read`
   - `checkouts:write`
3. Copy the token

### Configure Frontend

Add to your frontend `.env`:

```bash
VITE_POLAR_ACCESS_TOKEN=polar_at_your_access_token_here
```

### Set Up Subscription Products

After configuring the token, set up your subscription products:

```bash
cd project
npm run polar:setup
```

This will create the default subscription tiers (Free, Basic, Pro, Enterprise) in your Polar.sh account.

## Linking Supabase CLI

To use Supabase CLI commands with your remote project, link your local environment:

```bash
cd project
npx supabase link --project-ref your_project_ref
```

**Get your project reference:**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. The project ref is in the URL: `app.supabase.com/project/your_project_ref`

**Verify the link:**

```bash
npx supabase projects list
```

## Environment Variable Validation

The application validates environment variables on startup. If required variables are missing, you'll see error messages.

**Frontend validation:**

```typescript
// Checked on app startup in src/main.tsx
if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL is required');
}
```

**Backend validation:**

```python
# Checked in satellite-indices-service/app/core/config.py
from pydantic import BaseSettings

class Settings(BaseSettings):
    gee_service_account: str
    gee_private_key: str
    # ... other required fields

    class Config:
        env_file = ".env"
```

## Troubleshooting

### Environment Variables Not Loading

**Problem**: Environment variables are undefined in the app

**Solution**:
- Vite requires `VITE_` prefix for frontend variables
- Restart the dev server after changing `.env` files
- Check that `.env` is in the correct directory

### Google Earth Engine Authentication Failed

**Problem**: `ee.EEException: Authentication failed`

**Solution**:
1. Verify your service account email is correct
2. Check that the private key includes the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
3. Ensure your Google Cloud project is registered with Earth Engine
4. Verify the Earth Engine API is enabled in your Google Cloud project

### Supabase Connection Refused

**Problem**: `Error: connect ECONNREFUSED`

**Solution**:
1. Verify Supabase is running: `npm run db:start`
2. Check the `SUPABASE_URL` is correct
3. Ensure Docker is running
4. Check firewall settings aren't blocking port 54321

### Redis Connection Failed

**Problem**: `Error: Redis connection to localhost:6379 failed`

**Solution**:
1. Start Redis: `redis-server`
2. Verify Redis is running: `redis-cli ping`
3. Check the `REDIS_URL` format is correct

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Rotate keys regularly** - Especially for production
3. **Use separate credentials** for dev/staging/production
4. **Limit service account permissions** - Only grant necessary GEE roles
5. **Use environment-specific tokens** - Don't share production tokens across environments
6. **Store production secrets securely** - Use secret management services like AWS Secrets Manager or HashiCorp Vault

## Next Steps

- [First Deployment Guide](./first-deployment.md) - Deploy to production
- [Database Configuration](../database/configuration.md) - Configure database settings
- [Architecture Overview](../architecture/overview.md) - Understand the system architecture
