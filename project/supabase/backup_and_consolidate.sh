#!/bin/bash

# Backup Remote Database Schema and Consolidate Migrations
# This script backs up your remote database schema and helps create consolidated migrations

set -e

REMOTE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
BACKUP_DIR="supabase/schema_backups"
CONSOLIDATED_SCHEMA="supabase/migrations/00000000000000_consolidated_schema.sql"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Supabase Remote Database Backup & Consolidation"
echo "===================================================="
echo ""

# Check if project ref is set
if [ -z "$REMOTE_PROJECT_REF" ]; then
    echo "⚠️  SUPABASE_PROJECT_REF not set"
    echo "   Set it with: export SUPABASE_PROJECT_REF=your-project-ref"
    echo "   Or find it in: supabase link"
    echo ""
    read -p "Enter your project ref (or press Enter to skip remote backup): " REMOTE_PROJECT_REF
    if [ -z "$REMOTE_PROJECT_REF" ]; then
        echo "ℹ️  Skipping remote backup. Using local schema dump instead."
        USE_LOCAL=true
    fi
else
    USE_LOCAL=false
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Step 1: Backup Remote Schema"
echo "------------------------------"

if [ "$USE_LOCAL" = false ]; then
    echo "Backing up remote schema from project: $REMOTE_PROJECT_REF"
    
    # Backup full schema (DDL only - structure, functions, policies)
    echo "  → Dumping schema structure..."
    supabase db dump --linked \
        --schema public \
        --schema auth \
        --data-only=false \
        > "$BACKUP_DIR/remote_schema_${DATE}.sql" || {
        echo "❌ Failed to dump remote schema"
        echo "   Make sure you're linked: supabase link --project-ref $REMOTE_PROJECT_REF"
        exit 1
    }
    
    echo "✅ Schema backed up to: $BACKUP_DIR/remote_schema_${DATE}.sql"
else
    echo "  → Using local database instead..."
    if command -v supabase &> /dev/null; then
        supabase db dump --local \
            --schema public \
            --data-only=false \
            > "$BACKUP_DIR/local_schema_${DATE}.sql" 2>/dev/null || {
            echo "⚠️  Local dump failed. Make sure Supabase is running locally."
        }
    fi
fi

echo ""
echo "📋 Step 2: Analyze Current Migrations"
echo "-------------------------------------"

MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | grep -v "00000000000000" | wc -l | tr -d ' ')
echo "  Current migration count: $MIGRATION_COUNT (excluding initial schema)"

echo ""
echo "🔧 Step 3: Create Consolidated Schema"
echo "-------------------------------------"

read -p "Create consolidated schema file? (yes/no): " create_consolidated
if [ "$create_consolidated" = "yes" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        echo "  → Using latest backup: $LATEST_BACKUP"
        echo "  → Cleaning and formatting schema..."
        
        # Clean up the dump and create consolidated schema
        cat "$LATEST_BACKUP" | \
            sed 's/--.*$//' | \
            sed '/^$/N;/^\n$/d' | \
            grep -v '^$' > "$CONSOLIDATED_SCHEMA" || true
        
        echo "✅ Consolidated schema created: $CONSOLIDATED_SCHEMA"
        echo ""
        echo "⚠️  Next steps:"
        echo "   1. Review the consolidated schema"
        echo "   2. Organize it into logical sections"
        echo "   3. Add comments and documentation"
        echo "   4. Test it on a fresh database"
    else
        echo "❌ No backup found. Run backup first."
    fi
fi

echo ""
echo "📊 Step 4: Migration Analysis"
echo "-----------------------------"

echo "Migration categories:"
echo ""
echo "Organization/User fixes:"
ls supabase/migrations/ 2>/dev/null | grep -iE "organization|user_has_role|block_write|search_path" | wc -l | xargs echo "  →"
echo ""
echo "Stock management:"
ls supabase/migrations/ 2>/dev/null | grep -iE "stock|item_master|inventory|quote" | wc -l | xargs echo "  →"
echo ""
echo "Accounting:"
ls supabase/migrations/ 2>/dev/null | grep -iE "accounting|billing|invoice|payment" | wc -l | xargs echo "  →"
echo ""
echo "Tasks:"
ls supabase/migrations/ 2>/dev/null | grep -iE "task" | wc -l | xargs echo "  →"

echo ""
echo "✅ Backup complete!"
echo ""
echo "📝 Files created:"
if [ -f "$BACKUP_DIR/remote_schema_${DATE}.sql" ]; then
    ls -lh "$BACKUP_DIR/remote_schema_${DATE}.sql" | awk '{print "   " $9 " (" $5 ")"}'
fi
if [ -f "$CONSOLIDATED_SCHEMA" ]; then
    ls -lh "$CONSOLIDATED_SCHEMA" | awk '{print "   " $9 " (" $5 ")"}'
fi

