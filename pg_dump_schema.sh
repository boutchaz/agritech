#!/bin/sh

# PostgreSQL direct dump script
# This requires direct access to your Supabase PostgreSQL database

# Configuration - Update these with your actual Supabase database details
DB_HOST="db.agritech-supabase-652186-5-75-154-125.traefik.me"  # Update this
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD=""  # You'll need to provide this

# Output files
SCHEMA_FILE="database_schema_pgdump.sql"
DATA_FILE="database_data_pgdump.sql"
COMPLETE_FILE="complete_database_pgdump.sql"

echo "🚀 Starting PostgreSQL direct dump..."

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Please install PostgreSQL client tools:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql-client"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if password is provided
if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Database password not set. Please update the DB_PASSWORD variable in this script."
    echo "💡 You can find your database password in:"
    echo "   - Supabase Dashboard → Settings → Database → Connection string"
    echo "   - Or in your Supabase project settings"
    exit 1
fi

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

echo "📋 Dumping database schema..."

# Dump schema only (CREATE TABLE statements, indexes, etc.)
pg_dump -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Schema dumped to: $SCHEMA_FILE"
else
    echo "❌ Failed to dump schema"
    exit 1
fi

echo "📊 Dumping database data..."

# Dump data only
pg_dump -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --data-only \
        --no-owner \
        --no-privileges \
        -f "$DATA_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Data dumped to: $DATA_FILE"
else
    echo "❌ Failed to dump data"
    exit 1
fi

echo "🔗 Creating complete dump..."

# Combine schema and data
echo "-- Complete Database Dump (pg_dump)" > "$COMPLETE_FILE"
echo "-- Generated on: $(date)" >> "$COMPLETE_FILE"
echo "-- Source: PostgreSQL direct connection" >> "$COMPLETE_FILE"
echo "-- Host: $DB_HOST" >> "$COMPLETE_FILE"
echo "-- Database: $DB_NAME" >> "$COMPLETE_FILE"
echo "" >> "$COMPLETE_FILE"

# Add schema first
if [ -f "$SCHEMA_FILE" ]; then
    echo "-- Database Schema" >> "$COMPLETE_FILE"
    echo "-- ==============" >> "$COMPLETE_FILE"
    cat "$SCHEMA_FILE" >> "$COMPLETE_FILE"
    echo "" >> "$COMPLETE_FILE"
fi

# Add data
if [ -f "$DATA_FILE" ]; then
    echo "-- Database Data" >> "$COMPLETE_FILE"
    echo "-- =============" >> "$COMPLETE_FILE"
    cat "$DATA_FILE" >> "$COMPLETE_FILE"
fi

echo "-- End of complete dump" >> "$COMPLETE_FILE"

# Clean up environment variable
unset PGPASSWORD

echo "🎉 Complete database dump created:"
echo "   📋 Schema: $SCHEMA_FILE"
echo "   📊 Data: $DATA_FILE"
echo "   🔗 Complete: $COMPLETE_FILE"
echo ""
echo "💡 To restore this database:"
echo "   psql -h HOST -p PORT -U USER -d DATABASE -f $COMPLETE_FILE"
