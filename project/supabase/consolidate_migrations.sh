#!/bin/bash

# Migration Consolidation Script
# This script helps consolidate related migrations into single files

set -e

MIGRATIONS_DIR="supabase/migrations"
BACKUP_DIR="supabase/migrations_backup_$(date +%Y%m%d_%H%M%S)"
CONSOLIDATED_DIR="supabase/migrations_consolidated"

echo "🚀 Migration Consolidation Script"
echo "=================================="
echo ""

# Create backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$MIGRATIONS_DIR"/* "$BACKUP_DIR/"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Ask for confirmation
read -p "⚠️  This will consolidate migrations. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Consolidation cancelled"
    exit 1
fi

echo ""
echo "📋 Analysis of migrations:"
echo "---------------------------"
echo ""

# Count migrations by category
echo "Organization/User RLS Fixes:"
ls "$MIGRATIONS_DIR" | grep -i "organization_users\|user_has_role\|block_write\|search_path" | wc -l

echo "Stock Management:"
ls "$MIGRATIONS_DIR" | grep -E "stock|item_master|inventory" | wc -l

echo "Tasks:"
ls "$MIGRATIONS_DIR" | grep -i "task" | wc -l

echo "Accounting:"
ls "$MIGRATIONS_DIR" | grep -i "accounting\|billing\|invoice\|payment" | wc -l

echo ""
read -p "Continue with consolidation? (yes/no): " proceed
if [ "$proceed" != "yes" ]; then
    echo "❌ Consolidation cancelled"
    exit 1
fi

echo ""
echo "💡 Recommendation:"
echo "Instead of automatically consolidating, consider:"
echo "1. Create a new consolidated initial schema from current DB state"
echo "2. Group remaining migrations by feature"
echo "3. Keep critical fixes separate"
echo ""
echo "Run: supabase db dump -f schema.sql to get current schema"
echo "Then manually create consolidated migrations"

