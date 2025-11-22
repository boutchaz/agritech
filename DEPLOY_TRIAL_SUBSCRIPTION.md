# Deploy Trial Subscription Migration

## Quick Deploy Guide

### Step 1: Deploy Backend (NestJS API)

**On your server (SSH into it):**

```bash
# Navigate to the API directory
cd /path/to/agritech-api

# Pull latest code
git pull origin main  # or develop, depending on your branch

# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Restart the Docker container
docker compose restart agritech-api

# Check logs to verify it started correctly
docker compose logs -f agritech-api
```

**Alternative: Using Dokploy Dashboard**

1. Go to your Dokploy dashboard
2. Find the `agritech-api` application
3. Click "Redeploy" or "Rebuild"
4. Wait for the build to complete
5. Check deployment logs

### Step 2: Verify Backend Deployment

**Test the new endpoint:**

```bash
# First, get a JWT token by logging in
# You can get this from browser DevTools → Application → Local Storage

# Then test the endpoint
curl -X POST https://agritech-api.thebzlab.online/api/v1/subscriptions/trial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "organization_id": "YOUR_ORG_ID",
    "plan_type": "professional"
  }'
```

**Check Swagger documentation:**
- Visit: https://agritech-api.thebzlab.online/api/docs
- Look for the `subscriptions` tag
- You should see `POST /subscriptions/trial`

### Step 3: Deploy Frontend (if not auto-deployed)

**If using Dokploy/Vercel (auto-deploy):**
- Just push to Git, it will auto-deploy

**If manual deployment needed:**

```bash
cd /path/to/project
git pull origin main
npm install
npm run build
# Copy dist folder to your web server
```

### Step 4: Test End-to-End

1. **Open the app**: https://agritech-dashboard.thebzlab.online
2. **Register a new user** (or use an existing test account)
3. **Go to trial selection page**: Should redirect automatically after signup
4. **Select a plan**: Professional (recommended for testing)
5. **Click "Start Free 14-Day Trial"**
6. **Watch browser console** (F12):
   - Should see API call to `/api/v1/subscriptions/trial`
   - Should see success message
7. **Should redirect to dashboard**

---

## Debugging the 403 Error

You mentioned getting this error:
```json
{
  "message": "User does not belong to this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

### What We Added for Debugging

I added debug logging to the backend service that will show:
1. What user ID is being extracted from the JWT
2. All organizations the user belongs to
3. The specific organization being requested
4. Any database errors

### How to Check Logs

**Using Docker:**
```bash
docker compose logs -f agritech-api | grep -i subscription
```

**Or check recent logs:**
```bash
docker compose logs --tail=100 agritech-api
```

### Expected Log Output

When you try to create a trial subscription, you should see:
```
[SubscriptionsService] Creating trial subscription for user abc-123 and organization xyz-789
[SubscriptionsService] Checking organization memberships for user abc-123
[SubscriptionsService] User abc-123 belongs to 1 organizations: [{"organization_id":"xyz-789","role":"...","is_active":true}]
[SubscriptionsService] Creating new subscription
[SubscriptionsService] Trial subscription created: sub-456
```

If you see a 403 error, the logs will show:
```
[SubscriptionsService] User abc-123 does not belong to organization xyz-789. Error: {...}
[SubscriptionsService] Query result - orgUser: null, orgUserError: {...}
```

---

## Troubleshooting Common Issues

### Issue 1: "User does not belong to this organization"

**Possible causes:**

1. **User ID mismatch** - JWT token has different user ID than expected
   - **Check**: Look at logs to see what user ID is extracted
   - **Fix**: Verify the user is logged in with correct account

2. **Organization ID mismatch** - Frontend sending different org ID
   - **Check**: Browser console → Network tab → Request payload
   - **Fix**: Ensure `currentOrganization.id` matches database

3. **Database issue** - User not properly added to organization_users
   - **Check**: Query database:
     ```sql
     SELECT * FROM organization_users WHERE user_id = 'USER_ID';
     ```
   - **Fix**: Run signup flow again or manually insert record

### Issue 2: JWT Token Invalid

**Symptoms:**
- 401 Unauthorized error
- "Invalid token" message

**Fix:**
1. Clear browser cache and localStorage
2. Log out and log back in
3. Get fresh JWT token from Supabase session

### Issue 3: CORS Error

**Symptoms:**
- "CORS policy" error in browser console
- Request blocked

**Fix:**
```typescript
// In agritech-api/src/main.ts
app.enableCors({
  origin: [
    'https://agritech-dashboard.thebzlab.online',
    'http://localhost:5173', // For local dev
  ],
  credentials: true,
});
```

### Issue 4: Environment Variables Missing

**Symptoms:**
- "Server configuration error"
- 500 Internal Server Error

**Fix:**
Verify these env vars in backend `.env`:
```env
SUPABASE_URL=https://dokploy.thebzlab.online
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=your-jwt-secret
```

---

## Manual Database Check

If you want to verify the database state:

```sql
-- Check user's organizations
SELECT
  ou.user_id,
  ou.organization_id,
  ou.is_active,
  o.name as org_name,
  o.slug as org_slug
FROM organization_users ou
JOIN organizations o ON o.id = ou.organization_id
WHERE ou.user_id = 'YOUR_USER_ID';

-- Check existing subscriptions
SELECT * FROM subscriptions
WHERE organization_id = 'YOUR_ORG_ID';

-- Check user profile
SELECT id, email FROM user_profiles
WHERE id = 'YOUR_USER_ID';
```

---

## Quick Fix for Immediate Testing

If you want to test the endpoint quickly without going through the full signup flow:

1. **Log into the app** with an existing account
2. **Open browser DevTools** (F12)
3. **Go to Console** and run:
   ```javascript
   // Get your current session
   const session = await supabase.auth.getSession()
   console.log('Token:', session.data.session.access_token)
   console.log('User ID:', session.data.session.user.id)

   // Get your organization
   const { data } = await supabase.from('organization_users')
     .select('organization_id')
     .eq('user_id', session.data.session.user.id)
     .single()
   console.log('Org ID:', data.organization_id)
   ```

4. **Use these values** in your curl command or Swagger UI

---

## Success Indicators

✅ **Backend deployed successfully** if:
- No errors in `docker compose logs`
- Swagger docs show new endpoint
- Health check passes: `curl https://agritech-api.thebzlab.online/api/health`

✅ **Integration working** if:
- Browser console shows successful POST to `/subscriptions/trial`
- No 403/401 errors
- Redirects to dashboard after trial creation
- Subscription appears in database

✅ **End-to-end working** if:
- User can complete signup
- User can select trial plan
- User can access dashboard with trial subscription active

---

## Rollback Plan

If something goes wrong:

**Backend rollback:**
```bash
cd agritech-api
git revert HEAD  # Revert last commit
npm run build
docker compose restart agritech-api
```

**Frontend rollback:**
```bash
cd project
git revert HEAD
npm run build
# Redeploy
```

**Temporary workaround:**
- Re-enable the Edge Function approach in frontend
- Users can still create trials via old method

---

## Next Steps After Deployment

1. ✅ Monitor logs for first few users
2. ✅ Verify subscriptions are being created correctly
3. ✅ Check trial periods are 14 days
4. ✅ Ensure no orphaned records
5. ⏸️ After 1 week of stable operation:
   - Remove Edge Function code
   - Update documentation
   - Remove debugging logs

---

## Support

If you encounter issues:

1. **Check logs first**: `docker compose logs -f agritech-api`
2. **Check database**: Verify user and org exist
3. **Check network**: Browser DevTools → Network tab
4. **Check JWT**: Ensure token is valid and not expired
5. **Contact**: Share logs and error messages for help

---

**Ready to deploy!** 🚀

The code is built and tested. Just need to:
1. Push to Git
2. Redeploy backend container
3. Test the flow
4. Check logs to diagnose the 403 error
