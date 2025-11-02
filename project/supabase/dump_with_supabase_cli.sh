#!/bin/bash

# Dump Remote Schema Using Supabase CLI
# Project: mvegjdkkbhlhbjpbhpou (agritech)

set -e

PROJECT_REF="mvegjdkkbhlhbjpbhpou"
OUTPUT_FILE="supabase/migrations/00000000000000_consolidated_schema.sql"
BACKUP_DIR="supabase/schema_backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "🚀 Dumping Remote Schema with Supabase CLI"
echo "=========================================="
echo "Project: agritech ($PROJECT_REF)"
echo ""

# Method 1: Try using --db-url (bypasses Docker)
echo "📋 Method 1: Using --db-url (Direct Connection)"
echo "------------------------------------------------"

# Check if password is available
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "⚠️  SUPABASE_DB_PASSWORD not set"
    echo ""
    echo "Please set your database password:"
    echo "  export SUPABASE_DB_PASSWORD='your-database-password'"
    echo ""
    echo "Get it from: Supabase Dashboard → Settings → Database → Database Password"
    echo ""
    read -sp "Or enter password now: " DB_PASSWORD
    export SUPABASE_DB_PASSWORD="$DB_PASSWORD"
    echo ""
fi

# Construct connection string
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "📦 Attempting dump with --db-url..."
supabase db dump \
    --db-url "$DB_URL" \
    --schema public \
    --data-only=false \
    --file "$OUTPUT_FILE" \
    2>&1 | grep -v "password" || {
    echo ""
    echo "⚠️  Method 1 failed, trying Method 2..."
    echo ""
    
    # Method 2: Try with --linked and explicit password
    echo "📋 Method 2: Using --linked with password flag"
    echo "--------------------------------------------"
    
    supabase db dump \
        --linked \
        --schema public \
        --data-only=false \
        --password "$SUPABASE_DB_PASSWORD" \
        --file "$OUTPUT_FILE" \
        2>&1 | grep -v "password" || {
        echo ""
        echo "❌ Both methods failed."
        echo ""
        echo "Troubleshooting:"
        echo "  1. Make sure Docker is not required (check CLI version)"
        echo "  2. Verify password is correct"
        echo "  3. Try updating Supabase CLI:"
        echo "     brew upgrade supabase/tap/supabase"
        echo "  4. Or use pg_dump directly (see dump_remote_now.sh)"
        exit 1
    }
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

