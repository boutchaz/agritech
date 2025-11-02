#!/bin/bash

# Quick dump using Supabase CLI credentials but bypassing Docker
# This extracts credentials from CLI and uses pg_dump directly

set -e

OUTPUT_FILE="supabase/migrations/00000000000000_consolidated_schema.sql"

echo "🚀 Dumping schema using Supabase CLI credentials..."
echo ""

# Extract credentials from Supabase CLI dry-run
echo "📋 Getting connection details from Supabase CLI..."

# Create temp file to capture dry-run output
TEMP_OUTPUT=$(mktemp)

# Get the connection script (this works without Docker)
supabase db dump --linked --schema public --data-only=false --dry-run > "$TEMP_OUTPUT" 2>&1

# Extract credentials
export PGHOST=$(grep 'export PGHOST' "$TEMP_OUTPUT" | cut -d'"' -f2)
export PGPORT=$(grep 'export PGPORT' "$TEMP_OUTPUT" | cut -d'"' -f2)
export PGUSER=$(grep 'export PGUSER' "$TEMP_OUTPUT" | cut -d'"' -f2)
export PGPASSWORD=$(grep 'export PGPASSWORD' "$TEMP_OUTPUT" | cut -d'"' -f2)
export PGDATABASE=$(grep 'export PGDATABASE' "$TEMP_OUTPUT" | cut -d'"' -f2)

# Clean up
rm -f "$TEMP_OUTPUT"

if [ -z "$PGHOST" ] || [ -z "$PGUSER" ]; then
    echo "❌ Failed to extract credentials"
    exit 1
fi

echo "✅ Connected to: $PGHOST"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found!"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  brew install postgresql"
    exit 1
fi

# Dump using pg_dump directly
echo "📦 Dumping schema..."
pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --schema-only \
    --no-owner \
    --no-privileges \
    > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema dumped successfully!"
    echo "📁 File: $OUTPUT_FILE"
    ls -lh "$OUTPUT_FILE" | awk '{print "   Size: " $5}'
    
    # Count objects
    TABLES=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" 2>/dev/null || echo "0")
    FUNCTIONS=$(grep -c "CREATE.*FUNCTION" "$OUTPUT_FILE" 2>/dev/null || echo "0")
    POLICIES=$(grep -c "CREATE POLICY" "$OUTPUT_FILE" 2>/dev/null || echo "0")
    
    echo ""
    echo "📊 Schema contains:"
    echo "   Tables: $TABLES"
    echo "   Functions: $FUNCTIONS"
    echo "   Policies: $POLICIES"
else
    echo ""
    echo "❌ Dump failed"
    exit 1
fi

