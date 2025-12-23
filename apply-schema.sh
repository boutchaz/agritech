#!/bin/bash

# ============================================================================
# APPLY SCHEMA TO SUPABASE DATABASE
# ============================================================================
# This script applies the main schema to your Supabase database
#
# Usage:
#   ./apply-schema.sh
#
# Or manually:
#   psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  AgriTech Platform - Schema Application"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if schema file exists
SCHEMA_FILE="project/supabase/migrations/00000000000000_schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Error: Schema file not found at $SCHEMA_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📄 Schema file found: $SCHEMA_FILE${NC}"
echo ""

# Get Supabase connection details from environment or prompt
if [ -z "$SUPABASE_DB_HOST" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_DB_HOST not set in environment${NC}"
    read -p "Enter Supabase DB host (e.g., db.xxxxx.supabase.co): " SUPABASE_DB_HOST
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_DB_PASSWORD not set in environment${NC}"
    read -sp "Enter Supabase DB password: " SUPABASE_DB_PASSWORD
    echo ""
fi

SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"

echo ""
echo -e "${BLUE}Connection details:${NC}"
echo "  Host: $SUPABASE_DB_HOST"
echo "  Port: $SUPABASE_DB_PORT"
echo "  User: $SUPABASE_DB_USER"
echo "  Database: $SUPABASE_DB_NAME"
echo ""

# Confirm before proceeding
read -p "Apply schema to database? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Aborted${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Applying schema...${NC}"
echo ""

# Apply the schema
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$SUPABASE_DB_HOST" \
    -U "$SUPABASE_DB_USER" \
    -d "$SUPABASE_DB_NAME" \
    -p "$SUPABASE_DB_PORT" \
    -f "$SCHEMA_FILE" \
    -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Schema applied successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo "1️⃣  Apply seed data (optional):"
    echo "   psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -f project/supabase/seed/01_roles.sql"
    echo "   psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -f project/supabase/seed/02_work_units.sql"
    echo "   psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -f project/supabase/seed/03_accounts.sql"
    echo ""
    echo "2️⃣  Restart your backend API (agritech-api)"
    echo ""
    echo "3️⃣  Restart Strapi CMS (categories will auto-seed)"
    echo ""
else
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Schema application failed${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Check the error messages above for details.${NC}"
    echo ""
    exit 1
fi
