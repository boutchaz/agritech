# Quick Fix: Column Name Issue - DEPLOY NOW

## The Issue Found

The logs revealed the problem:
```
ERROR: column organization_users.role does not exist
```

The table has `role_id` (foreign key), not `role`.

## The Fix Applied

Changed the Supabase query from:
```typescript
.select('organization_id, role, is_active')  // ❌ Wrong
```

To:
```typescript
.select('organization_id, role_id, is_active')  // ✅ Correct
```

## Deploy Instructions

### Option 1: Using Dokploy (Recommended)

1. **Commit and push the fix**:
   ```bash
   cd agritech-api
   git add .
   git commit -m "fix: use role_id instead of role in organization_users query"
   git push origin main  # or develop
   ```

2. **In Dokploy Dashboard**:
   - Find `agritech-api` application
   - Click "Redeploy" or let auto-deploy trigger
   - Wait ~2-3 minutes for build
   - Check deployment logs for success

3. **Verify deployment**:
   - Check logs: Look for "Nest application successfully started"
   - No errors about missing columns

### Option 2: Docker Compose (If on server directly)

```bash
# SSH into your server
ssh user@your-server

# Navigate to the project
cd /path/to/agritech-api

# Pull latest changes
git pull origin main

# Rebuild and restart
npm run build
docker compose restart agritech-api

# Check logs
docker compose logs -f agritech-api
```

### Option 3: Manual Docker (If Docker daemon is local)

```bash
cd agritech-api
docker compose down agritech-api
docker compose up -d --build agritech-api
docker compose logs -f agritech-api
```

## Test After Deployment

1. **Go to your app**: https://agritech-dashboard.thebzlab.online/select-trial
2. **Select a plan**: Professional
3. **Click "Start Free 14-Day Trial"**
4. **Expected result**:
   - ✅ Success! Redirects to dashboard
   - ✅ Subscription created in database
   - ✅ No 403 error

## Expected New Logs

After deployment, when you try again, you should see:

```
[SubscriptionsService] Creating trial subscription for user fb2ca7bf... and organization eb68eeb1...
[SubscriptionsService] Checking organization memberships for user fb2ca7bf...
[SubscriptionsService] User fb2ca7bf... belongs to 1 organizations: [{"organization_id":"eb68eeb1...","role_id":"bd171c97...","is_active":true}]
[SubscriptionsService] Creating new subscription
[SubscriptionsService] Trial subscription created: <subscription-id>
```

## Verification Checklist

After deploying:

- [ ] Backend logs show no "column does not exist" error
- [ ] User can click "Start Trial" without 403 error
- [ ] User is redirected to dashboard
- [ ] Database has new subscription record:
  ```sql
  SELECT * FROM subscriptions
  WHERE organization_id = 'eb68eeb1-8126-4473-bc42-5367baa00d6d'
  ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Subscription status is 'trialing'
- [ ] Trial end date is 14 days from now

## Rollback (If Needed)

If something goes wrong:

```bash
cd agritech-api
git revert HEAD
npm run build
docker compose restart agritech-api
```

---

## Summary

**Problem**: Service was querying `role` column which doesn't exist
**Solution**: Changed to `role_id` (the actual foreign key column)
**Impact**: This was preventing all trial subscriptions from being created
**Fix time**: ~2 minutes to deploy

**Status**: ✅ **READY TO DEPLOY** - Build successful, fix is simple and safe

🚀 Deploy now and test immediately!
