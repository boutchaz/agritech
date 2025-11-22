# Deployment Checklist - Farm Hierarchy Migration

## Current Status
- ✅ Backend NestJS API deployed with `GET /api/v1/farms` endpoint
- ✅ Frontend code updated to use NestJS API
- ❌ Frontend NOT YET deployed to production

## What's Happening
The production site (https://agritech-dashboard.thebzlab.online) is still running **old JavaScript code** that makes direct Supabase API calls. The new code that uses NestJS API is committed to Git but not deployed.

## Evidence
Browser console shows these calls:
- ❌ `https://mvegjdkkbhlhbjpbhpou.supabase.co/rest/v1/farms` (OLD - direct Supabase)
- ✅ Should be: `https://agritech-api.thebzlab.online/api/v1/farms` (NEW - NestJS)

## Deployment Steps

### Option 1: Manual Build & Deploy

```bash
# 1. Build the frontend
cd project
npm run build

# 2. Deploy the dist/ folder to your hosting
# (Upload to your server, or use your deployment tool)
```

### Option 2: CI/CD Pipeline

If you have automated deployments:
1. Ensure latest code is pushed to Git (✅ Already done)
2. Trigger deployment workflow
3. Wait for build to complete
4. Verify new code is deployed

### Option 3: Docker/Container Deployment

If using Docker:
```bash
# Rebuild the frontend container
docker-compose build frontend
docker-compose up -d frontend
```

## Verification After Deployment

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear cache manually in browser settings

2. **Check Console Logs**
   Open https://agritech-dashboard.thebzlab.online/farm-hierarchy

   You should see:
   ```
   🔍 Fetching organization: eb68eeb1-8126-4473-bc42-5367baa00d6d
   🔍 Fetching farms for organization: eb68eeb1-8126-4473-bc42-5367baa00d6d
   📡 Calling API: https://agritech-api.thebzlab.online/api/v1/farms?organization_id=...
   📥 Response status: 200 OK
   ✅ API Response: { success: true, farms: [...], total: 9 }
   ✅ Farms fetched: 9 farms
   ```

3. **Check Network Tab**
   - Should see call to `https://agritech-api.thebzlab.online/api/v1/farms`
   - Should NOT see calls to `https://mvegjdkkbhlhbjpbhpou.supabase.co/rest/v1/farms`

4. **Verify Farms Display**
   - Farms should now be visible in the UI
   - Total farms count should be correct
   - Can click on farms to see details

## Troubleshooting

### If farms still don't appear after deployment:

1. **Check Organization ID**
   ```javascript
   // In browser console
   const { data: { session } } = await supabase.auth.getSession();
   console.log('User ID:', session?.user?.id);

   // Check which organization you're in
   const { data: profile } = await supabase
     .from('profiles')
     .select('current_organization_id')
     .eq('user_id', session?.user?.id)
     .single();
   console.log('Current Org:', profile?.current_organization_id);
   ```

2. **Check if farms exist in database**
   ```javascript
   // In browser console (using service role for debugging)
   // Ask admin to run this query in Supabase SQL editor:
   SELECT COUNT(*) as farm_count
   FROM farms
   WHERE organization_id = 'eb68eeb1-8126-4473-bc42-5367baa00d6d';
   ```

3. **Check NestJS API is responding**
   ```bash
   # Test the API endpoint
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://agritech-api.thebzlab.online/api/v1/farms?organization_id=eb68eeb1-8126-4473-bc42-5367baa00d6d"
   ```

## Files Changed (Already Committed)

- ✅ `agritech-api/src/modules/farms/farms.controller.ts` - Added GET endpoint
- ✅ `agritech-api/src/modules/farms/farms.service.ts` - Added listFarms method
- ✅ `agritech-api/src/modules/farms/dto/list-farms.dto.ts` - Created DTOs
- ✅ `project/src/components/FarmHierarchy/ModernFarmHierarchy.tsx` - Updated to use NestJS API
- ✅ `project/supabase/migrations/00000000000000_schema.sql` - Deprecated old RPC

## Next Steps After Successful Deployment

1. Monitor for errors in production
2. Check that import also works correctly
3. Consider migrating export-farm function next
4. Update [RPC_TO_NESTJS_MIGRATION.md](../RPC_TO_NESTJS_MIGRATION.md) with deployment date
