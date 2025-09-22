#!/bin/bash

# Start Adminer for database management
echo "🚀 Starting Adminer database management tool..."

# Navigate to supabase directory
cd /Users/boutchaz/Documents/CodeLovers/agritech/project/supabase

# Start Adminer container
echo "📦 Starting Adminer container..."
docker compose up -d adminer

# Wait a moment for container to start
sleep 5

# Check if Adminer is running
if docker compose ps adminer | grep -q "Up"; then
    echo "✅ Adminer is running!"
    echo ""
    echo "🌐 Access Adminer at:"
    echo "   Local: http://localhost:8080"
    echo "   Remote: http://adminer-agritech-5-75-154-125.traefik.me"
    echo ""
    echo "🔐 Login credentials:"
    echo "   System: PostgreSQL"
    echo "   Server: db"
    echo "   Username: postgres"
    echo "   Password: [your POSTGRES_PASSWORD from .env]"
    echo "   Database: postgres"
    echo ""
    echo "📊 Features available:"
    echo "   - Browse all tables and data"
    echo "   - Export database (SQL, CSV, JSON)"
    echo "   - Run custom SQL queries"
    echo "   - View table structures"
    echo "   - Import data"
    echo ""
    echo "💡 To export your database:"
    echo "   1. Go to the Export tab"
    echo "   2. Choose SQL format for complete dump"
    echo "   3. Select all tables"
    echo "   4. Download the file"
else
    echo "❌ Failed to start Adminer. Check the logs:"
    docker compose logs adminer
fi
