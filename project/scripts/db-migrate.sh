#!/bin/bash

# Automated database migration script
# Applies all pending migrations to the remote database automatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Agritech Database Migration Tool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI is not installed${NC}"
    echo -e "${YELLOW}  Install it with: brew install supabase/tap/supabase${NC}"
    exit 1
fi

# Check if linked to a project
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠ Not linked to a Supabase project${NC}"
    echo -e "${YELLOW}  Run: supabase link --project-ref <your-project-ref>${NC}"
    echo ""
    read -p "Do you want to apply migrations to local database instead? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        TARGET="local"
    else
        exit 1
    fi
else
    echo -e "${GREEN}✓ Connected to Supabase project${NC}"
    echo ""
    read -p "Apply migrations to [L]ocal or [R]emote database? (l/r) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Rr]$ ]]; then
        TARGET="remote"
    else
        TARGET="local"
    fi
fi

echo ""
echo -e "${BLUE}Target: ${TARGET} database${NC}"
echo ""

# List pending migrations
echo -e "${YELLOW}📋 Checking for pending migrations...${NC}"
echo ""

if [ "$TARGET" == "remote" ]; then
    # For remote, we need to push
    echo -e "${YELLOW}🚀 Pushing migrations to remote database...${NC}"
    echo ""

    # Run db push without the --include-all flag to avoid reapplying all migrations
    supabase db push --linked

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✓ Migrations applied successfully to remote database!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        echo ""
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}✗ Failed to apply migrations to remote database${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        exit 1
    fi
else
    # For local, use migration up
    echo -e "${YELLOW}🚀 Applying migrations to local database...${NC}"
    echo ""

    supabase migration up

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✓ Migrations applied successfully to local database!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        echo ""
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}✗ Failed to apply migrations to local database${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        exit 1
    fi
fi

echo ""
