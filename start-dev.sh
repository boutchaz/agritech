#!/bin/bash
# AgriTech Development Environment - Start All Services
# This script starts Supabase, Backend API, Satellite Service, and Frontend

set -e

AGRITECH_ROOT="/Users/boutchaz/Documents/CodeLovers/agritech"
LOG_DIR="/tmp/agritech-dev"

# Create log directory
mkdir -p "$LOG_DIR"

echo "=========================================="
echo "🚀 Starting AgriTech Dev Environment"
echo "=========================================="
echo ""

# ========================================
# 1. Start Supabase (Docker)
# ========================================
echo "📦 Starting Supabase..."
cd "$AGRITECH_ROOT/supabase"
docker compose up -d > "$LOG_DIR/supabase.log" 2>&1 &
echo "✅ Supabase starting..."
sleep 5

# ========================================
# 2. Stop existing services
# ========================================
echo "🛑 Stopping existing services..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "uvicorn app.main" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# ========================================
# 3. Start Satellite Service (CDSE)
# ========================================
echo "🛰️  Starting Satellite Service (CDSE)..."
cd "$AGRITECH_ROOT/backend-service"

# Create satellite startup script
cat > "$AGRITECH_ROOT/backend-service/.satellite-env" << 'ENVEOF'
export SATELLITE_PROVIDER="cdse"
export CDSE_CLIENT_ID="sh-d0d326a1-bf76-42b5-8ab7-fbcc4f3abf75"
export CDSE_CLIENT_SECRET="BaFw0ySSORrz6Gec4aoV7yrL3P4IE7IZ"
export CDSE_OPENEO_URL="https://openeo.dataspace.copernicus.eu"
export PYTHONUNBUFFERED=1
ENVEOF

# Start satellite service
source .satellite-env
nohup venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload > "$LOG_DIR/satellite.log" 2>&1 &
echo "✅ Satellite Service starting on port 8001..."
sleep 3

# ========================================
# 4. Start NestJS Backend API
# ========================================
echo "🔧 Starting Backend API (NestJS)..."
cd "$AGRITECH_ROOT/agritech-api"
nohup npm run start:dev > "$LOG_DIR/backend.log" 2>&1 &
echo "✅ Backend API starting on port 3001..."
sleep 5

# ========================================
# 5. Start Frontend (Vite)
# ========================================
echo "🎨 Starting Frontend (Vite)..."
cd "$AGRITECH_ROOT/project"

# Ensure .env is configured
if ! grep -q "VITE_SATELLITE_SERVICE_URL=http://localhost:8001" .env; then
    echo "VITE_SATELLITE_SERVICE_URL=http://localhost:8001" >> .env
fi

nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
echo "✅ Frontend starting on port 5173..."
sleep 5

# ========================================
# 6. Start Marketplace Frontend (Next.js)
# ========================================
echo "🛒 Starting Marketplace Frontend (Next.js)..."
cd "$AGRITECH_ROOT/marketplace-frontend"

# Ensure .env.local is configured
if [ ! -f .env.local ]; then
    echo "⚠️  Creating .env.local for local development..."
    cat > .env.local << 'MKTENVEOF'
# Local Development - Marketplace Frontend
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
NEXT_PUBLIC_API_URL=http://localhost:3001
MKTENVEOF
fi

nohup npx next dev --port 3002 > "$LOG_DIR/marketplace.log" 2>&1 &
echo "✅ Marketplace starting on port 3002..."
sleep 5

# ========================================
# 7. Show Status
# ========================================
echo ""
echo "=========================================="
echo "✅ All Services Started!"
echo "=========================================="
echo ""
echo "Service            | Port  | URL                    | Log"
echo "-------------------|-------|------------------------|-------------"
echo "Supabase          | N/A   | Local Docker           | $LOG_DIR/supabase.log"
echo "Backend API       | 3001  | http://localhost:3001  | $LOG_DIR/backend.log"
echo "Satellite Service | 8001  | http://localhost:8001  | $LOG_DIR/satellite.log"
echo "Frontend          | 5173  | http://localhost:5173  | $LOG_DIR/frontend.log"
echo "Marketplace       | 3002  | http://localhost:3002  | $LOG_DIR/marketplace.log"
echo ""
echo "📝 View logs:"
echo "   tail -f $LOG_DIR/frontend.log"
echo "   tail -f $LOG_DIR/backend.log"
echo "   tail -f $LOG_DIR/satellite.log"
echo "   tail -f $LOG_DIR/marketplace.log"
echo ""
echo "🛑 Stop all services:"
echo "   ./stop-dev.sh"
echo ""
echo "=========================================="

# ========================================
# 8. Verify Services
# ========================================
sleep 3
echo "🔍 Verifying services..."
echo ""

check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo "✅ Port $1: Running"
    else
        echo "❌ Port $1: Not running yet"
    fi
}

check_port 3001  # Backend API
check_port 5173  # Frontend
check_port 8001  # Satellite Service
check_port 3002  # Marketplace

echo ""
echo "✨ Development environment ready!"
echo "   Frontend: http://localhost:5173"
echo "   Marketplace: http://localhost:3002"
echo ""
