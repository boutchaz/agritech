#!/bin/bash

# Apply Supabase migrations to remote database
# This script applies the schema files to your remote Supabase instance

echo "🚀 Applying Supabase migrations to remote database..."

# Set your Supabase project details
SUPABASE_URL="http://agritech-supabase-652186-5-75-154-125.traefik.me"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc1ODQ0NzksImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiZG9rcGxveSJ9.fLPJqpGkPZDoJGQEp31ivplmoMF1mD2sSaeSAc_mscQ"

# Function to execute SQL
execute_sql() {
    local sql_file=$1
    echo "📄 Applying $sql_file..."
    
    curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"sql\": \"$(cat "$sql_file" | sed 's/"/\\"/g' | tr '\n' ' ')\"}" \
        --silent --show-error
}

# Apply schema files in order
echo "📋 Applying schema files..."

# 1. Tables
execute_sql "supabase/schemas/01_tables.sql"

# 2. Foreign keys
execute_sql "supabase/schemas/02_foreign_keys.sql"

# 3. Indexes
execute_sql "supabase/schemas/03_indexes.sql"

# 4. Triggers
execute_sql "supabase/schemas/04_triggers.sql"

# 5. Permissions
execute_sql "supabase/schemas/05_permissions.sql"

# 6. Seed data
execute_sql "supabase/seed.sql"

echo "✅ All migrations applied successfully!"
echo "🔗 Your database is now ready at: $SUPABASE_URL"
