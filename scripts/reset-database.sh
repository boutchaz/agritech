#!/bin/bash

# Database Reset and Reinitialization Script
# This script resets the database to a clean state and reapplies the schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check if .env file exists
ENV_FILE="/Users/boutchaz/Documents/CodeLovers/agritech/project/.env"
if [ ! -f "$ENV_FILE" ]; then
  print_error ".env file not found at: $ENV_FILE"
  exit 1
fi

# Load environment variables
source "$ENV_FILE"

# Detect environment
if [[ "$VITE_SUPABASE_URL" == *"agritech.thebzlab.online"* ]]; then
  ENVIRONMENT="PRODUCTION"
  DB_HOST="agritech-supabase-652186-5-75-154-125.traefik.me"
  DB_PASSWORD="chn6ldl4lnfgsafgmihqvxebojnyz6ut"
elif [[ "$VITE_SUPABASE_URL" == *"127.0.0.1"* ]] || [[ "$VITE_SUPABASE_URL" == *"localhost"* ]]; then
  ENVIRONMENT="LOCAL"
  DB_HOST="127.0.0.1"
  DB_PASSWORD="postgres"
else
  print_error "Unknown environment: $VITE_SUPABASE_URL"
  exit 1
fi

echo ""
print_warning "═══════════════════════════════════════════════════════════════"
print_warning "  DATABASE RESET SCRIPT - ${ENVIRONMENT} ENVIRONMENT"
print_warning "═══════════════════════════════════════════════════════════════"
echo ""
print_warning "This script will:"
echo "  1. Drop ALL tables in the public schema"
echo "  2. Drop ALL functions in the public schema"
echo "  3. Recreate the schema from migrations"
echo "  4. Apply seed data (roles, work_units, accounts)"
echo ""

if [ "$ENVIRONMENT" = "PRODUCTION" ]; then
  print_error "🚨 YOU ARE ABOUT TO RESET THE PRODUCTION DATABASE! 🚨"
  print_error "This will DELETE ALL DATA permanently!"
  echo ""
  read -p "Type 'DELETE ALL PRODUCTION DATA' to confirm: " confirmation

  if [ "$confirmation" != "DELETE ALL PRODUCTION DATA" ]; then
    print_info "Reset cancelled."
    exit 0
  fi
else
  print_info "Environment: Local development"
  read -p "Are you sure you want to reset the local database? (y/N): " confirmation

  if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
    print_info "Reset cancelled."
    exit 0
  fi
fi

echo ""
print_info "Starting database reset..."
echo ""

# Database connection parameters
DB_USER="postgres"
DB_NAME="postgres"
DB_PORT="5432"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Step 1: Drop all tables
print_info "Step 1/4: Dropping all tables..."

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" <<EOF
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';

    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Re-enable triggers
    SET session_replication_role = 'origin';
END\$\$;
EOF

print_success "All tables dropped"

# Step 2: Drop all functions
print_info "Step 2/4: Dropping all functions..."

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" <<EOF
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Drop all functions in public schema
    FOR r IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE ns.nspname = 'public'
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
END\$\$;
EOF

print_success "All functions dropped"

# Step 3: Apply main schema
print_info "Step 3/4: Applying main schema..."

SCHEMA_FILE="/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations/00000000000000_schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  print_error "Schema file not found: $SCHEMA_FILE"
  exit 1
fi

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$SCHEMA_FILE" > /dev/null 2>&1

print_success "Schema applied successfully"

# Step 4: Apply additional migrations
print_info "Step 3.1/4: Applying additional migrations..."

MIGRATIONS_DIR="/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations"

# Apply migrations in order (skip schema.sql as it's already applied)
for migration in "$MIGRATIONS_DIR"/202*.sql; do
  if [ -f "$migration" ]; then
    migration_name=$(basename "$migration")
    print_info "  Applying: $migration_name"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$migration" > /dev/null 2>&1
    print_success "  Applied: $migration_name"
  fi
done

# Step 5: Apply seed data
print_info "Step 4/4: Applying seed data..."

SEED_DIR="/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/seed"

# Apply seeds in order
for seed_file in "$SEED_DIR"/0*.sql; do
  if [ -f "$seed_file" ]; then
    seed_name=$(basename "$seed_file")
    print_info "  Applying: $seed_name"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$seed_file" > /dev/null 2>&1
    print_success "  Applied: $seed_name"
  fi
done

print_success "Seed data applied"

# Cleanup
unset PGPASSWORD

echo ""
print_success "═══════════════════════════════════════════════════════════════"
print_success "  DATABASE RESET COMPLETE"
print_success "═══════════════════════════════════════════════════════════════"
echo ""
print_info "Next steps:"
echo "  1. Verify database connection in your application"
echo "  2. Create a test organization and user"
echo "  3. Create a trial subscription (use scripts/create-trial-subscription.js)"
echo "  4. Import your farm data"
echo ""

if [ "$ENVIRONMENT" = "LOCAL" ]; then
  print_info "Local development tip:"
  echo "  - Use 'npx supabase db reset' for faster resets in local development"
  echo "  - This script is useful for production or when you need precise control"
fi

echo ""
