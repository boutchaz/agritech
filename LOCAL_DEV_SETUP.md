# Local Development Setup - Production Connection

## Configuration Applied

Your local development environment (`project/.env`) is now configured to connect to **production** services:

### Environment Variables

```bash
# Supabase (Production)
VITE_SUPABASE_URL=https://agritech.thebzlab.online
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Auth Supabase (Production)
VITE_AUTH_SUPABASE_URL=https://agritech.thebzlab.online
VITE_AUTH_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NestJS API (Production)
VITE_API_URL=https://agritech-api.thebzlab.online

# Satellite Service
VITE_SATELLITE_SERVICE_URL=http://agritech-sattelite-mwlyas-415549-5-75-154-125.traefik.me

# Polar (Sandbox)
VITE_POLAR_ACCESS_TOKEN=polar_oat_LgY7ir6RvwuoKkWGbuioGAX8GM6uyb5oCzk1L4bnaOj
VITE_POLAR_ORGANIZATION_ID=747f4915-3ab5-4419-980a-ada18203226e
VITE_POLAR_SERVER=sandbox
```

## What This Means

### ✅ Connected Services
- **Supabase Database**: Production database at `https://agritech.thebzlab.online`
- **Authentication**: Production auth system
- **NestJS API**: Production API at `https://agritech-api.thebzlab.online`
- **Satellite Service**: Production satellite service

### ⚠️ Important Notes

1. **You're working with PRODUCTION data**
   - Any changes you make will affect the live system
   - Be careful when deleting or modifying data
   - Test thoroughly before making changes

2. **Frontend runs locally**
   - Your React app runs on `http://localhost:5173`
   - Changes are instant (hot reload)
   - You can test new features before deploying

3. **Backend is production**
   - API calls go to production NestJS API
   - Database queries hit production Supabase
   - No need to run backend services locally

## Starting Local Development

```bash
cd project
npm run dev
```

The dev server will start at `http://localhost:5173` and connect to production services.

## Testing New Features

### List View & Multi-Selection
1. Navigate to Farm Hierarchy page
2. Click the list icon (☰) to enable list view
3. Select multiple farms using checkboxes
4. Use batch actions (Select All, Delete)

### Filters
1. Click "Filtres" button
2. Filter by Type (Main/Sub farms)
3. Filter by Status (Active/Inactive)
4. Reset filters as needed

### Verify Production Connection
Open browser console and check:
- API calls should go to `https://agritech-api.thebzlab.online`
- Supabase calls should go to `https://agritech.thebzlab.online`

## Client Configuration

### Auth Client
File: `project/src/lib/auth-supabase.ts`
```typescript
const authSupabaseUrl = import.meta.env.VITE_AUTH_SUPABASE_URL;
const authSupabaseAnonKey = import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY;
```

### Data Client
File: `project/src/lib/supabase.ts`
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_AUTH_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY;
```

Both clients are correctly configured to use the production URLs.

## Troubleshooting

### CORS Issues
If you see CORS errors:
- Production API is configured to allow `http://localhost:5173`
- Check `CORS_ORIGIN` in production API settings

### Authentication Issues
If login doesn't work:
- Clear browser cookies/storage
- Check that `VITE_AUTH_SUPABASE_URL` is correct
- Verify you're using `authSupabase` client for auth calls

### API Not Responding
If API calls fail:
- Verify API URL: `https://agritech-api.thebzlab.online`
- Check network tab for actual request URL
- Ensure JWT token is being sent in Authorization header

## Reverting to Local Services

To switch back to local backend services, update `.env`:

```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_AUTH_SUPABASE_URL=http://localhost:54321
VITE_API_URL=http://localhost:3001
```

Then restart the dev server.

## Security

⚠️ **NEVER commit `.env` file to git**
- Contains sensitive keys
- Already in `.gitignore`
- Share keys only through secure channels

## Next Steps

1. Start dev server: `npm run dev`
2. Login with production credentials
3. Test list view and filters
4. Verify multi-selection and batch actions
5. Report any issues or bugs

---

**Status**: ✅ Environment configured for production connection
**Date**: 2025-11-22
