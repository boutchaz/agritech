#!/bin/bash

# Database synchronization script
# Syncs schema between local and remote databases

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   Database Synchronization Tool${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}This tool helps you synchronize databases:${NC}"
echo ""
echo -e "  ${GREEN}[1]${NC} Pull remote schema to local"
echo -e "  ${GREEN}[2]${NC} Push local migrations to remote"
echo -e "  ${GREEN}[3]${NC} Generate new migration from schema diff"
echo -e "  ${GREEN}[4]${NC} Dump remote schema to file ${CYAN}(recommended after migrations)${NC}"
echo -e "  ${GREEN}[5]${NC} Reset local database"
echo -e "  ${GREEN}[6]${NC} Reset remote database ${RED}(DANGEROUS!)${NC}"
echo ""

read -p "Select an option (1-6): " -n 1 -r OPTION
echo
echo ""

case $OPTION in
  1)
    echo -e "${BLUE}[Option 1] Pulling remote schema to local...${NC}"
    echo ""
    echo -e "${YELLOW}⚠  This will overwrite your local database with remote schema${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        supabase db pull

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Schema pulled successfully${NC}"
            echo -e "${CYAN}💡 New migration file created in supabase/migrations/${NC}"
        else
            echo -e "${RED}✗ Failed to pull schema${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
    ;;

  2)
    echo -e "${BLUE}[Option 2] Pushing local migrations to remote...${NC}"
    echo ""
    echo -e "${YELLOW}This will apply all pending migrations to remote database${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        supabase db push --linked

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Migrations pushed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to push migrations${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
    ;;

  3)
    echo -e "${BLUE}[Option 3] Generating migration from schema diff...${NC}"
    echo ""
    read -p "Enter migration name (e.g., 'add_new_table'): " MIGRATION_NAME

    if [ -z "$MIGRATION_NAME" ]; then
        echo -e "${RED}Migration name is required${NC}"
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}Comparing local and remote schemas...${NC}"
    supabase db diff --linked | supabase migration new "$MIGRATION_NAME"

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Migration generated${NC}"
        echo -e "${CYAN}💡 Check supabase/migrations/ for the new file${NC}"
    else
        echo -e "${RED}✗ Failed to generate migration${NC}"
        exit 1
    fi
    ;;

  4)
    echo -e "${BLUE}[Option 4] Dumping remote schema to file...${NC}"
    echo ""
    echo -e "${YELLOW}This will save the current remote schema to supabase/schema/public.sql${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        mkdir -p supabase/schema
        supabase db dump -f supabase/schema/public.sql --linked

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Schema dumped successfully${NC}"
            echo -e "${CYAN}💡 Schema saved to supabase/schema/public.sql${NC}"
            echo -e "${CYAN}💡 This file will be used when resetting databases${NC}"
        else
            echo -e "${RED}✗ Failed to dump schema${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
    ;;

  5)
    echo -e "${BLUE}[Option 5] Resetting local database...${NC}"
    echo ""
    echo -e "${RED}⚠  WARNING: This will delete all data in your local database!${NC}"
    read -p "Are you absolutely sure? (type 'yes' to confirm): " CONFIRM

    if [ "$CONFIRM" == "yes" ]; then
        echo ""
        supabase db reset

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Local database reset complete${NC}"
        else
            echo -e "${RED}✗ Failed to reset local database${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
    ;;

  6)
    echo -e "${BLUE}[Option 6] Resetting remote database...${NC}"
    echo ""
    echo -e "${RED}⚠  DANGER! This will delete all data in your PRODUCTION database!${NC}"
    echo -e "${RED}    This action CANNOT be undone!${NC}"
    echo ""
    read -p "Type the project ref to confirm: " PROJECT_REF_CONFIRM

    if [ -z "$PROJECT_REF_CONFIRM" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi

    read -p "Type 'DELETE ALL DATA' to confirm: " FINAL_CONFIRM

    if [ "$FINAL_CONFIRM" == "DELETE ALL DATA" ]; then
        echo ""
        echo -e "${RED}Resetting remote database...${NC}"
        supabase db reset --linked

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ Remote database reset complete${NC}"
        else
            echo -e "${RED}✗ Failed to reset remote database${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Cancelled - confirmation text did not match${NC}"
    fi
    ;;

  *)
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Done${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
