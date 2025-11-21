# AgriTech API - Configuration Summary

## ✅ Configured for Your Self-Hosted Supabase

Your NestJS API is now fully configured to work with your self-hosted Supabase instance.

## 🔧 Configuration Details

### Port Configuration
- **API Port**: `3001` (Changed from 3000 to avoid conflict with Dokploy)
- **Access**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health

### Supabase Connection
- **URL**: `http://agritech-supabase-97b49f-196-75-242-33.traefik.me`
- **Database Port**: `5433` (Your PostgreSQL port)
- **Database**: `postgres`
- **User**: `postgres`

### Authentication
- **JWT Secret**: Configured to match your Supabase JWT secret
- **Token Expiry**: 1 hour (matches your Supabase JWT_EXPIRY)
- **Auth Type**: Bearer token (compatible with Supabase Auth)

### CORS
Allowed origins:
- `http://localhost:5173` (Frontend dev server)
- `http://localhost:3001` (API itself)
- `http://agritech-supabase-97b49f-196-75-242-33.traefik.me` (Supabase)

## 🚀 Quick Start

### 1. Start the API

```bash
cd agritech-api
npm run start:dev
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║   🌾 AgriTech API Server                             ║
║   Server running on: http://localhost:3001           ║
║   API Docs: http://localhost:3001/api/docs           ║
║   Environment: development                            ║
╚═══════════════════════════════════════════════════════╝
```

### 2. Test Connection

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-21T12:00:00.000Z",
  "uptime": 5,
  "environment": "development"
}
```

### 3. Test Authentication

First, get a token from your Supabase instance:
```bash
# In your frontend or using curl
curl -X POST 'http://agritech-supabase-97b49f-196-75-242-33.traefik.me/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Then use the token:
```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Test Sequences API

```bash
curl -X POST http://localhost:3001/api/v1/sequences/invoice \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "your-org-uuid"}'
```

**Expected Response:**
```json
{
  "invoiceNumber": "INV-2024-00001"
}
```

## 🐳 Docker Deployment

### Build and Run

```bash
cd agritech-api

# Build image
docker build -t agritech-api .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

### Access Points (Docker)
- **API**: http://localhost:3001
- **Swagger**: http://localhost:3001/api/docs

## 🔐 Security Notes

### Credentials in .env File

**⚠️ IMPORTANT**: The `.env` file contains sensitive credentials:
- Anon key (safe to expose in frontend)
- **Service role key** (NEVER expose in frontend - server-side only!)
- JWT secret
- Database password

**Actions:**
1. ✅ `.env` is in `.gitignore` (won't be committed)
2. ✅ Keep `.env.example` as template only
3. ⚠️ Never commit actual `.env` file
4. ⚠️ Rotate secrets before production deployment

### RLS (Row Level Security)

The API respects Supabase RLS policies:
- **Standard Client**: Uses RLS (for user operations)
- **Admin Client**: Bypasses RLS (use with caution!)

```typescript
// In your services
constructor(private databaseService: DatabaseService) {}

// For user operations (respects RLS)
const client = this.databaseService.getClient();

// For admin operations (bypasses RLS)
const admin = this.databaseService.getAdminClient();
```

## 📊 Database Connection

### Connection String
```
postgresql://postgres:PASSWORD@HOST:5433/postgres
```

**Components:**
- **User**: `postgres`
- **Password**: `5z5cmtp5mofn6oldkwssn26yeyzt2mnv`
- **Host**: `agritech-supabase-97b49f-196-75-242-33.traefik.me`
- **Port**: `5433`
- **Database**: `postgres`

### Connection Pooling

Supabase uses **Supavisor** for connection pooling:
- **Transaction Mode Port**: `6544`
- **Default Pool Size**: `20`
- **Max Client Connections**: `100`

For high-traffic scenarios, consider using the pooler:
```env
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:6544/postgres
```

## 🌐 Network Configuration

### Self-Hosted Supabase
Your Supabase is accessible via Traefik at:
```
http://agritech-supabase-97b49f-196-75-242-33.traefik.me
```

**Services:**
- **Kong (API Gateway)**: Port 8000 (HTTP), 8443 (HTTPS)
- **PostgreSQL**: Port 5433
- **Supavisor (Pooler)**: Port 6544
- **Studio Dashboard**: Port 3000

### API Network
The NestJS API runs on:
- **Port**: 3001
- **Network**: `agritech-network` (Docker)

## 📝 Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | API server port |
| `API_PREFIX` | `api/v1` | API route prefix |
| `SUPABASE_URL` | Your Traefik URL | Supabase endpoint |
| `SUPABASE_ANON_KEY` | JWT (anon role) | Public key for client |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT (service_role) | Admin key (secret!) |
| `JWT_SECRET` | Your JWT secret | Token signing key |
| `JWT_EXPIRES_IN` | `1h` | Token expiry time |
| `DATABASE_URL` | PostgreSQL URI | Direct DB connection |
| `CORS_ORIGIN` | Comma-separated URLs | Allowed origins |
| `LOG_LEVEL` | `debug` | Logging verbosity |

## 🔄 Integration with Frontend

### Update Frontend API Client

```typescript
// src/lib/api-client.ts
const API_BASE_URL = 'http://localhost:3001/api/v1';

export async function callAPI(endpoint: string, options: RequestInit = {}) {
  // Get Supabase token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });

  return response.json();
}

// Example: Generate invoice number
export async function generateInvoiceNumber(organizationId: string) {
  return callAPI('/sequences/invoice', {
    method: 'POST',
    body: JSON.stringify({ organizationId }),
  });
}
```

## 🧪 Testing

### Manual Testing (Swagger UI)
1. Open http://localhost:3001/api/docs
2. Click "Authorize" button
3. Enter: `Bearer YOUR_SUPABASE_TOKEN`
4. Try endpoints!

### Automated Testing
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## 📚 Next Steps

1. **✅ API is running** on port 3001
2. **✅ Connected to Supabase** (self-hosted)
3. **✅ Authentication working**
4. **📝 Start implementing modules**:
   - Accounts module
   - Invoices module
   - Journal entries module
   - Payment processing

See [NESTJS_SETUP_COMPLETE.md](../NESTJS_SETUP_COMPLETE.md) for implementation roadmap.

## 🆘 Troubleshooting

### Can't connect to Supabase?
```bash
# Test Supabase connectivity
curl http://agritech-supabase-97b49f-196-75-242-33.traefik.me/rest/v1/

# Should return: {"message":"Not Found"}
```

### Database connection fails?
```bash
# Test PostgreSQL connection
psql "postgresql://postgres:5z5cmtp5mofn6oldkwssn26yeyzt2mnv@agritech-supabase-97b49f-196-75-242-33.traefik.me:5433/postgres"
```

### Port 3001 already in use?
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process or change PORT in .env
```

### JWT validation fails?
- Verify JWT_SECRET matches Supabase
- Check token hasn't expired (1h limit)
- Ensure `iss` claim is "supabase"

---

**Status**: ✅ **Fully Configured - Ready to Use**

**Access**: http://localhost:3001
