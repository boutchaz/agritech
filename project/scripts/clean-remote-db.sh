#!/bin/bash
# Clean Remote Supabase Database Script
# WARNING: This will delete ALL data and schema from your remote database!

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️${NC}"
echo ""
echo "This script will:"
echo "  1. Drop ALL tables in the public schema"
echo "  2. Drop ALL functions"
echo "  3. Drop ALL types/enums"
echo "  4. Clear ALL auth users"
echo "  5. Apply fresh schema from supabase/schema/public.sql"
echo ""
echo -e "${YELLOW}Your remote database URL:${NC}"
echo "  http://agritech-supabase-652186-5-75-154-125.traefik.me"
echo ""

# Confirmation prompts
read -p "Are you ABSOLUTELY sure you want to clean the remote database? (type 'yes' to continue): " CONFIRM1

if [ "$CONFIRM1" != "yes" ]; then
    echo -e "${GREEN}✓ Operation cancelled. Your database is safe.${NC}"
    exit 0
fi

read -p "Last chance! Type 'DELETE EVERYTHING' to proceed: " CONFIRM2

if [ "$CONFIRM2" != "DELETE EVERYTHING" ]; then
    echo -e "${GREEN}✓ Operation cancelled. Your database is safe.${NC}"
    exit 0
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Get database credentials from environment or prompt
POSTGRES_HOST="${POSTGRES_HOST:-agritech-supabase-652186-5-75-154-125.traefik.me}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${YELLOW}Enter PostgreSQL password:${NC}"
    read -s POSTGRES_PASSWORD
fi

# Construct connection string
DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo ""
echo -e "${YELLOW}🧹 Starting database cleanup...${NC}"

# Test connection first
echo "Testing connection..."
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to database. Please check your credentials.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connection successful${NC}"

# Create cleanup SQL script
CLEANUP_SQL=$(cat << 'EOSQL'
-- Disable all triggers temporarily
SET session_replication_role = replica;

-- Drop all tables in public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- Drop all views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
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
        RAISE NOTICE 'Dropped function: %', r.proname;
    END LOOP;
END $$;

-- Drop all types/enums
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
END $$;

-- Drop all sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequencename;
    END LOOP;
END $$;

-- Clear all auth users (DANGEROUS - removes all user accounts)
TRUNCATE auth.users CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Vacuum to clean up
VACUUM FULL;

SELECT 'Database cleaned successfully!' as result;
EOSQL
)

echo ""
echo -e "${YELLOW}📦 Step 1: Cleaning database...${NC}"
echo "$CLEANUP_SQL" | psql "$DB_URL" 2>&1 | grep -E "Dropped|result|ERROR" || true
echo -e "${GREEN}✓ Database cleaned${NC}"

# Apply fresh schema if it exists
echo ""
echo -e "${YELLOW}📦 Step 2: Applying fresh schema...${NC}"

if [ -f "supabase/schema/public.sql" ]; then
    echo "Applying schema from supabase/schema/public.sql..."
    psql "$DB_URL" < supabase/schema/public.sql > /dev/null 2>&1
    echo -e "${GREEN}✓ Schema applied${NC}"
elif [ -f "supabase/schema.sql" ]; then
    echo "Applying schema from supabase/schema.sql..."
    psql "$DB_URL" < supabase/schema.sql > /dev/null 2>&1
    echo -e "${GREEN}✓ Schema applied${NC}"
else
    echo -e "${YELLOW}⚠️  No schema file found. Skipping schema application.${NC}"
    echo "   Create one at: supabase/schema/public.sql"
fi

# Optionally apply seed data
if [ -f "supabase/seed.sql" ]; then
    echo ""
    read -p "Apply seed data? (y/n): " APPLY_SEED
    if [ "$APPLY_SEED" = "y" ] || [ "$APPLY_SEED" = "Y" ]; then
        echo -e "${YELLOW}🌱 Step 3: Applying seed data...${NC}"
        psql "$DB_URL" < supabase/seed.sql > /dev/null 2>&1
        echo -e "${GREEN}✓ Seed data applied${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Remote database cleaned and reset successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Generate types: npm run db:generate-types-remote"
echo "  2. Test your app: npm run dev"
echo "  3. Check dashboard: http://agritech-supabase-652186-5-75-154-125.traefik.me/project/default"

