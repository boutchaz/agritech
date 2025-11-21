# Frontend Environment Variables Fix

## 🔴 Issues Found

### 1. Malformed ANON_KEY
Your `VITE_SUPABASE_ANON_KEY` appears to be two JWT tokens concatenated together, which is invalid.

**Current (WRONG):**
```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Njc4NzEsImV4cCI6MjA3NDI0Mzg3MX0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
```

This should be the correct key from your Supabase instance.

---

## ✅ Corrected Frontend Environment Variables

Replace your frontend `.env` file with this:

```env
# Supabase Configuration (Self-Hosted)
VITE_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA

# Auth Supabase (Same as main Supabase for self-hosted)
VITE_AUTH_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_AUTH_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA

# Satellite Service
VITE_SATELLITE_SERVICE_URL=http://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me

# Polar (Payment/Subscription)
VITE_POLAR_ACCESS_TOKEN=polar_oat_LgY7ir6RvwuoKkWGbuioGAX8GM6uyb5oCzk1L4bnaOj
VITE_POLAR_ORGANIZATION_ID=747f4915-3ab5-4419-980a-ada18203226e
VITE_POLAR_SERVER=sandbox
VITE_POLAR_CHECKOUT_URL=https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_jd7coexYrSk6mKuKxYAJQwZe523tvHYKyKZDl1X717P/redirect

# Polar Webhook Secret (Backend only - don't expose in frontend)
# POLAR_WEBHOOK_SECRET=polar_whs_vNdGtnYbzJ55eIWh2RwYZXrY268mFGlSX1KvG47mUeo
```

---

## 🔑 Key Changes

### 1. Fixed ANON_KEY
**Old (Malformed):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Njc4NzEsImV4cCI6MjA3NDI0Mzg3MX0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
```

**New (Correct - from your Supabase env):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
```

### 2. Removed Webhook Secret
**⚠️ Security Issue:**
`POLAR_WEBHOOK_SECRET` should **NEVER** be in frontend environment variables!

- ❌ Exposed in frontend = security vulnerability
- ✅ Should only be in backend/server

### 3. Consistent Supabase URLs
Both `VITE_SUPABASE_URL` and `VITE_AUTH_SUPABASE_URL` now point to the same self-hosted instance.

---

## 📋 Step-by-Step Fix

### For Dokploy Deployment:

1. **Go to your frontend application in Dokploy**
2. **Click "Environment Variables"**
3. **Delete or update these variables:**

```env
VITE_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
VITE_AUTH_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_AUTH_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
VITE_SATELLITE_SERVICE_URL=http://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me
VITE_POLAR_ACCESS_TOKEN=polar_oat_LgY7ir6RvwuoKkWGbuioGAX8GM6uyb5oCzk1L4bnaOj
VITE_POLAR_ORGANIZATION_ID=747f4915-3ab5-4419-980a-ada18203226e
VITE_POLAR_SERVER=sandbox
VITE_POLAR_CHECKOUT_URL=https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_jd7coexYrSk6mKuKxYAJQwZe523tvHYKyKZDl1X717P/redirect
```

4. **Remove this variable (security risk):**
```env
POLAR_WEBHOOK_SECRET=polar_whs_vNdGtnYbzJ55eIWh2RwYZXrY268mFGlSX1KvG47mUeo
```

5. **Save changes**
6. **Redeploy frontend**
7. **Clear browser cache** (Ctrl+Shift+Delete)
8. **Test signup again**

---

## 🔍 How to Verify Correct Keys

### Check Your Supabase Anon Key

You can decode the JWT to verify it's correct:

1. Go to https://jwt.io
2. Paste your anon key
3. Check the payload:

```json
{
  "iat": 1763491552,
  "exp": 1893456000,
  "role": "anon",
  "iss": "supabase"
}
```

**Must have:**
- ✅ `role: "anon"`
- ✅ `iss: "supabase"`
- ✅ Valid expiration date

---

## 🛡️ Security Best Practices

### ✅ Safe for Frontend (VITE_ prefix)
```env
VITE_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_SUPABASE_ANON_KEY=eyJhbGci...  (public key, safe to expose)
VITE_POLAR_ACCESS_TOKEN=...  (API token, check if safe)
```

### ❌ NEVER in Frontend
```env
# These should ONLY be in backend/server:
SUPABASE_SERVICE_ROLE_KEY=...  (bypasses RLS!)
POLAR_WEBHOOK_SECRET=...  (validates webhooks)
JWT_SECRET=...  (signs tokens)
POSTGRES_PASSWORD=...  (database access)
```

---

## 🧪 Testing After Fix

### 1. Check Supabase Connection

```javascript
// In browser console (F12)
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### 2. Test Signup

Try signing up with a test email:
- Email: `test@example.com`
- Password: `Test123456!`

### 3. Check Network Tab

Open DevTools (F12) → Network tab:
- Look for request to `https://dokploy.thebzlab.online/auth/v1/signup`
- Should return `200 OK` or `400 Bad Request` (if user exists)
- Should **NOT** return CORS error

---

## 📝 Complete Frontend .env Template

Save this as `.env.production` in your frontend:

```env
# ================================
# SUPABASE CONFIGURATION
# ================================
VITE_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA

# Auth Supabase (same for self-hosted)
VITE_AUTH_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_AUTH_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA

# ================================
# SATELLITE SERVICE
# ================================
VITE_SATELLITE_SERVICE_URL=http://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me

# ================================
# POLAR (PAYMENTS)
# ================================
VITE_POLAR_ACCESS_TOKEN=polar_oat_LgY7ir6RvwuoKkWGbuioGAX8GM6uyb5oCzk1L4bnaOj
VITE_POLAR_ORGANIZATION_ID=747f4915-3ab5-4419-980a-ada18203226e
VITE_POLAR_SERVER=sandbox
VITE_POLAR_CHECKOUT_URL=https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_jd7coexYrSk6mKuKxYAJQwZe523tvHYKyKZDl1X717P/redirect

# ================================
# API ENDPOINTS (if using NestJS API)
# ================================
# VITE_API_URL=https://agritech-api-xxxxx.traefik.me
```

---

## 🔄 If Still Getting CORS Error

### Double-check Supabase Environment Variables

Make sure these are set in your **Supabase** Dokploy app:

```env
SITE_URL=https://agritech-dashboard.thebzlab.online
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/*,https://agritech-dashboard.thebzlab.online/auth/callback*,http://localhost:5173/*
API_EXTERNAL_URL=https://dokploy.thebzlab.online
SUPABASE_PUBLIC_URL=https://dokploy.thebzlab.online
SUPABASE_HOST=dokploy.thebzlab.online
```

### Clear Everything

1. **Clear browser cache** completely
2. **Hard refresh** (Ctrl+Shift+R)
3. **Try incognito/private window**
4. **Check Network tab** for actual error

---

## ✅ Verification Checklist

- [ ] ANON_KEY is single valid JWT (not concatenated)
- [ ] SUPABASE_URL points to `dokploy.thebzlab.online`
- [ ] Webhook secret removed from frontend
- [ ] Frontend redeployed with new env vars
- [ ] Supabase has correct CORS settings
- [ ] Browser cache cleared
- [ ] Tested signup in incognito mode

---

**Status**: ✅ **Ready to Fix**

**Next Steps:**
1. Update frontend environment variables in Dokploy
2. Remove `POLAR_WEBHOOK_SECRET` from frontend
3. Redeploy frontend
4. Clear browser cache
5. Test signup again
