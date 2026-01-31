#!/bin/bash
# AgriTech Development Environment - Stop All Services

echo "=========================================="
echo "🛑 Stopping AgriTech Dev Environment"
echo "=========================================="
echo ""

# Stop Node processes
echo "🛑 Stopping Node.js services..."
pkill -f "nest start" 2>/dev/null && echo "✅ Backend API stopped" || echo "ℹ️  Backend API not running"
pkill -f "vite" 2>/dev/null && echo "✅ Frontend stopped" || echo "ℹ️  Frontend not running"

# Stop Python processes
echo ""
echo "🛑 Stopping Python services..."
pkill -f "uvicorn app.main" 2>/dev/null && echo "✅ Satellite Service stopped" || echo "ℹ️  Satellite Service not running"

# Stop Docker containers
echo ""
echo "🛑 Stopping Docker containers..."
cd /Users/boutchaz/Documents/CodeLovers/agritech/supabase
docker compose down 2>/dev/null && echo "✅ Supabase stopped" || echo "ℹ️  Supabase not running"

echo ""
echo "=========================================="
echo "✅ All services stopped"
echo "=========================================="
