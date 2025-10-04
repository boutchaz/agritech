#!/bin/bash

# AgriTech Declarative Schema Management Script

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_help() {
    echo "AgriTech Schema Management"
    echo ""
    echo "Usage: ./scripts/schema.sh [command]"
    echo ""
    echo "Commands:"
    echo "  pull       - Pull schema from remote database"
    echo "  push       - Push local schema to remote database"
    echo "  diff       - Show differences between local and remote"
    echo "  types      - Generate TypeScript types from schema"
    echo "  reset      - Reset local database to match schema"
    echo "  backup     - Backup current schema"
    echo "  restore    - Restore schema from backup"
    echo "  validate   - Validate schema syntax"
    echo ""
}

function pull_schema() {
    echo -e "${YELLOW}Pulling schema from remote...${NC}"
    supabase db pull --schema public
    echo -e "${GREEN}✓ Schema pulled successfully${NC}"
}

function push_schema() {
    echo -e "${YELLOW}Pushing schema to remote...${NC}"

    # First show diff
    echo -e "${YELLOW}Changes to be applied:${NC}"
    supabase db diff --linked

    read -p "Do you want to apply these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase db push --linked
        echo -e "${GREEN}✓ Schema pushed successfully${NC}"
    else
        echo -e "${RED}Push cancelled${NC}"
    fi
}

function diff_schema() {
    echo -e "${YELLOW}Comparing local vs remote schema...${NC}"
    supabase db diff --linked
}

function generate_types() {
    echo -e "${YELLOW}Generating TypeScript types...${NC}"
    supabase gen types typescript --local > src/types/database.generated.ts
    echo -e "${GREEN}✓ Types generated at src/types/database.generated.ts${NC}"
}

function reset_local() {
    echo -e "${YELLOW}Resetting local database...${NC}"
    supabase db reset
    echo -e "${GREEN}✓ Local database reset${NC}"
}

function backup_schema() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="supabase/schema/backups/public_${TIMESTAMP}.sql"

    mkdir -p supabase/schema/backups
    cp supabase/schema/public.sql "$BACKUP_FILE"
    echo -e "${GREEN}✓ Schema backed up to ${BACKUP_FILE}${NC}"
}

function restore_schema() {
    echo "Available backups:"
    ls -1 supabase/schema/backups/*.sql 2>/dev/null || echo "No backups found"

    read -p "Enter backup filename to restore: " BACKUP_FILE

    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" supabase/schema/public.sql
        echo -e "${GREEN}✓ Schema restored from ${BACKUP_FILE}${NC}"
        echo -e "${YELLOW}Run 'supabase db reset' to apply the restored schema${NC}"
    else
        echo -e "${RED}Backup file not found${NC}"
    fi
}

function validate_schema() {
    echo -e "${YELLOW}Validating schema...${NC}"

    # Check for syntax errors by trying to apply to shadow db
    supabase db reset --dry-run

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Schema is valid${NC}"
    else
        echo -e "${RED}✗ Schema validation failed${NC}"
    fi
}

# Main script
case "$1" in
    pull)
        pull_schema
        ;;
    push)
        push_schema
        ;;
    diff)
        diff_schema
        ;;
    types)
        generate_types
        ;;
    reset)
        reset_local
        ;;
    backup)
        backup_schema
        ;;
    restore)
        restore_schema
        ;;
    validate)
        validate_schema
        ;;
    *)
        print_help
        ;;
esac