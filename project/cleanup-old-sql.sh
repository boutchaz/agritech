#!/bin/bash

# Cleanup old SQL files after consolidating into schemas
echo "🧹 Cleaning up old SQL files..."

# List of old SQL files to remove (keeping the consolidated ones)
OLD_FILES=(
    "supabase/check-tables-exist.sql"
    "supabase/complete-database-fix.sql"
    "supabase/complete-setup.sql"
    "supabase/create-missing-functions.sql"
    "supabase/diagnose-database.sql"
    "supabase/ensure-farms-table.sql"
    "supabase/final-soil-fix.sql"
    "supabase/fix-farms-rls.sql"
    "supabase/fix-foreign-key-relationship.sql"
    "supabase/fix-foreign-key-simple.sql"
    "supabase/fix-schema-cache.sql"
    "supabase/fix-soil-analyses-minimal.sql"
    "supabase/fix-soil-analyses-simple.sql"
    "supabase/fix-soil-analyses-step-by-step.sql"
    "supabase/fix-soil-analyses.sql"
)

# Remove old files
for file in "${OLD_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing $file"
        rm "$file"
    else
        echo "ℹ️  $file not found (already removed)"
    fi
done

echo "✅ Cleanup completed!"
echo "📁 Your consolidated schema is in: supabase/schemas/00_complete_setup.sql"
echo "📖 Setup instructions: supabase/COMPLETE_SETUP.md"
