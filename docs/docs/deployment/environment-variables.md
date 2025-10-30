# Environment Variables

Complete reference for all environment variables used in the AgriTech Platform.

## Table of Contents

- [Frontend Variables](#frontend-variables)
- [Backend Variables](#backend-variables)
- [Security Best Practices](#security-best-practices)
- [Environment-Specific Configuration](#environment-specific-configuration)

## Frontend Variables

All frontend environment variables must be prefixed with `VITE_` to be accessible in the browser.

### Supabase Configuration

```bash
# Supabase URL
VITE_SUPABASE_URL=https://your-project.supabase.co
# Description: URL of your Supabase project
# Required: Yes
# Example: https://abcdefgh.supabase.co

# Supabase Anonymous Key
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Description: Public anonymous key for client-side Supabase requests
# Required: Yes
# Security: Safe to expose (public key with RLS protection)
# Get from: Supabase Dashboard → Settings → API → anon public
```

### Satellite Service Configuration

```bash
# Satellite Service URL
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
# Description: URL of the FastAPI satellite indices service
# Required: Yes
# Development: http://localhost:8001
# Production: https://satellite.yourdomain.com
```

### Polar.sh Configuration

```bash
# Polar Access Token
VITE_POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
# Description: Polar.sh API access token
# Required: Yes (for subscription features)
# Security: Sensitive, but frontend tokens have limited permissions
# Get from: Polar.sh Dashboard → Settings → API Keys

# Polar Organization ID
VITE_POLAR_ORGANIZATION_ID=org_xxxxxxxxxxxxx
# Description: Your Polar.sh organization identifier
# Required: Yes
# Get from: Polar.sh Dashboard → Settings → Organization

# Polar Server Environment
VITE_POLAR_SERVER=sandbox
# Description: Polar.sh server environment
# Required: Yes
# Values: 'sandbox' | 'production'
# Development: sandbox
# Production: production

# Polar Checkout URL
VITE_POLAR_CHECKOUT_URL=https://sandbox.polar.sh/checkout/polar_c_xxxxx
# Description: Full URL for Polar.sh checkout flow
# Required: Yes
# Get from: Polar.sh Dashboard → Products → Checkout Link
```

### Optional Frontend Variables

```bash
# Environment Name
NODE_ENV=development
# Description: Node.js environment
# Values: 'development' | 'production' | 'test'
# Auto-set by: Build tools

# API Base URL (if using separate API)
VITE_API_BASE_URL=https://api.yourdomain.com
# Description: Base URL for custom API endpoints
# Required: No (if not using custom API)

# Sentry DSN (Error Tracking)
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# Description: Sentry error tracking DSN
# Required: No (recommended for production)
# Get from: Sentry.io → Project Settings → Client Keys

# Google Analytics ID
VITE_GA_ID=G-XXXXXXXXXX
# Description: Google Analytics measurement ID
# Required: No (optional analytics)

# Feature Flags
VITE_FEATURE_NEW_DASHBOARD=true
VITE_FEATURE_BETA_REPORTS=false
# Description: Feature flags for gradual rollouts
# Required: No
# Values: true | false

# Debug Mode
VITE_DEBUG=false
# Description: Enable verbose debugging
# Required: No
# Values: true | false
# Development: Can be true
# Production: Should be false
```

## Backend Variables

Environment variables for the satellite indices service (FastAPI).

### Google Earth Engine Configuration

```bash
# GEE Service Account Email
GEE_SERVICE_ACCOUNT=satellite@your-project.iam.gserviceaccount.com
# Description: Google Earth Engine service account email
# Required: Yes
# Get from: Google Cloud Console → IAM → Service Accounts

# GEE Private Key
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
# Description: Private key for GEE service account
# Required: Yes
# Security: VERY SENSITIVE - Never commit to Git
# Get from: Google Cloud Console → Service Account → Keys → Create Key (JSON)
# Note: Newlines must be escaped as \n

# GEE Project ID
GEE_PROJECT_ID=your-gee-project-id
# Description: Google Earth Engine project ID
# Required: Yes
# Get from: Google Cloud Console → Project Info
```

### Supabase Configuration

```bash
# Supabase URL
SUPABASE_URL=https://your-project.supabase.co
# Description: Supabase project URL (same as frontend)
# Required: Yes

# Supabase Service Role Key
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Description: Service role key for server-side operations
# Required: Yes
# Security: VERY SENSITIVE - Bypasses RLS
# Get from: Supabase Dashboard → Settings → API → service_role
# Warning: Never expose to frontend
```

### Application Configuration

```bash
# Server Host
HOST=0.0.0.0
# Description: Host address to bind to
# Default: 0.0.0.0 (all interfaces)
# Required: No

# Server Port
PORT=8001
# Description: Port number for the service
# Default: 8001
# Required: No

# Log Level
LOG_LEVEL=info
# Description: Logging verbosity
# Values: 'debug' | 'info' | 'warning' | 'error'
# Development: debug
# Production: info or warning
# Required: No

# Workers (for production)
WORKERS=4
# Description: Number of Uvicorn workers
# Default: 1
# Production: CPU count
# Required: No

# CORS Origins
CORS_ORIGINS=http://localhost:5173,https://app.yourdomain.com
# Description: Allowed CORS origins (comma-separated)
# Required: No (defaults to *)
# Production: Specify exact origins
```

### Optional Backend Variables

```bash
# Redis URL (for caching)
REDIS_URL=redis://localhost:6379
# Description: Redis connection URL for caching
# Required: No (caching disabled if not set)

# Sentry DSN
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# Description: Sentry error tracking for backend
# Required: No (recommended for production)

# Database URL (if using separate database)
DATABASE_URL=postgresql://user:pass@host:5432/db
# Description: PostgreSQL connection string
# Required: No (using Supabase by default)

# AWS Credentials (for S3 storage)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
# Description: AWS credentials for S3 storage
# Required: No (using Supabase Storage by default)
```

## Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.staging
.env.*.local

# Check for committed secrets
git log --all --full-history --source -- .env
```

### 2. Use Different Keys per Environment

```
Development:
- Use sandbox/test API keys
- Can use less secure keys locally

Staging:
- Use staging-specific keys
- Same security as production

Production:
- Unique, secure keys
- Rotate regularly
- Monitor usage
```

### 3. Limit Permissions

```bash
# Supabase keys
- anon key: Public, RLS-protected ✅
- service_role key: Private, bypasses RLS ❌ Never expose

# Google Service Account
- Grant minimum required permissions
- Limit to Earth Engine API only

# Polar.sh tokens
- Use separate tokens for dev/prod
- Revoke if compromised
```

### 4. Rotate Secrets Regularly

```
Schedule:
- Production keys: Every 90 days
- Staging keys: Every 180 days
- Development keys: As needed

Process:
1. Generate new key
2. Update in all environments
3. Test thoroughly
4. Revoke old key
5. Document rotation in log
```

### 5. Use Secret Managers

**For production, use secret managers**:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name prod/agritech/supabase-key \
  --secret-string "your-secret-key"

# Access in code
import boto3
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='prod/agritech/supabase-key')

# Google Secret Manager
gcloud secrets create supabase-key --data-file=key.txt

# Access in code
from google.cloud import secretmanager
client = secretmanager.SecretManagerServiceClient()
response = client.access_secret_version(name="projects/PROJECT/secrets/supabase-key/versions/latest")
secret = response.payload.data.decode('UTF-8')

# HashiCorp Vault
vault kv put secret/agritech/supabase-key value="your-secret-key"

# Access via API
```

## Environment-Specific Configuration

### Development (.env.local)

```bash
# Supabase (local)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Local anon key

# Satellite Service (local)
VITE_SATELLITE_SERVICE_URL=http://localhost:8001

# Polar (sandbox)
VITE_POLAR_ACCESS_TOKEN=polar_at_sandbox_xxx
VITE_POLAR_ORGANIZATION_ID=org_sandbox_xxx
VITE_POLAR_SERVER=sandbox
VITE_POLAR_CHECKOUT_URL=https://sandbox.polar.sh/checkout/...

# Development settings
NODE_ENV=development
VITE_DEBUG=true
```

### Staging (.env.staging)

```bash
# Supabase (staging)
VITE_SUPABASE_URL=https://staging-xxx.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key

# Satellite Service (staging)
VITE_SATELLITE_SERVICE_URL=https://satellite-staging.yourdomain.com

# Polar (sandbox)
VITE_POLAR_ACCESS_TOKEN=polar_at_sandbox_xxx
VITE_POLAR_ORGANIZATION_ID=org_sandbox_xxx
VITE_POLAR_SERVER=sandbox

# Staging settings
NODE_ENV=staging
VITE_DEBUG=false
```

### Production (.env.production)

```bash
# Supabase (production)
VITE_SUPABASE_URL=https://prod-xxx.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key

# Satellite Service (production)
VITE_SATELLITE_SERVICE_URL=https://satellite.yourdomain.com

# Polar (production)
VITE_POLAR_ACCESS_TOKEN=polar_at_prod_xxx
VITE_POLAR_ORGANIZATION_ID=org_prod_xxx
VITE_POLAR_SERVER=production
VITE_POLAR_CHECKOUT_URL=https://polar.sh/checkout/...

# Production settings
NODE_ENV=production
VITE_DEBUG=false

# Monitoring
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_ID=G-XXXXXXXXXX
```

## Loading Environment Variables

### Frontend (Vite)

```typescript
// Access in code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const isDev = import.meta.env.DEV; // Built-in
const isProd = import.meta.env.PROD; // Built-in

// Type-safe access (recommended)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SATELLITE_SERVICE_URL: string;
  // ... other variables
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Backend (Python)

```python
# Load from .env file
from dotenv import load_dotenv
import os

load_dotenv()

# Access variables
GEE_SERVICE_ACCOUNT = os.getenv('GEE_SERVICE_ACCOUNT')
GEE_PRIVATE_KEY = os.getenv('GEE_PRIVATE_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')

# With defaults
LOG_LEVEL = os.getenv('LOG_LEVEL', 'info')
PORT = int(os.getenv('PORT', '8001'))

# Required variables
def get_required_env(key: str) -> str:
    value = os.getenv(key)
    if value is None:
        raise ValueError(f"Required environment variable {key} is not set")
    return value

GEE_PROJECT_ID = get_required_env('GEE_PROJECT_ID')
```

## Validation

### Validate on Startup

```typescript
// frontend/src/lib/env.ts
function validateEnv() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SATELLITE_SERVICE_URL',
  ];

  const missing = required.filter(
    key => !import.meta.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validate URLs
  try {
    new URL(import.meta.env.VITE_SUPABASE_URL);
    new URL(import.meta.env.VITE_SATELLITE_SERVICE_URL);
  } catch (error) {
    throw new Error('Invalid URL in environment variables');
  }
}

// Run on app initialization
validateEnv();
```

```python
# backend/app/core/config.py
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    GEE_SERVICE_ACCOUNT: str
    GEE_PRIVATE_KEY: str
    GEE_PROJECT_ID: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    PORT: int = 8001
    LOG_LEVEL: str = 'info'

    @validator('GEE_PRIVATE_KEY')
    def validate_private_key(cls, v):
        if not v.startswith('-----BEGIN PRIVATE KEY-----'):
            raise ValueError('Invalid private key format')
        return v

    class Config:
        env_file = '.env'

settings = Settings()
```

## Troubleshooting

### Variable Not Available

```typescript
// Check if variable is defined
console.log('All env vars:', import.meta.env);

// Common issues:
// 1. Missing VITE_ prefix (frontend)
// 2. Not in .env file
// 3. Build cache not cleared
// 4. Wrong environment file loaded
```

### Build Issues

```bash
# Clear cache and rebuild
rm -rf node_modules/.vite
rm -rf dist
npm run build
```

### Runtime Errors

```typescript
// Variables undefined in production
// Ensure:
// 1. Variables set in hosting platform (Vercel/Netlify)
// 2. Variables have VITE_ prefix
// 3. Deployment triggered after setting variables
```

## Checklist

Before deployment, verify:

- [ ] All required variables set
- [ ] No secrets in Git
- [ ] Different keys for each environment
- [ ] URLs are correct
- [ ] Polar.sh using correct server (sandbox/production)
- [ ] Error tracking configured
- [ ] Feature flags set appropriately
- [ ] Debug mode disabled in production

---

Proper environment variable management is crucial for security and correct operation across all environments.
