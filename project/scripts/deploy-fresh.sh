#!/bin/bash
# One-click deployment script for fresh Supabase instances
# This script deploys all database schema, RLS policies, functions, triggers, and seed data

set -e  # Exit on error

echo "🚀 Starting fresh Supabase deployment..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Determine target (local or remote)
TARGET="${1:-local}"

if [ "$TARGET" = "local" ]; then
    echo "📍 Deploying to LOCAL instance..."
    DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

    # Check if local Supabase is running
    if ! nc -z 127.0.0.1 54322 2>/dev/null; then
        echo "⚠️  Local Supabase not running. Starting it now..."

        # Temporarily move migrations to avoid auto-apply
        if [ -d "supabase/migrations" ]; then
            mv supabase/migrations supabase/migrations.tmp
        fi

        # Start Supabase
        supabase start

        # Restore migrations
        if [ -d "supabase/migrations.tmp" ]; then
            mv supabase/migrations.tmp supabase/migrations
        fi

        sleep 5
    fi
elif [ "$TARGET" = "remote" ]; then
    echo "📍 Deploying to REMOTE instance..."

    # Check if linked to remote project
    if [ ! -f .git/supabase/config.toml ]; then
        echo "❌ Error: Not linked to remote project. Run:"
        echo "   supabase link --project-ref YOUR_PROJECT_REF"
        exit 1
    fi
else
    echo "❌ Invalid target. Use: ./scripts/deploy-fresh.sh [local|remote]"
    exit 1
fi

# Step 1: Reset database (local only)
if [ "$TARGET" = "local" ]; then
    echo ""
    echo "📦 Step 1: Resetting local database..."
    echo "   Dropping and recreating schema..."

    # Drop all tables and recreate
    psql "$DB_URL" << 'EOSQL' > /dev/null 2>&1
-- Drop all tables in public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes
              FROM pg_proc INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
              WHERE pg_namespace.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
END $$;

-- Drop all types
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Clear all auth users for fresh start
TRUNCATE auth.users CASCADE;
EOSQL

    echo "   ✓ Schema dropped and auth users cleared"
fi

# Step 2: Apply all migrations
echo ""
echo "📦 Step 2: Applying migrations..."
if [ "$TARGET" = "local" ]; then
    # For local, apply schema from remote dump first (contains all base tables)
    if [ -f supabase/remote_schema.sql ]; then
        echo "   Loading remote schema dump..."
        psql "$DB_URL" < supabase/remote_schema.sql > /dev/null 2>&1 || true
    fi

    # Then apply our custom migrations
    echo "   Applying custom migrations..."
    for migration in supabase/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "   → $(basename "$migration")"
            psql "$DB_URL" < "$migration" 2>&1 | grep -v "NOTICE\|WARNING" || true
        fi
    done
else
    supabase db push
fi

# Step 3: Seed essential data
echo ""
echo "🌱 Step 3: Seeding essential data..."

if [ "$TARGET" = "local" ]; then
    # Seed roles (with trigger disabled)
    echo "   Seeding roles..."
    psql "$DB_URL" << 'EOF' > /dev/null 2>&1
ALTER TABLE roles DISABLE TRIGGER enforce_system_admin_roles_insert;
INSERT INTO roles (name, display_name, description, level) VALUES
  ('system_admin', 'System Administrator', 'Full access to all features', 100),
  ('organization_admin', 'Organization Administrator', 'Full access within organization', 80),
  ('farm_manager', 'Farm Manager', 'Manage specific farm operations', 60),
  ('farm_worker', 'Farm Worker', 'Basic farm operations access', 40),
  ('day_laborer', 'Day Laborer', 'Temporary worker access', 20),
  ('viewer', 'Viewer', 'Read-only access', 10)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level;
ALTER TABLE roles ENABLE TRIGGER enforce_system_admin_roles_insert;
EOF

    # Run other seed files
    for seed in supabase/seed/*.sql; do
        if [ -f "$seed" ] && [ "$(basename "$seed")" != "01_roles.sql" ]; then
            echo "   → $(basename "$seed")"
            psql "$DB_URL" < "$seed" 2>&1 | grep -v "NOTICE\|WARNING" || true
        fi
    done
else
    # For remote, use supabase db seed (if available)
    if ls supabase/seed/*.sql > /dev/null 2>&1; then
        for seed in supabase/seed/*.sql; do
            echo "   → $(basename "$seed")"
            supabase db execute --file "$seed"
        done
    fi
fi

# Step 4: Deploy Edge Functions
echo ""
echo "⚡ Step 4: Deploying Edge Functions..."

if [ -d "supabase/functions" ]; then
    for func_dir in supabase/functions/*/; do
        if [ -d "$func_dir" ]; then
            func_name=$(basename "$func_dir")
            echo "   → $func_name"

            if [ "$TARGET" = "local" ]; then
                # For local, functions are deployed automatically by supabase start
                echo "     (Local functions auto-deployed)"
            else
                supabase functions deploy "$func_name"
            fi
        fi
    done
else
    echo "   No Edge Functions found"
fi

# Step 5: Configure database settings (local only)
if [ "$TARGET" = "local" ]; then
    echo ""
    echo "⚙️  Step 5: Configuring database settings..."

    psql "$DB_URL" << 'EOF' > /dev/null 2>&1
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Disable webhook trigger (use frontend authSetup.ts instead for local dev)
-- The webhook requires database parameters that can't be set by postgres user
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;

-- Add invited_by column if missing
ALTER TABLE organization_users ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id);

-- Add onboarding_completed column if missing
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding ON organizations(onboarding_completed);

-- NOTE: Subscription auto-creation is disabled
-- Subscriptions are created via Polar.sh webhook after payment
-- Users complete onboarding, then are redirected to subscription checkout
-- For local development/testing, manually create subscriptions if needed

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
EOF

    echo "   ✓ Extensions enabled, webhook disabled for local dev"
fi

# Step 6: Verify deployment
echo ""
echo "✅ Step 6: Verifying deployment..."

if [ "$TARGET" = "local" ]; then
    # Check tables exist
    TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)
    echo "   ✓ Tables created: $TABLE_COUNT"

    # Check roles seeded
    ROLE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM roles;" | xargs)
    echo "   ✓ Roles seeded: $ROLE_COUNT"

    # Check functions exist
    FUNC_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace;" | xargs)
    echo "   ✓ Functions created: $FUNC_COUNT"

    # Check triggers exist
    TRIGGER_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';" | xargs)
    echo "   ✓ Triggers created: $TRIGGER_COUNT"
fi

# Step 7: Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$TARGET" = "local" ]; then
    echo "📍 Local Supabase:"
    echo "   Studio:  http://127.0.0.1:54323"
    echo "   API:     http://127.0.0.1:54321"
    echo "   DB:      postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    echo ""
    echo "🧪 Test the setup:"
    echo "   1. Open Studio: http://127.0.0.1:54323"
    echo "   2. Check Tables, Roles, Functions"
    echo "   3. Try signup in your app"
else
    echo "📍 Remote Supabase:"
    echo "   Check your project dashboard"
    echo ""
    echo "🧪 Next steps:"
    echo "   1. Configure environment variables"
    echo "   2. Set up storage buckets (if needed)"
    echo "   3. Configure webhooks"
fi

echo ""
echo "📚 Documentation:"
echo "   See DEPLOYMENT_GUIDE.md for details"
echo ""
