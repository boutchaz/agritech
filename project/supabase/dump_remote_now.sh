#!/bin/bash

# Quick script to dump remote schema
# Your project ref: mvegjdkkbhlhbjpbhpou

PROJECT_REF="mvegjdkkbhlhbjpbhpou"
DB_HOST="db.${PROJECT_REF}.supabase.co"
OUTPUT_FILE="supabase/migrations/00000000000000_consolidated_schema.sql"

echo "🚀 Dumping remote schema..."
echo "Project: $PROJECT_REF"
echo "Host: $DB_HOST"
echo ""

# Check if password is set
if [ -z "$PGPASSWORD" ]; then
    echo "⚠️  PGPASSWORD not set"
    echo ""
    echo "Please set your database password:"
    echo "  export PGPASSWORD='your-database-password'"
    echo ""
    echo "Or provide it when prompted:"
    read -sp "Database password: " PGPASSWORD
    export PGPASSWORD
    echo ""
fi

echo "📦 Dumping schema..."
pg_dump \
    --host="$DB_HOST" \
    --port=5432 \
    --username=postgres \
    --dbname=postgres \
    --schema-only \
    --no-owner \
    --no-privileges \
    --verbose \
    > "$OUTPUT_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema dumped successfully!"
    echo "📁 File: $OUTPUT_FILE"
    ls -lh "$OUTPUT_FILE" | awk '{print "   Size: " $5}'
    
    # Count objects
    TABLES=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" || echo "0")
    FUNCTIONS=$(grep -c "CREATE.*FUNCTION" "$OUTPUT_FILE" || echo "0")
    POLICIES=$(grep -c "CREATE POLICY" "$OUTPUT_FILE" || echo "0")
    
    echo ""
    echo "📊 Objects in schema:"
    echo "   Tables: $TABLES"
    echo "   Functions: $FUNCTIONS"
    echo "   Policies: $POLICIES"
else
    echo ""
    echo "❌ Dump failed. Common issues:"
    echo "   1. Incorrect password"
    echo "   2. IP not allowed (check Supabase Dashboard → Settings → Database)"
    echo "   3. Database connection issue"
    echo ""
    echo "Get your password from: Supabase Dashboard → Settings → Database → Database Password"
    exit 1
fi

