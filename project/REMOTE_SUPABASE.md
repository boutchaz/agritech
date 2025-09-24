# Remote Self-Hosted Supabase Setup

This project is configured to work with your self-hosted Supabase instance running at:
**http://agritech-supabase-652186-5-75-154-125.traefik.me/**

## 🚀 Quick Start

### 1. Apply Schema to Remote Database

```bash
# Apply the complete schema to your remote database
npm run db:apply-schema-remote

# Or apply schema with sample data
npm run db:deploy-remote
```

### 2. Generate TypeScript Types

```bash
# Generate types from your remote schema
npm run db:generate-types-remote
```

### 3. Complete Setup (Schema + Types)

```bash
# Run both schema application and type generation
npm run db:setup-remote
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run db:apply-schema-remote` | Apply schema.sql to remote database |
| `npm run db:generate-types-remote` | Generate TypeScript types from remote |
| `npm run db:deploy-remote` | Deploy schema with seed data |
| `npm run db:setup-remote` | Complete setup (schema + types) |

## 🔧 Configuration

### Environment Variables (.env)

Your project is configured with these environment variables:

```env
# Supabase Client Configuration
VITE_SUPABASE_URL=http://agritech-supabase-652186-5-75-154-125.traefik.me
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct Database Connection
POSTGRES_HOST=agritech-supabase-652186-5-75-154-125.traefik.me
POSTGRES_PASSWORD=chn6ldl4lnfgsafgmihqvxebojnyz6ut
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_PORT=5432
```

### Supabase Configuration (.env.supabase)

Your self-hosted instance configuration:

- **Dashboard**: http://agritech-supabase-652186-5-75-154-125.traefik.me/project/default
- **Container Prefix**: agritech-supabase-mksx2j-supabase
- **Dashboard Login**: supabase / blvn8uokbjdddnfoehcni8qnc4q8mhle

## 🗄️ Database Schema

The schema includes:

### Core Tables
- **organizations** - Multi-tenant organizations
- **organization_users** - User memberships
- **farms** - Farms belonging to organizations
- **parcels** - Land parcels within farms

### Agricultural Data
- **crop_types** - Crop type definitions
- **crop_varieties** - Specific crop varieties
- **crops** - Actual plantings/crops
- **soil_analysis** - Soil test results
- **weather_data** - Weather measurements

### Features
- ✅ Row Level Security (RLS) for multi-tenancy
- ✅ Automatic timestamps (created_at/updated_at)
- ✅ Foreign key constraints
- ✅ Check constraints for data validation
- ✅ Performance indexes
- ✅ Auto-membership for organization creators

## 🔒 Security & Access

### Multi-Tenant Security
- Each user can only access data from organizations they belong to
- Automatic admin membership when creating organizations
- Role-based access control (admin, manager, member)

### Database Access
- **Public Access**: Read-only for crop types and varieties
- **Authenticated Access**: Full CRUD for user's organization data
- **Service Role**: Full database access for admin operations

## 📝 Development Workflow

### 1. Schema Changes
1. Edit `supabase/schema.sql`
2. Apply changes: `npm run db:apply-schema-remote`
3. Update types: `npm run db:generate-types-remote`

### 2. Adding Sample Data
1. Edit `supabase/seed.sql`
2. Deploy with seed: `npm run db:deploy-remote`

### 3. Testing Changes
1. Use the dashboard SQL editor for quick tests
2. Dashboard URL: http://agritech-supabase-652186-5-75-154-125.traefik.me/project/default/sql

## 🛠️ Prerequisites

### Required Tools
- **Node.js** 18+ (for running scripts)
- **PostgreSQL Client** (psql) for direct database operations
  - macOS: `brew install postgresql`
  - Ubuntu: `sudo apt-get install postgresql-client`
  - Windows: Download from postgresql.org

### Optional Tools
- **Supabase CLI** for advanced operations
  - Install: `npm install -g supabase`

## 🔄 Data Migration

### From Local to Remote
If you have local data you want to migrate:

1. **Export local data**:
   ```bash
   pg_dump "postgresql://postgres:postgres@localhost:54322/postgres" > local_backup.sql
   ```

2. **Import to remote**:
   ```bash
   psql "postgresql://postgres:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/postgres" < local_backup.sql
   ```

### From Other Systems
1. Export your data as SQL or CSV
2. Use the dashboard import features or run SQL directly

## 🚨 Troubleshooting

### Connection Issues
```bash
# Test database connection
psql "postgresql://postgres:chn6ldl4lnfgsafgmihqvxebojnyz6ut@agritech-supabase-652186-5-75-154-125.traefik.me:5432/postgres" -c "SELECT version();"
```

### Schema Application Failed
1. Check database connectivity
2. Verify credentials in .env file
3. Manual application via dashboard SQL editor
4. Check for syntax errors in schema.sql

### Type Generation Failed
1. Ensure schema is applied first
2. Check Supabase CLI installation
3. Verify service role key permissions
4. Use fallback types generation

### Permission Errors
1. Check RLS policies in schema.sql
2. Verify user has proper organization membership
3. Test with service role key for admin operations

## 📊 Monitoring & Maintenance

### Dashboard Access
- **Main Dashboard**: http://agritech-supabase-652186-5-75-154-125.traefik.me/project/default
- **Database**: View tables, run queries, check logs
- **Auth**: Manage users and authentication
- **Storage**: File uploads and management
- **API**: View and test API endpoints

### Performance Monitoring
- Check slow queries in dashboard
- Monitor database size and connections
- Review RLS policy performance

### Backup Strategy
1. **Regular exports**: Use pg_dump for full backups
2. **Point-in-time recovery**: Configure if needed
3. **Schema versioning**: Keep schema.sql in version control

## 🌟 Best Practices

1. **Always test schema changes** on local first
2. **Use transactions** for multiple schema changes
3. **Monitor RLS policies** for performance
4. **Keep service role key secure** - never commit to git
5. **Regular backups** before major changes
6. **Document schema changes** in git commits

## 🔗 Useful Links

- [Self-Hosted Supabase Docs](https://supabase.com/docs/guides/self-hosting)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in dashboard
3. Test connections and permissions
4. Verify environment variables are correct

Your self-hosted Supabase instance is ready for production use with proper monitoring and maintenance!