#!/bin/bash

# ============================================================================
# DATABASE REINITIALIZATION SCRIPT
# ============================================================================
# This script:
#   1. Drops everything using cleanup.sql
#   2. Applies the main schema
#   3. Applies additional migrations
#   4. Applies seed data
#
# Usage:
#   ./reinitialize.sh [production|local]
#
# Examples:
#   ./reinitialize.sh local      # Reset local database
#   ./reinitialize.sh production # Reset production (requires confirmation)
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Get environment from argument
ENV=${1:-local}

# Set database credentials based on environment
if [ "$ENV" = "production" ]; then
  DB_HOST="agritech-supabase-652186-5-75-154-125.traefik.me"
  DB_PASSWORD="chn6ldl4lnfgsafgmihqvxebojnyz6ut"
  print_warning "═══════════════════════════════════════════════════════════════"
  print_warning "  🚨 PRODUCTION DATABASE RESET 🚨"
  print_warning "═══════════════════════════════════════════════════════════════"
  echo ""
  read -p "Type 'DELETE ALL PRODUCTION DATA' to confirm: " confirmation
  if [ "$confirmation" != "DELETE ALL PRODUCTION DATA" ]; then
    print_info "Cancelled."
    exit 0
  fi
elif [ "$ENV" = "local" ]; then
  DB_HOST="127.0.0.1"
  DB_PASSWORD="postgres"
  print_info "Environment: Local development"
  read -p "Reset local database? (y/N): " confirmation
  if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
    print_info "Cancelled."
    exit 0
  fi
else
  print_error "Invalid environment: $ENV"
  echo "Usage: ./reinitialize.sh [production|local]"
  exit 1
fi

DB_USER="postgres"
DB_NAME="postgres"
DB_PORT="5432"
export PGPASSWORD="$DB_PASSWORD"

ROOT_DIR="/Users/boutchaz/Documents/CodeLovers/agritech"

echo ""
print_info "Starting database reinitialization..."
echo ""

# ============================================================================
# STEP 1: CLEANUP
# ============================================================================

print_info "Step 1/4: Cleaning up database (dropping all objects)..."

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$ROOT_DIR/cleanup-safe.sql"

print_success "Database cleaned"

# ============================================================================
# STEP 2: APPLY MAIN SCHEMA
# ============================================================================

print_info "Step 2/4: Applying main schema..."

SCHEMA_FILE="$ROOT_DIR/project/supabase/migrations/00000000000000_schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  print_error "Schema file not found: $SCHEMA_FILE"
  exit 1
fi

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$SCHEMA_FILE" > /dev/null 2>&1

print_success "Schema applied"

# ============================================================================
# STEP 3: APPLY ADDITIONAL MIGRATIONS
# ============================================================================

print_info "Step 3/4: Applying additional migrations..."

MIGRATIONS_DIR="$ROOT_DIR/project/supabase/migrations"

for migration in "$MIGRATIONS_DIR"/202*.sql; do
  if [ -f "$migration" ]; then
    migration_name=$(basename "$migration")
    print_info "  Applying: $migration_name"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$migration" > /dev/null 2>&1
    print_success "  Applied: $migration_name"
  fi
done

print_success "Migrations applied"

# ============================================================================
# STEP 4: APPLY SEED DATA
# ============================================================================

print_info "Step 4/4: Applying seed data..."

SEED_DIR="$ROOT_DIR/project/supabase/seed"

for seed_file in "$SEED_DIR"/0*.sql; do
  if [ -f "$seed_file" ]; then
    seed_name=$(basename "$seed_file")
    print_info "  Applying: $seed_name"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$seed_file" > /dev/null 2>&1
    print_success "  Applied: $seed_name"
  fi
done

print_success "Seed data applied"

# ============================================================================
# DONE
# ============================================================================

unset PGPASSWORD

echo ""
print_success "═══════════════════════════════════════════════════════════════"
print_success "  ✅ DATABASE REINITIALIZATION COMPLETE"
print_success "═══════════════════════════════════════════════════════════════"
echo ""
print_info "Next steps:"
echo "  1. Create organization and user"
echo "  2. Create trial subscription: node scripts/create-trial-subscription.js"
echo "  3. Import your data"
echo ""
