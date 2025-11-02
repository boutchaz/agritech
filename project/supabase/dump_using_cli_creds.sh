#!/bin/bash

# Extract Supabase CLI credentials and use pg_dump directly
# This bypasses Docker requirement

set -e

OUTPUT_FILE="supabase/migrations/00000000000000_consolidated_schema.sql"
BACKUP_DIR="supabase/schema_backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "🚀 Dumping Remote Schema Using Supabase CLI Credentials"
echo "======================================================="
echo ""

# Method 1: Extract credentials from dry-run and use pg_dump
echo "📋 Extracting connection details from Supabase CLI..."
echo "----------------------------------------------------"

# Get the connection script from dry-run
TEMP_SCRIPT=$(mktemp)
supabase db dump --linked --schema public --data-only=false --dry-run > "$TEMP_SCRIPT" 2>&1

# Extract credentials from the script
export PGHOST=$(grep "export PGHOST" "$TEMP_SCRIPT" | cut -d'"' -f2)
export PGPORT=$(grep "export PGPORT" "$TEMP_SCRIPT" | cut -d'"' -f2)
export PGUSER=$(grep "export PGUSER" "$TEMP_SCRIPT" | cut -d'"' -f2)
export PGPASSWORD=$(grep "export PGPASSWORD" "$TEMP_SCRIPT" | cut -d'"' -f2)
export PGDATABASE=$(grep "export PGDATABASE" "$TEMP_SCRIPT" | cut -d'"' -f2)

# Clean up temp file
rm -f "$TEMP_SCRIPT"

if [ -z "$PGHOST" ] || [ -z "$PGUSER" ]; then
    echo "❌ Failed to extract credentials from Supabase CLI"
    exit 1
fi

echo "✅ Connection details extracted:"
echo "   Host: $PGHOST"
echo "   Port: $PGPORT"
echo "   User: $PGUSER"
echo "   Database: $PGDATABASE"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Installing PostgreSQL client..."
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    exit 1
fi

echo "📦 Dumping schema..."
pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --file="$OUTPUT_FILE" \
    --verbose 2>&1 | grep -v "password" || {
    echo ""
    echo "❌ Dump failed. Trying alternative method..."
    exit 1
}

# Also create timestamped backup
cp "$OUTPUT_FILE" "$BACKUP_DIR/remote_schema_${DATE}.sql"

echo ""
echo "✅ Schema dumped successfully!"
echo ""
echo "📁 Files created:"
ls -lh "$OUTPUT_FILE" | awk '{print "   " $9 " (" $5 ")"}'
ls -lh "$BACKUP_DIR/remote_schema_${DATE}.sql" | awk '{print "   " $9 " (" $5 ")"}'

# Count objects
TABLES=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" 2>/dev/null || echo "0")
FUNCTIONS=$(grep -c "CREATE.*FUNCTION" "$OUTPUT_FILE" 2>/dev/null || echo "0")
POLICIES=$(grep -c "CREATE POLICY" "$OUTPUT_FILE" 2>/dev/null || echo "0")

echo ""
echo "📊 Objects in schema:"
echo "   Tables: $TABLES"
echo "   Functions: $FUNCTIONS"
echo "   Policies: $POLICIES"

