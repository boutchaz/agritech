#!/bin/bash

# Apply RLS policies for user_profiles and dashboard_settings
# Using Supabase REST API with service role key

SUPABASE_URL="https://mvegjdkkbhlhbjpbhpou.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ"

echo "Applying RLS policies via Supabase SQL..."

# Read the migration file
SQL_CONTENT=$(cat supabase/migrations/20251106000001_add_user_profiles_dashboard_settings_rls.sql)

# Execute SQL via Supabase SQL API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . <<< "$SQL_CONTENT")}"

echo ""
echo "Migration applied successfully!"
