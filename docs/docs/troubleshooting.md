# Troubleshooting Guide

This guide covers common issues you may encounter while developing or deploying the AgriTech Platform and their solutions.

## Table of Contents

- [Development Issues](#development-issues)
- [Database & Supabase Issues](#database--supabase-issues)
- [Authentication & Authorization Issues](#authentication--authorization-issues)
- [Satellite Service Issues](#satellite-service-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Performance Issues](#performance-issues)
- [Type & Import Issues](#type--import-issues)

## Development Issues

### Module Not Found Errors

**Problem**: Getting `Module not found` or `Cannot find module '@/...'` errors.

**Symptoms**:
```
Error: Cannot find module '@/lib/supabase'
Error: Cannot resolve './components/ui/input'
```

**Solutions**:

1. **Install dependencies**:
   ```bash
   cd /Users/boutchaz/Documents/CodeLovers/agritech/project
   npm install
   ```

2. **Verify path alias configuration**:
   Check `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

3. **Restart TypeScript server**:
   - In VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
   - Or restart your IDE

4. **Clear Vite cache**:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### Hot Reload Not Working

**Problem**: Changes to files are not reflected in the browser.

**Solutions**:

1. **Check Vite config** in `vite.config.ts`:
   ```typescript
   export default defineConfig({
     server: {
       watch: {
         usePolling: true, // For Docker/WSL
       },
     },
   });
   ```

2. **Clear browser cache**: Hard refresh with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

3. **Restart dev server**:
   ```bash
   # Kill the process
   pkill -f "vite"
   # Restart
   npm run dev
   ```

### ESLint Errors on Save

**Problem**: ESLint shows errors but won't auto-fix on save.

**Solutions**:

1. **Configure VS Code** in `.vscode/settings.json`:
   ```json
   {
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"]
   }
   ```

2. **Run lint manually**:
   ```bash
   npm run lint:fix
   ```

3. **Check ESLint configuration**: Ensure `.eslintrc.json` or `eslint.config.js` exists

## Database & Supabase Issues

### RLS Policy Blocks Queries

**Problem**: Queries fail with "permission denied" or return empty results.

**Symptoms**:
```
Error: new row violates row-level security policy for table "farms"
PostgresError: permission denied for table users
```

**Root Cause**: Row Level Security (RLS) policies prevent access.

**Solutions**:

1. **Verify user is authenticated**:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user);
   ```

2. **Check organization membership**:
   ```typescript
   const { data: orgs } = await supabase.rpc('get_user_organizations');
   console.log('User organizations:', orgs);
   ```

3. **Verify user has correct role**:
   ```typescript
   const { userRole, currentOrganization } = useAuth();
   console.log('Role:', userRole, 'Org:', currentOrganization?.id);
   ```

4. **Test query with service role** (local development only):
   ```typescript
   // Create admin client (temporary for debugging)
   import { createClient } from '@supabase/supabase-js';
   const adminClient = createClient(
     process.env.VITE_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY! // NEVER use in production frontend
   );
   ```

5. **Review RLS policies** in Supabase Dashboard → Database → Policies

6. **Common RLS policy fixes**:
   ```sql
   -- Example: Allow users to read their organization's farms
   CREATE POLICY "Users can view farms in their organizations"
   ON farms FOR SELECT
   USING (
     organization_id IN (
       SELECT organization_id
       FROM organization_users
       WHERE user_id = auth.uid()
     )
   );
   ```

### Type Generation Fails

**Problem**: `npm run db:generate-types` fails or generates outdated types.

**Solutions**:

1. **Ensure Supabase project is linked**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

2. **Use remote type generation**:
   ```bash
   npm run db:generate-types-remote
   ```

3. **Check Supabase CLI version**:
   ```bash
   npx supabase --version
   # Update if needed
   npm install -g supabase
   ```

4. **Verify .env variables**:
   ```bash
   # Check these are set
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

5. **Manual type generation**:
   ```bash
   npx supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
   ```

### Migration Fails to Apply

**Problem**: `npm run db:push` or `npm run db:reset` fails.

**Symptoms**:
```
Error: migration 20240101000000_add_accounting.sql failed
syntax error at or near "CREATE"
```

**Solutions**:

1. **Check migration syntax**:
   - Ensure all SQL statements end with semicolons
   - Verify no syntax errors
   - Test migration locally first: `npm run db:reset`

2. **Review migration dependencies**:
   - Ensure migrations are in correct order
   - Check for missing foreign key references
   - Verify tables exist before adding constraints

3. **Reset local database**:
   ```bash
   npx supabase db reset
   ```

4. **Manually fix remote database**:
   ```bash
   # Connect to remote database
   psql postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

   # Or use Supabase SQL Editor
   ```

5. **Create rollback migration**:
   ```bash
   npx supabase migration new rollback_broken_migration
   ```

### Supabase Local Not Starting

**Problem**: `npm run db:start` fails.

**Solutions**:

1. **Check Docker is running**:
   ```bash
   docker ps
   # Start Docker Desktop if not running
   ```

2. **Check port conflicts**:
   ```bash
   # Default ports: 54321 (API), 54323 (Studio)
   lsof -i :54321
   # Kill conflicting processes
   ```

3. **Reset Supabase containers**:
   ```bash
   npx supabase stop
   npx supabase start
   ```

4. **Clear Supabase data**:
   ```bash
   npx supabase stop --no-backup
   npx supabase start
   ```

5. **Check disk space**:
   ```bash
   df -h
   ```

## Authentication & Authorization Issues

### User Not Redirected After Login

**Problem**: After successful login, user stays on login page or gets errors.

**Solutions**:

1. **Check redirect parameter**:
   ```typescript
   // In login component
   const searchParams = new URLSearchParams(window.location.search);
   const redirect = searchParams.get('redirect') || '/dashboard';

   // After successful login
   navigate({ to: redirect });
   ```

2. **Verify auth state updates**:
   ```typescript
   // In MultiTenantAuthProvider
   useEffect(() => {
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         console.log('Auth event:', event, session);
       }
     );
     return () => subscription.unsubscribe();
   }, []);
   ```

3. **Check TanStack Router auth check**:
   ```typescript
   // In _authenticated.tsx
   export const Route = createFileRoute('/_authenticated')({
     beforeLoad: async ({ context, location }) => {
       const { user } = await context.auth.getUser();
       if (!user) {
         throw redirect({
           to: '/login',
           search: { redirect: location.href },
         });
       }
     },
   });
   ```

### CASL Permissions Not Working

**Problem**: Users can see actions they shouldn't have access to.

**Solutions**:

1. **Verify ability definition** in `src/lib/casl/defineAbilityFor.ts`:
   ```typescript
   import { defineAbility } from '@casl/ability';

   export const defineAbilityFor = (user, organization, subscription) => {
     return defineAbility((can, cannot) => {
       // Check role hierarchy
       if (role === 'organization_admin') {
         can('manage', 'all');
       }

       // Check subscription limits
       if (subscription?.max_farms && farmsCount >= subscription.max_farms) {
         cannot('create', 'Farm');
       }
     });
   };
   ```

2. **Update ability context**:
   ```typescript
   const { ability, updateAbility } = useAbility();

   // When subscription changes
   useEffect(() => {
     if (subscription) {
       updateAbility();
     }
   }, [subscription]);
   ```

3. **Debug ability rules**:
   ```typescript
   import { useCan } from '@/lib/casl/AbilityContext';

   const canCreateFarm = useCan('create', 'Farm');
   console.log('Can create farm:', canCreateFarm);
   console.log('Ability rules:', ability.rules);
   ```

### Session Expires Unexpectedly

**Problem**: Users are logged out randomly.

**Solutions**:

1. **Enable session refresh**:
   ```typescript
   // In src/lib/supabase.ts
   const supabase = createClient(supabaseUrl, supabaseKey, {
     auth: {
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: true,
     },
   });
   ```

2. **Check token expiry settings** in Supabase Dashboard → Authentication → Settings:
   - JWT expiry: 3600 seconds (1 hour) recommended
   - Refresh token expiry: 604800 seconds (7 days) recommended

3. **Handle session refresh errors**:
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'TOKEN_REFRESHED') {
       console.log('Token refreshed successfully');
     } else if (event === 'SIGNED_OUT') {
       navigate({ to: '/login' });
     }
   });
   ```

## Satellite Service Issues

### Satellite Service Timeout

**Problem**: Satellite analysis requests timeout or take too long.

**Symptoms**:
```
Error: Request timeout after 60000ms
504 Gateway Timeout
```

**Solutions**:

1. **Reduce AOI size**: Large parcels take longer to process
   ```typescript
   // Split large parcels into sub-parcels
   const subParcels = splitParcelIntoGrid(parcel, maxAreaHectares: 50);
   ```

2. **Increase timeout**:
   ```typescript
   // In src/lib/satellite-api.ts
   const response = await fetch(url, {
     method: 'POST',
     body: JSON.stringify(data),
     signal: AbortSignal.timeout(120000), // 2 minutes
   });
   ```

3. **Use batch processing**:
   ```typescript
   // Queue job for later processing
   const { data } = await satelliteApi.startBatchJob({
     parcelIds: [id1, id2, id3],
     indices: ['NDVI', 'NDRE'],
   });
   ```

4. **Check cloud coverage first**:
   ```typescript
   const { hasCloudFreeImage } = await satelliteApi.checkCloudCoverage({
     aoi: parcel.boundary,
     startDate: '2024-01-01',
     endDate: '2024-01-31',
   });
   ```

5. **Optimize date range**: Narrower date ranges process faster
   ```typescript
   // Use last 30 days instead of 90 days
   const startDate = new Date();
   startDate.setDate(startDate.getDate() - 30);
   ```

### Google Earth Engine Authentication Failed

**Problem**: Satellite service returns authentication errors.

**Symptoms**:
```
Error: Google Earth Engine authentication failed
EEException: Service account credentials not found
```

**Solutions**:

1. **Verify GEE credentials** in satellite service `.env`:
   ```bash
   GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
   GEE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   GEE_PROJECT_ID=your-gee-project-id
   ```

2. **Check service account permissions**:
   - Go to Google Cloud Console → IAM
   - Ensure service account has "Earth Engine Resource Writer" role

3. **Re-initialize GEE**:
   ```python
   # In satellite-indices-service/app/core/gee_auth.py
   import ee
   credentials = ee.ServiceAccountCredentials(
     email=SERVICE_ACCOUNT,
     key_data=PRIVATE_KEY
   )
   ee.Initialize(credentials, project=PROJECT_ID)
   ```

4. **Test GEE connection**:
   ```bash
   cd satellite-indices-service
   python -c "import ee; ee.Initialize(); print('GEE initialized successfully')"
   ```

### No Satellite Data Available

**Problem**: API returns "No images found" for valid date range.

**Solutions**:

1. **Check cloud coverage threshold**:
   ```typescript
   // Lower cloud threshold to find more images
   const config = {
     cloudCoverageThreshold: 30, // Instead of 10
   };
   ```

2. **Expand date range**:
   ```typescript
   const startDate = new Date();
   startDate.setDate(startDate.getDate() - 90); // 90 days instead of 30
   ```

3. **Verify AOI coordinates**:
   ```typescript
   // Ensure coordinates are [longitude, latitude]
   const aoi = {
     type: 'Polygon',
     coordinates: [[
       [-5.0, 34.0], // [lon, lat] NOT [lat, lon]
       [-5.0, 35.0],
       [-4.0, 35.0],
       [-4.0, 34.0],
       [-5.0, 34.0],
     ]],
   };
   ```

4. **Check Sentinel-2 coverage**: Some regions have limited coverage
   - Visit: https://scihub.copernicus.eu/
   - Verify Sentinel-2 data exists for your AOI

## Build & Deployment Issues

### Build Fails with TypeScript Errors

**Problem**: `npm run build` fails even though dev mode works.

**Solutions**:

1. **Run type check locally**:
   ```bash
   npm run type-check
   ```

2. **Fix common type issues**:
   ```typescript
   // Add explicit types
   const data: Farm[] = await fetchFarms();

   // Use type guards
   if (value !== null && value !== undefined) {
     // Use value safely
   }

   // Fix any types
   const result = apiCall() as unknown as ExpectedType;
   ```

3. **Check for missing types**:
   ```bash
   # Install missing type definitions
   npm install --save-dev @types/[package-name]
   ```

4. **Temporarily ignore errors** (not recommended):
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "skipLibCheck": true
     }
   }
   ```

### CORS Errors in Production

**Problem**: API requests fail with CORS errors in production.

**Symptoms**:
```
Access to fetch at 'https://api.example.com' from origin 'https://app.example.com'
has been blocked by CORS policy
```

**Solutions**:

1. **Configure Supabase CORS**:
   - Go to Supabase Dashboard → Settings → API
   - Add your domain to allowed origins

2. **Configure satellite service CORS**:
   ```python
   # In satellite-indices-service/app/main.py
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
     CORSMiddleware,
     allow_origins=[
       "https://your-domain.com",
       "https://www.your-domain.com",
     ],
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
   )
   ```

3. **Use Supabase Edge Functions** as proxy:
   ```typescript
   // Instead of direct API call
   const response = await supabase.functions.invoke('satellite-proxy', {
     body: { /* request data */ },
   });
   ```

### Environment Variables Not Available

**Problem**: `process.env.VITE_*` is undefined in production.

**Solutions**:

1. **Ensure variables are prefixed** with `VITE_`:
   ```bash
   # .env
   VITE_SUPABASE_URL=https://...  # ✅ Available in browser
   SUPABASE_SERVICE_KEY=...        # ❌ NOT available (server-only)
   ```

2. **Rebuild after changing .env**:
   ```bash
   npm run build
   ```

3. **Set in hosting platform**:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - Add all `VITE_*` variables

4. **Verify variables in build**:
   ```typescript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   ```

## Performance Issues

### Slow Initial Page Load

**Problem**: Application takes too long to load initially.

**Solutions**:

1. **Enable code splitting**:
   ```typescript
   // Lazy load routes
   const Dashboard = lazy(() => import('./routes/dashboard'));
   ```

2. **Optimize bundle size**:
   ```bash
   # Analyze bundle
   npm run build -- --analyze

   # Look for large dependencies
   npx vite-bundle-visualizer
   ```

3. **Use dynamic imports**:
   ```typescript
   // Import heavy libraries on demand
   const { jsPDF } = await import('jspdf');
   ```

4. **Optimize images**:
   - Use WebP format
   - Add responsive image sizes
   - Lazy load images below fold

### React Query Refetches Too Often

**Problem**: API called excessively, causing performance issues.

**Solutions**:

1. **Configure staleTime**:
   ```typescript
   useQuery({
     queryKey: ['farms'],
     queryFn: fetchFarms,
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
   ```

2. **Disable refetch on mount**:
   ```typescript
   useQuery({
     queryKey: ['expensive-data'],
     queryFn: fetchExpensiveData,
     refetchOnMount: false,
     refetchOnWindowFocus: false,
   });
   ```

3. **Use global defaults**:
   ```typescript
   // In QueryClient setup
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 1 * 60 * 1000, // 1 minute
         refetchOnWindowFocus: false,
       },
     },
   });
   ```

### Map Rendering Slow

**Problem**: Leaflet map with many parcels is slow.

**Solutions**:

1. **Use clustering**:
   ```typescript
   import MarkerClusterGroup from 'react-leaflet-cluster';

   <MarkerClusterGroup>
     {parcels.map(parcel => <Marker key={parcel.id} {...} />)}
   </MarkerClusterGroup>
   ```

2. **Simplify geometries**:
   ```typescript
   import { simplify } from '@turf/simplify';

   const simplified = simplify(parcel.boundary, {
     tolerance: 0.0001,
     highQuality: false,
   });
   ```

3. **Virtualize parcel list**:
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual';
   ```

4. **Lazy load map**:
   ```typescript
   const Map = lazy(() => import('./components/Map'));
   ```

## Type & Import Issues

### TypeScript Type Errors After Schema Change

**Problem**: TypeScript errors after database schema updates.

**Solutions**:

1. **Regenerate types**:
   ```bash
   npm run db:generate-types-remote
   ```

2. **Restart TypeScript server**:
   - VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

3. **Clear TypeScript cache**:
   ```bash
   rm -rf node_modules/.cache
   ```

4. **Verify types file updated**:
   ```bash
   head -n 20 src/types/database.types.ts
   ```

### Circular Dependency Warnings

**Problem**: Console warnings about circular dependencies.

**Solutions**:

1. **Separate Supabase clients**:
   ```typescript
   // Use auth-supabase.ts for auth-only operations
   import { supabase } from '@/lib/auth-supabase';

   // Use supabase.ts for data operations
   import { supabase } from '@/lib/supabase';
   ```

2. **Extract shared types**:
   ```typescript
   // Create types/index.ts for shared types
   export type { Farm, Parcel } from './database.types';
   ```

3. **Use dynamic imports**:
   ```typescript
   const module = await import('./circular-dependency-module');
   ```

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/yourusername/agritech/issues)
2. Review [Supabase Status](https://status.supabase.com/)
3. Consult the [CLAUDE.md](/Users/boutchaz/Documents/CodeLovers/agritech/CLAUDE.md) file
4. Join the community Discord (if available)
5. Contact support at support@agritech.example.com

## Debugging Tips

### Enable Debug Logging

```typescript
// In development
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}

// React Query debugging
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Browser DevTools

- **Network tab**: Check API responses and status codes
- **Console**: Look for error messages and warnings
- **React DevTools**: Inspect component props and state
- **Application tab**: Check localStorage and session storage

### Common Error Messages

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `auth.session is null` | User not authenticated | Check login flow |
| `Cannot read property of undefined` | Missing null check | Add optional chaining `?.` |
| `Hydration mismatch` | Server/client render different | Ensure consistent rendering |
| `Maximum update depth exceeded` | Infinite loop in useEffect | Add proper dependencies |
| `429 Too Many Requests` | Rate limiting | Implement request throttling |
