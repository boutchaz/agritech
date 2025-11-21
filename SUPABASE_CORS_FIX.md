# 🔧 Supabase CORS Fix

## Problem

```
Access to fetch at 'https://dokploy.thebzlab.online/auth/v1/signup'
from origin 'https://agritech-dashboard.thebzlab.online'
has been blocked by CORS policy
```

---

## ✅ Solution

Update these environment variables in your Supabase Dokploy deployment:

### 1. Update SITE_URL

**Current:**
```env
SITE_URL=http://localhost:3000
```

**Change to:**
```env
SITE_URL=https://agritech-dashboard.thebzlab.online
```

### 2. Update ADDITIONAL_REDIRECT_URLS

**Current:**
```env
ADDITIONAL_REDIRECT_URLS=http://agritech-supabase-97b49f-196-75-242-33.traefik.me/*,http://localhost:3000/*
```

**Change to:**
```env
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/*,https://agritech-dashboard.thebzlab.online/auth/callback*,http://localhost:5173/*,http://localhost:3000/*
```

### 3. Update API_EXTERNAL_URL (Use HTTPS)

**Current:**
```env
API_EXTERNAL_URL=http://agritech-supabase-97b49f-196-75-242-33.traefik.me
```

**Change to:**
```env
API_EXTERNAL_URL=https://dokploy.thebzlab.online
```

### 4. Update SUPABASE_PUBLIC_URL (Use HTTPS)

**Current:**
```env
SUPABASE_PUBLIC_URL=http://agritech-supabase-97b49f-196-75-242-33.traefik.me
```

**Change to:**
```env
SUPABASE_PUBLIC_URL=https://dokploy.thebzlab.online
```

### 5. Update SUPABASE_HOST

**Current:**
```env
SUPABASE_HOST=agritech-supabase-97b49f-196-75-242-33.traefik.me
```

**Change to:**
```env
SUPABASE_HOST=dokploy.thebzlab.online
```

---

## 📝 Complete Updated Configuration

Replace these sections in your Supabase environment variables:

```env
############
# Auth - Configuration for the GoTrue authentication server.
############

## General
SITE_URL=https://agritech-dashboard.thebzlab.online
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/*,https://agritech-dashboard.thebzlab.online/auth/callback*,http://localhost:5173/*,http://localhost:3000/*
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=https://dokploy.thebzlab.online

############
# Studio - Configuration for the Dashboard
############

STUDIO_DEFAULT_ORGANIZATION=Default Organization
STUDIO_DEFAULT_PROJECT=Default Project

STUDIO_PORT=3000
# replace if you intend to use Studio outside of localhost
SUPABASE_PUBLIC_URL=https://dokploy.thebzlab.online

############
# Secrets (Update host)
############

SUPABASE_HOST=dokploy.thebzlab.online
```

---

## 🔄 Steps to Apply Fix

### In Dokploy Dashboard:

1. **Go to your Supabase application**
2. **Click on "Environment Variables"**
3. **Update the following variables:**

```env
SITE_URL=https://agritech-dashboard.thebzlab.online
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/*,https://agritech-dashboard.thebzlab.online/auth/callback*,http://localhost:5173/*
API_EXTERNAL_URL=https://dokploy.thebzlab.online
SUPABASE_PUBLIC_URL=https://dokploy.thebzlab.online
SUPABASE_HOST=dokploy.thebzlab.online
```

4. **Click "Save"**
5. **Redeploy the Supabase application**
6. **Wait for containers to restart (~1-2 minutes)**

---

## 🧪 Test After Applying Fix

### 1. Check Supabase is accessible

```bash
curl https://dokploy.thebzlab.online/rest/v1/
# Should return: {"message":"Not Found"}
```

### 2. Test auth endpoint

```bash
curl -X POST https://dokploy.thebzlab.online/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Test from your frontend

Open your frontend at `https://agritech-dashboard.thebzlab.online` and try to sign up/login.

---

## 🔍 Why This Happens

### CORS Basics

CORS (Cross-Origin Resource Sharing) is a browser security feature that blocks requests between different origins.

**Your setup:**
- **Frontend**: `https://agritech-dashboard.thebzlab.online`
- **Supabase**: `https://dokploy.thebzlab.online`

These are **different origins** (different subdomains), so the browser blocks requests unless the server (Supabase) explicitly allows it.

### What the Variables Do

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | Default redirect after auth actions |
| `ADDITIONAL_REDIRECT_URLS` | Allowed origins/redirects for auth |
| `API_EXTERNAL_URL` | External URL for Supabase API |
| `SUPABASE_PUBLIC_URL` | Public URL for Supabase Studio/API |

---

## ⚠️ Important Notes

### 1. Use HTTPS in Production

**Always use HTTPS** for production domains:
```env
# ❌ Don't use HTTP in production
SITE_URL=http://agritech-dashboard.thebzlab.online

# ✅ Use HTTPS
SITE_URL=https://agritech-dashboard.thebzlab.online
```

### 2. Wildcard Patterns

Use wildcards for paths:
```env
# ✅ Allows all paths under domain
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/*

# ✅ Allows specific callback paths
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/auth/callback*
```

### 3. Multiple URLs

Separate multiple URLs with commas (no spaces):
```env
ADDITIONAL_REDIRECT_URLS=https://app.com/*,https://admin.app.com/*,http://localhost:5173/*
```

### 4. Development vs Production

Keep localhost for local development:
```env
ADDITIONAL_REDIRECT_URLS=https://agritech-dashboard.thebzlab.online/*,http://localhost:5173/*,http://localhost:3000/*
```

---

## 🔧 Frontend Configuration

After fixing Supabase, update your frontend Supabase client:

### Update Frontend .env

```env
# .env or .env.production
VITE_SUPABASE_URL=https://dokploy.thebzlab.online
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM0OTE1NTIsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ok7p9M-b444e7aBbIF0tGIogkN2hX-g2o1XaDH9bwzA
```

### Update Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dokploy.thebzlab.online'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // More secure
  },
})
```

---

## 🔄 Complete Redirect Flow

After the fix, auth will work like this:

```
1. User clicks "Sign Up" on frontend
   https://agritech-dashboard.thebzlab.online

2. Frontend calls Supabase auth
   POST https://dokploy.thebzlab.online/auth/v1/signup

3. Supabase checks ADDITIONAL_REDIRECT_URLS
   ✅ Origin is allowed (CORS passes)

4. Supabase creates user and sends email
   Email contains link with redirect to SITE_URL

5. User clicks email link
   https://dokploy.thebzlab.online/auth/v1/verify?token=...&redirect_to=https://agritech-dashboard.thebzlab.online/auth/callback

6. Supabase verifies token and redirects
   → https://agritech-dashboard.thebzlab.online/auth/callback

7. Frontend detects session
   supabase.auth.onAuthStateChange() triggers

8. User is logged in!
```

---

## 🆘 Troubleshooting

### Still Getting CORS Error?

**Check:**
1. ✅ Saved environment variables in Dokploy
2. ✅ Redeployed Supabase after changes
3. ✅ Cleared browser cache
4. ✅ Used HTTPS (not HTTP) for production URLs
5. ✅ No typos in domain names

### Wrong Redirect After Login?

**Check:**
1. `SITE_URL` matches your frontend domain
2. `ADDITIONAL_REDIRECT_URLS` includes callback path
3. Frontend passes `redirectTo` parameter:

```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://agritech-dashboard.thebzlab.online/auth/callback'
  }
})
```

### Email Links Not Working?

**Check:**
1. `API_EXTERNAL_URL` is set to your Supabase domain
2. `MAILER_URLPATHS_*` are correct
3. SMTP is configured (or use Supabase's email for dev)

---

## ✅ Verification Checklist

After applying the fix:

- [ ] Updated `SITE_URL` to your frontend domain
- [ ] Updated `ADDITIONAL_REDIRECT_URLS` with all allowed URLs
- [ ] Updated `API_EXTERNAL_URL` to Supabase domain (HTTPS)
- [ ] Updated `SUPABASE_PUBLIC_URL` to Supabase domain (HTTPS)
- [ ] Updated `SUPABASE_HOST` to Supabase domain
- [ ] Saved changes in Dokploy
- [ ] Redeployed Supabase
- [ ] Updated frontend `.env` with Supabase URL
- [ ] Cleared browser cache
- [ ] Tested signup/login
- [ ] Verified email links work
- [ ] Checked redirect after auth

---

## 📚 Additional Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **CORS Explained**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Dokploy Docs**: https://docs.dokploy.com

---

**Status**: ✅ **Fix Ready to Apply**

**Next Steps:**
1. Update environment variables in Dokploy
2. Redeploy Supabase
3. Test authentication from frontend
4. Enjoy working auth! 🎉
