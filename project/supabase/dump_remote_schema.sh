#!/bin/bash

# Dump Remote Supabase Database Schema Directly
# This script dumps the remote database without requiring Docker

set -e

echo "🚀 Remote Database Schema Dump"
echo "================================"
echo ""

# Check for required tools
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client tools."
    echo "   macOS: brew install postgresql"
    echo "   Or download from: https://www.postgresql.org/download/"
    exit 1
fi

# Get connection details
echo "📋 Step 1: Getting Database Connection Details"
echo "----------------------------------------------"

# Check if project ref is set
PROJECT_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")

if [ -z "$PROJECT_REF" ]; then
    echo "⚠️  Project not linked locally"
    read -p "Enter your Supabase project ref: " PROJECT_REF
fi

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project ref required"
    exit 1
fi

echo "Project ref: $PROJECT_REF"
echo ""

# Get database password
read -sp "Enter your database password (or press Enter to use SUPABASE_DB_PASSWORD env var): " DB_PASSWORD
echo ""

# Use environment variable if password not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="${SUPABASE_DB_PASSWORD}"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  No password provided. Trying to get from Supabase config..."
fi

# Construct connection string
# Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

OUTPUT_FILE="supabase/migrations/00000000000000_consolidated_schema.sql"
BACKUP_DIR="supabase/schema_backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo ""
echo "📦 Step 2: Dumping Schema"
echo "-------------------------"

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Attempting dump without explicit password..."
    echo "   You may be prompted for password, or use:"
    echo "   export PGPASSWORD='your-password'"
    echo ""
    
    # Try with pg_dump using connection string
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --file="$OUTPUT_FILE" \
        --verbose 2>&1 | grep -v "password" || {
        echo "❌ Failed to dump. Please provide password:"
        echo "   export PGPASSWORD='your-db-password'"
        echo "   Then run this script again"
        exit 1
    }
else
    export PGPASSWORD="$DB_PASSWORD"
    
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --file="$OUTPUT_FILE" \
        --verbose 2>&1 | grep -v "password" || {
        echo "❌ Dump failed. Please check:"
        echo "   1. Database password is correct"
        echo "   2. Database is accessible from your network"
        echo "   3. IP is allowed in Supabase dashboard (Settings → Database → Connection Pooling)"
        exit 1
    }
fi

# Also create timestamped backup
cp "$OUTPUT_FILE" "$BACKUP_DIR/remote_schema_${DATE}.sql"

echo ""
echo "✅ Schema dumped successfully!"
echo ""
echo "📁 Files created:"
ls -lh "$OUTPUT_FILE" | awk '{print "   " $9 " (" $5 ")"}'
ls -lh "$BACKUP_DIR/remote_schema_${DATE}.sql" | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "📝 Next steps:"
echo "   1. Review the consolidated schema: $OUTPUT_FILE"
echo "   2. Clean and organize it"
echo "   3. Test on fresh database: supabase db reset"

