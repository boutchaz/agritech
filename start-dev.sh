#!/bin/bash
# AgriTech Development Environment - Start All Services
# This script starts Supabase, Backend API, Frontend, Marketplace, and Admin App

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
# 1. Start Supabase (CLI)
# ========================================
echo "📦 Starting Supabase..."
cd "$AGRITECH_ROOT/project"
supabase start > "$LOG_DIR/supabase.log" 2>&1 &
echo "✅ Supabase starting (API: 54321, Studio: 54323)..."
sleep 10

# ========================================
# 2. Stop existing services
# ========================================
echo "🛑 Stopping existing services..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# ========================================
# 3. Start NestJS Backend API
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
# 7. Start Admin App (Vite)
# ========================================
echo "🔐 Starting Admin App (Vite)..."
cd "$AGRITECH_ROOT/admin-app"
nohup npm run dev > "$LOG_DIR/admin.log" 2>&1 &
echo "✅ Admin App starting on port 5174..."
sleep 3

# ========================================
# 8. Show Status
# ========================================
echo ""
echo "=========================================="
echo "✅ All Services Started!"
echo "=========================================="
echo ""
echo "Service            | Port  | URL                    | Log"
echo "-------------------|-------|------------------------|-------------"
echo "Supabase API      | 54321 | http://localhost:54321 | $LOG_DIR/supabase.log"
echo "Supabase Studio   | 54323 | http://localhost:54323 |"
echo "Backend API       | 3001  | http://localhost:3001  | $LOG_DIR/backend.log"
echo "Frontend          | 5173  | http://localhost:5173  | $LOG_DIR/frontend.log"
echo "Marketplace       | 3002  | http://localhost:3002  | $LOG_DIR/marketplace.log"
echo "Admin App         | 5174  | http://localhost:5174  | $LOG_DIR/admin.log"
echo ""
echo "📝 View logs:"
echo "   tail -f $LOG_DIR/frontend.log"
echo "   tail -f $LOG_DIR/backend.log"
echo "   tail -f $LOG_DIR/marketplace.log"
echo "   tail -f $LOG_DIR/admin.log"
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

check_port 54321 # Supabase API
check_port 54323 # Supabase Studio
check_port 3001  # Backend API
check_port 5173  # Frontend
check_port 3002  # Marketplace
check_port 5174  # Admin App

echo ""
echo "✨ Development environment ready!"
echo "   Frontend: http://localhost:5173"
echo "   Admin App: http://localhost:5174"
echo "   Marketplace: http://localhost:3002"
echo "   Supabase Studio: http://localhost:54323"
echo ""
