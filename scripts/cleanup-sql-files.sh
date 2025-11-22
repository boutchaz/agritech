#!/bin/bash

# SQL Files Cleanup Script
# This script organizes and removes unnecessary SQL files from the AgriTech project

set -e

echo "🧹 Starting SQL files cleanup..."

# Root directory
ROOT_DIR="/Users/boutchaz/Documents/CodeLovers/agritech"
ARCHIVE_DIR="$ROOT_DIR/.archive/sql-cleanup-$(date +%Y%m%d-%H%M%S)"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

echo "📦 Created archive directory: $ARCHIVE_DIR"

# Function to move file to archive
archive_file() {
  local file="$1"
  local reason="$2"

  if [ -f "$file" ]; then
    # Create subdirectory structure in archive
    local rel_path="${file#$ROOT_DIR/}"
    local archive_path="$ARCHIVE_DIR/$(dirname "$rel_path")"

    mkdir -p "$archive_path"
    mv "$file" "$archive_path/"
    echo "  ✓ Archived: $rel_path ($reason)"
  fi
}

echo ""
echo "🗂️  Cleaning up root directory SQL files..."

# Root directory files (debugging, one-off fixes)
archive_file "$ROOT_DIR/debug-access-issue.sql" "debugging script"
archive_file "$ROOT_DIR/fix-admin-role.sql" "one-off fix"
archive_file "$ROOT_DIR/fix-parcel-rls.sql" "superseded by migration 20251122000002"

echo ""
echo "🗂️  Cleaning up project directory SQL files..."

# Project root directory files
archive_file "$ROOT_DIR/project/fix_accounts_currency.sql" "one-off fix"
archive_file "$ROOT_DIR/project/FIX_ACCOUNTS_SCHEMA.sql" "one-off fix"
archive_file "$ROOT_DIR/project/fix_currency_to_mad.sql" "one-off fix"
archive_file "$ROOT_DIR/project/structures-table-complete.sql" "superseded by schema"
archive_file "$ROOT_DIR/project/create-structures-table.sql" "superseded by schema"
archive_file "$ROOT_DIR/project/apply_tasks_migration.sql" "one-off migration"
archive_file "$ROOT_DIR/project/apply-tasks-migration.sql" "duplicate migration"
archive_file "$ROOT_DIR/project/create_subscription.sql" "debugging script"
archive_file "$ROOT_DIR/project/check_currency_status.sql" "debugging script"
archive_file "$ROOT_DIR/project/CRITICAL_RLS_POLICIES_NEEDED.sql" "superseded by schema"
archive_file "$ROOT_DIR/project/ONBOARDING_FIX.sql" "one-off fix"
archive_file "$ROOT_DIR/project/apply_assignable_users.sql" "one-off migration"
archive_file "$ROOT_DIR/project/check_subscription_access.sql" "debugging script"
archive_file "$ROOT_DIR/project/check_org_subscription.sql" "debugging script"
archive_file "$ROOT_DIR/project/VERIFY_RLS_POLICIES.sql" "debugging script"

echo ""
echo "🗂️  Cleaning up project/scripts directory (debugging files)..."

# Scripts directory - keep only essential scripts
SCRIPTS_DIR="$ROOT_DIR/project/scripts"
if [ -d "$SCRIPTS_DIR" ]; then
  archive_file "$SCRIPTS_DIR/GRANT_SUBSCRIPTION_NOW.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/debug-subscriptions.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/list-tables.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/create-subscription-from-webhook.sql" "superseded by API"
  archive_file "$SCRIPTS_DIR/fix-remote-function-params.sql" "one-off fix"
  archive_file "$SCRIPTS_DIR/verify-deployment.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/check-subscriptions.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/debug-blocking-issue.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/verify-blocking.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/create-my-subscription.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/test-complete-blocking.sql" "debugging script"
  archive_file "$SCRIPTS_DIR/grant-test-subscription.sql" "debugging script"
fi

echo ""
echo "🗂️  Removing schema backup (use git history instead)..."

# Remove schema backup - git history is the source of truth
SCHEMA_BACKUP="$ROOT_DIR/project/supabase/migrations/00000000000000_schema.sql.backup"
if [ -f "$SCHEMA_BACKUP" ]; then
  archive_file "$SCHEMA_BACKUP" "use git history instead"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Archived files to: $ARCHIVE_DIR"
echo "  - Remaining essential files:"
echo "    • project/supabase/migrations/00000000000000_schema.sql (main schema)"
echo "    • project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql"
echo "    • project/supabase/seed/*.sql (seed data)"
echo "    • backend-service/database/*.sql (satellite service schema)"
echo ""
echo "💡 Tip: The archived files are safe to delete after verifying the system works correctly."
echo "    To restore a file: cp $ARCHIVE_DIR/path/to/file.sql /original/location/"
echo ""
