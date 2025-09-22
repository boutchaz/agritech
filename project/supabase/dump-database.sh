#!/bin/sh

# Database dump utility script
# This script uses the pg_dump container to create database dumps

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Container names
DB_DUMP_CONTAINER="${CONTAINER_PREFIX:-supabase}-db-dump"
DB_UTILS_CONTAINER="${CONTAINER_PREFIX:-supabase}-db-utils"

# Check if containers are running
if ! docker ps | grep -q "$DB_DUMP_CONTAINER"; then
    echo "❌ Database dump container is not running. Starting it..."
    docker compose up -d db-dump
    sleep 5
fi

if ! docker ps | grep -q "$DB_UTILS_CONTAINER"; then
    echo "❌ Database utilities container is not running. Starting it..."
    docker compose up -d db-utils
    sleep 5
fi

echo "🚀 Database dump utilities ready!"
echo ""

# Function to dump with pg_dump
dump_with_pgdump() {
    local dump_type=$1
    local filename=$2
    
    echo "📋 Creating $dump_type dump with pg_dump..."
    
    case $dump_type in
        "schema")
            docker exec $DB_DUMP_CONTAINER sh -c "
                pg_dump -h db -p ${POSTGRES_PORT:-5432} -U postgres -d ${POSTGRES_DB:-postgres} \
                --schema-only --no-owner --no-privileges --clean --if-exists \
                > /dumps/$filename
            "
            ;;
        "data")
            docker exec $DB_DUMP_CONTAINER sh -c "
                pg_dump -h db -p ${POSTGRES_PORT:-5432} -U postgres -d ${POSTGRES_DB:-postgres} \
                --data-only --no-owner --no-privileges \
                > /dumps/$filename
            "
            ;;
        "complete")
            docker exec $DB_DUMP_CONTAINER sh -c "
                pg_dump -h db -p ${POSTGRES_PORT:-5432} -U postgres -d ${POSTGRES_DB:-postgres} \
                --no-owner --no-privileges --clean --if-exists \
                > /dumps/$filename
            "
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo "✅ $dump_type dump created: files/volumes/dumps/$filename"
    else
        echo "❌ Failed to create $dump_type dump"
        return 1
    fi
}

# Function to dump with advanced pg_dump (from db-utils container)
dump_with_utils() {
    local dump_type=$1
    local filename=$2
    
    echo "📋 Creating $dump_type dump with advanced pg_dump..."
    
    case $dump_type in
        "schema")
            docker exec $DB_UTILS_CONTAINER sh -c "
                pg_dump -h db -p ${POSTGRES_PORT:-5432} -U postgres -d ${POSTGRES_DB:-postgres} \
                --schema-only --no-owner --no-privileges --clean --if-exists \
                > /workspace/$filename
            "
            ;;
        "data")
            docker exec $DB_UTILS_CONTAINER sh -c "
                pg_dump -h db -p ${POSTGRES_PORT:-5432} -U postgres -d ${POSTGRES_DB:-postgres} \
                --data-only --no-owner --no-privileges \
                > /workspace/$filename
            "
            ;;
        "complete")
            docker exec $DB_UTILS_CONTAINER sh -c "
                pg_dump -h db -p ${POSTGRES_PORT:-5432} -U postgres -d ${POSTGRES_DB:-postgres} \
                --no-owner --no-privileges --clean --if-exists \
                > /workspace/$filename
            "
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo "✅ $dump_type dump created: $filename"
    else
        echo "❌ Failed to create $dump_type dump"
        return 1
    fi
}

# Main menu
echo "Choose dump method:"
echo "1) pg_dump (basic container)"
echo "2) pg_dump (advanced container)"
echo "3) Both methods"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📋 Creating dumps with basic pg_dump..."
        dump_with_pgdump "schema" "schema_pgdump.sql"
        dump_with_pgdump "data" "data_pgdump.sql"
        dump_with_pgdump "complete" "complete_pgdump.sql"
        ;;
    2)
        echo ""
        echo "📋 Creating dumps with advanced pg_dump..."
        dump_with_utils "schema" "schema_utils.sql"
        dump_with_utils "data" "data_utils.sql"
        dump_with_utils "complete" "complete_utils.sql"
        ;;
    3)
        echo ""
        echo "📋 Creating dumps with both methods..."
        dump_with_pgdump "schema" "schema_pgdump.sql"
        dump_with_pgdump "data" "data_pgdump.sql"
        dump_with_pgdump "complete" "complete_pgdump.sql"
        dump_with_utils "schema" "schema_utils.sql"
        dump_with_utils "data" "data_utils.sql"
        dump_with_utils "complete" "complete_utils.sql"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Database dumps completed!"
echo ""
echo "📁 Files created:"
echo "   Basic pg_dump files: files/volumes/dumps/"
echo "   Advanced pg_dump files: $(pwd)/"
echo ""
echo "💡 To restore a database:"
echo "   psql -h HOST -p PORT -U USER -d DATABASE -f FILENAME.sql"
echo ""
echo "🔧 To access containers manually:"
echo "   docker exec -it $DB_DUMP_CONTAINER sh"
echo "   docker exec -it $DB_UTILS_CONTAINER sh"
