#!/bin/bash
# Reset Supabase Cloud Database
# This script resets your REMOTE cloud database to match your local schema

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: REMOTE DATABASE RESET ⚠️${NC}"
echo ""
echo "This will reset your CLOUD Supabase database (agritech project)"
echo "  - All data will be lost"
echo "  - Schema will be recreated from local files"
echo "  - Cannot be undone!"
echo ""

read -p "Type 'RESET CLOUD' to proceed: " CONFIRM

if [ "$CONFIRM" != "RESET CLOUD" ]; then
    echo -e "${GREEN}✓ Operation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Resetting remote database...${NC}"
echo ""

# Step 1: Pull current schema as backup
echo -e "${YELLOW}📦 Step 1: Backing up current remote schema...${NC}"
supabase db pull --schema public
echo -e "${GREEN}✓ Backup saved to supabase/schema/public.sql${NC}"

# Step 2: Reset remote database
echo ""
echo -e "${YELLOW}🧹 Step 2: Resetting remote database...${NC}"
echo "This will drop all tables and recreate from migrations..."
supabase db reset --linked

echo ""
echo -e "${GREEN}✅ Remote database reset complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Generate types: npm run db:generate-types-remote"
echo "  2. Test your app: npm run dev"

