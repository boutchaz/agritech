# Quick Start: Polar.sh Integration

## Prerequisites

- ✅ Supabase project created
- ✅ Polar.sh account created
- ⚠️ Docker Desktop installed and running (for local development)

## 5-Minute Setup

### 1. Get Your Credentials

**From Polar.sh Dashboard**:
```
Organization ID: Settings → Organization → Copy ID
API Token: Settings → API Keys → Create API Key
```

**From Supabase Dashboard**:
```
Project URL: Settings → API → Project URL
Anon Key: Settings → API → anon public key
Service Role Key: Settings → API → service_role key
```

### 2. Update .env File

```bash
# Polar.sh
VITE_POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
VITE_POLAR_ORGANIZATION_ID=org_xxxxxxxxxxxxx

# Supabase (if not already set)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Create Products in Polar.sh

Go to Polar.sh → Products → Create:

**Essential Plan**: $25/month
- Metadata: `{"plan_type": "essential"}`

**Professional Plan**: $75/month
- Metadata: `{"plan_type": "professional"}`

**Enterprise Plan**: Custom pricing
- Metadata: `{"plan_type": "enterprise"}`

### 4. Create Database Tables

**Option A - With Docker Running**:
```bash
npx supabase db reset
```

**Option B - Without Docker** (Manual):
1. Open Supabase Dashboard → SQL Editor
2. Copy content from: `supabase/migrations/20250930160000_create_subscriptions.sql`
3. Run the SQL query

### 5. Deploy Webhook (Optional but Recommended)

```bash
# Deploy function
npx supabase functions deploy polar-webhook --no-verify-jwt

# You'll get a URL like:
# https://xxxxx.supabase.co/functions/v1/polar-webhook
```

Then in Polar.sh:
1. Settings → Webhooks → Add Endpoint
2. Paste your webhook URL
3. Select events: subscription.created, updated, canceled, past_due
4. Copy the webhook secret
5. Set it in Supabase:
   ```bash
   npx supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### 6. Restart Your App

```bash
npm run dev
```

## Test It Out

1. Navigate to `http://localhost:5173/settings/subscription`
2. You should see the three subscription plans
3. Your org will have a 14-day trial of Essential Plan by default
4. Try clicking "Upgrade Now" to see the checkout flow

## What You Get

✅ Subscription management UI at `/settings/subscription`
✅ Trial banner for users on trial
✅ Usage tracking (farms, parcels, users, satellite reports)
✅ Feature gating (analytics, sensors, AI locked behind plans)
✅ Automatic sync with Polar.sh via webhooks

## Common Issues

**"Subscription not found"**
- Database migration not applied
- Run: `npx supabase db reset` or apply SQL manually

**"Webhook 401 error"**
- Webhook secret not set
- Run: `npx supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxx`

**"Feature gates not working"**
- `.env` not updated or app not restarted
- Check browser console for errors

## Full Documentation

- **Detailed Setup**: See `WEBHOOK_SETUP.md`
- **Integration Guide**: See `POLAR_INTEGRATION.md`
- **Database Schema**: See `supabase/migrations/20250930160000_create_subscriptions.sql`

## Support

Need help? Check:
- Polar.sh docs: https://docs.polar.sh
- Supabase docs: https://supabase.com/docs
- Project issues: Create an issue in the repo
