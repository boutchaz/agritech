#!/bin/bash

# Simple script to apply the migration to remote database
# This uses psql directly with the correct connection string

echo "🚀 Applying trial subscription migration to remote database..."
echo ""

# Read the migration file
MIGRATION_SQL=$(cat supabase/migrations/20251006000001_allow_trial_subscription_creation.sql)

# Apply using psql with proper connection string
export PGPASSWORD='chn6ldl4lnfgsafgmihqvxebojnyz6ut'

# Try connecting to the database
psql "postgresql://postgres.mvegjdkkbhlhbjpbhpou:${PGPASSWORD}@agritech-supabase-652186-5-75-154-125.traefik.me:6543/postgres" \
  -f supabase/migrations/20251006000001_allow_trial_subscription_creation.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
else
    echo ""
    echo "❌ Failed to apply migration automatically."
    echo ""
    echo "Please apply manually via Supabase Dashboard:"
    echo "1. Go to: https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql/new"
    echo "2. Copy and paste the SQL from:"
    echo "   supabase/migrations/20251006000001_allow_trial_subscription_creation.sql"
    echo "3. Click 'Run'"
fi
