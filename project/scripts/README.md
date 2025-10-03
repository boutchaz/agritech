# Deployment Scripts

This directory contains deployment and utility scripts for the AgriTech platform.

## 🚀 Quick Deploy

### One-Click Deployment

Deploy the entire platform (database, functions, seed data) to a fresh Supabase instance:

**Local:**
```bash
npm run deploy:fresh:local
# or
./scripts/deploy-fresh.sh local
```

**Remote:**
```bash
npm run deploy:fresh:remote
# or
./scripts/deploy-fresh.sh remote
```

## 📜 Available Scripts

### `deploy-fresh.sh`

One-click deployment script that handles:
- Database schema creation
- RLS policies
- Database functions and triggers
- Edge Functions deployment
- Seed data (roles, etc.)
- Extension installation (pg_net, pgcrypto, pgjwt)
- Database configuration

**Usage:**
```bash
./scripts/deploy-fresh.sh [local|remote]
```

**What it does:**
1. Checks prerequisites (Supabase CLI, Docker)
2. Starts local Supabase (if local)
3. Applies database schema
4. Applies all migrations
5. Seeds essential data (roles, etc.)
6. Deploys Edge Functions
7. Configures database settings
8. Verifies deployment

**Output:**
- Shows deployment progress
- Displays verification results
- Provides access URLs and next steps

## 🛠️ Requirements

- **Supabase CLI**: `npm install -g supabase`
- **Docker Desktop**: For local deployment
- **PostgreSQL client (psql)**: Usually included with Postgres

## 📝 Notes

### Local Deployment
- Automatically starts Supabase if not running
- Uses `supabase/remote_schema.sql` for base schema
- Applies custom migrations on top
- Seeds roles and reference data
- Configures local database settings

### Remote Deployment
- Requires project to be linked: `supabase link --project-ref YOUR_REF`
- Uses `supabase db push` for schema
- Deploys Edge Functions to cloud
- Requires manual database settings configuration in dashboard

## 🔍 Troubleshooting

If deployment fails:

1. **Check logs:**
   ```bash
   supabase functions logs on-user-created --local
   docker logs supabase_db_project
   ```

2. **Verify Supabase is running (local):**
   ```bash
   docker ps | grep supabase
   supabase status
   ```

3. **Re-run deployment:**
   ```bash
   ./scripts/deploy-fresh.sh local
   ```

4. **Manual verification:**
   ```bash
   # Check tables
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\dt"

   # Check roles
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT * FROM roles;"

   # Check functions
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\df"
   ```

## 📚 See Also

- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Comprehensive deployment guide
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
