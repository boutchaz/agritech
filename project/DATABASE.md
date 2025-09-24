# Database Schema Management

This project uses Supabase's **declarative schema approach** for managing the database schema. This means instead of writing individual migration files, we define the complete database schema in a single file.

## 📁 File Structure

```
supabase/
├── config.toml          # Supabase configuration
├── schema.sql           # Complete database schema (declarative)
├── seed.sql            # Sample data for development
└── migrations/         # Old migration files (can be removed)
```

## 🚀 Quick Start

### 1. Apply Schema to Database

To create or update your database schema:

```bash
# Apply schema to remote database
npm run db:apply-schema

# Or directly with Supabase CLI
supabase db push
```

### 2. Generate TypeScript Types

```bash
# Generate types from your schema
npm run db:generate-types
```

This creates:
- `src/types/database.types.ts` - Auto-generated Supabase types
- `src/types/index.ts` - User-friendly type definitions

### 3. Load Sample Data

```bash
# Reset local database with schema and seed data
npm run db:reset

# Or apply seed data to existing database
supabase db push --include-seed
```

## 📝 Schema Development Workflow

### 1. **Edit Schema**
Modify `supabase/schema.sql` to add/change tables, columns, indexes, etc.

### 2. **Check Diff** (Optional)
See what changes will be applied:
```bash
npm run db:diff
```

### 3. **Apply Changes**
```bash
npm run db:apply-schema
```

### 4. **Update Types**
```bash
npm run db:generate-types
```

### 5. **Update Seed Data** (Optional)
Modify `supabase/seed.sql` if needed for testing.

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `npm run db:apply-schema` | Apply schema.sql to remote database |
| `npm run db:generate-types` | Generate TypeScript types |
| `npm run db:diff` | Show schema differences |
| `npm run db:deploy` | Deploy schema with seed data |
| `npm run db:reset` | Reset local database |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |

## 📋 Schema Overview

### Core Tables

- **organizations** - Multi-tenant organizations
- **organization_users** - User memberships in organizations
- **farms** - Farms belonging to organizations
- **parcels** - Land parcels within farms
- **crop_types** - Crop type definitions (wheat, corn, etc.)
- **crop_varieties** - Specific varieties of crops
- **crops** - Actual plantings/crops on parcels
- **soil_analysis** - Soil test results
- **weather_data** - Weather measurements

### Key Features

- **Row Level Security (RLS)** - Multi-tenant data isolation
- **Automatic timestamps** - created_at/updated_at triggers
- **Foreign key constraints** - Data integrity
- **Check constraints** - Data validation
- **Indexes** - Performance optimization

## 🔒 Security

The schema includes comprehensive RLS policies:

- Users can only see data for organizations they belong to
- Automatic organization membership for creators
- Role-based access control (admin, manager, member)
- Secure data isolation between tenants

## 📊 Sample Data

The `seed.sql` file includes:

- Demo organization and farm
- Multiple parcels with different soil types
- Sample crop types and varieties
- Soil analysis data
- Weather measurements
- Realistic crop plantings

## 🔄 Migration from Old Approach

If you have existing migration files:

1. **Backup your data** (if using remote database)
2. **Apply the new schema**: `npm run db:apply-schema`
3. **Verify everything works**
4. **Remove old migration files** (optional)

## 🆘 Troubleshooting

### "Infinite recursion detected in policy"
This usually means RLS policies reference each other. Check the schema for circular dependencies in policy definitions.

### "Permission denied" errors
Ensure RLS policies are correctly configured and the user has appropriate organization membership.

### Schema changes not applied
- Check `supabase db diff` to see pending changes
- Ensure you're connected to the right database
- Try `supabase db push --dry-run` to preview changes

### Types not updating
- Run `npm run db:generate-types` after schema changes
- Restart your TypeScript server in your IDE
- Check that the types directory exists

## 📚 Learn More

- [Supabase Declarative Schema Docs](https://supabase.com/blog/declarative-schemas)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🎯 Best Practices

1. **Always use the schema.sql file** - Don't create tables manually
2. **Test changes locally first** - Use `supabase start` and `db:reset`
3. **Generate types after changes** - Keep TypeScript types in sync
4. **Use meaningful names** - Tables, columns, constraints should be descriptive
5. **Add comments** - Document complex logic in SQL comments
6. **Test RLS policies** - Ensure data isolation works correctly

## 🔗 Integration with Application

Import types in your components:

```typescript
import { Organization, Farm, Parcel } from './types';
import { Database } from './types/database.types';

// Use with Supabase client
const { data: farms } = await supabase
  .from('farms')
  .select('*')
  .returns<Farm[]>();
```

The declarative approach makes database management much simpler and more maintainable than traditional migrations!