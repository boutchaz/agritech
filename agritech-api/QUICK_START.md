# Quick Start Guide

## 🚀 Get Running in 3 Minutes

### Step 1: Configure Environment (1 min)

```bash
cd agritech-api
cp .env.example .env
```

Edit `.env` - **Replace these values:**
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=any-random-string-change-in-production
```

**Where to find Supabase keys:**
1. Go to https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` → `SUPABASE_ANON_KEY`
   - `service_role` `secret` → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Start Server (1 min)

```bash
npm run start:dev
```

Wait for:
```
╔═══════════════════════════════════════════════════════╗
║   🌾 AgriTech API Server                             ║
║   Server running on: http://localhost:3000           ║
╚═══════════════════════════════════════════════════════╝
```

### Step 3: Test API (1 min)

**Open in browser:**
- Swagger UI: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health

**Test with curl:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-21T12:00:00.000Z",
  "uptime": 5,
  "environment": "development"
}
```

## ✅ You're Ready!

The API is running and ready for development.

### Next Steps:

1. **Explore Swagger UI**: http://localhost:3000/api/docs
2. **Test Authentication**: Get a Supabase token from your frontend
3. **Call Sequences Endpoint**: Generate your first invoice number
4. **Start Implementing**: Pick a module from `src/modules/`

### Test Authenticated Endpoint:

```bash
# Get token from Supabase (in your frontend console):
const { data } = await supabase.auth.getSession()
const token = data.session.access_token

# Then use it:
curl -X POST http://localhost:3000/api/v1/sequences/invoice \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "your-org-uuid-here"}'
```

## 🐛 Troubleshooting

### Server won't start?
```bash
# Make sure you're in the right directory
cd agritech-api

# Check Node version (need 20+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database connection issues?
- Verify `SUPABASE_URL` has `https://` prefix
- Check Supabase project is active
- Confirm service role key is correct (not anon key)

### Port 3000 already in use?
```bash
# Change port in .env
PORT=3001
```

## 📖 Full Documentation

See [README.md](./README.md) and [NESTJS_SETUP_COMPLETE.md](../NESTJS_SETUP_COMPLETE.md)
