#!/bin/bash

# ===========================================
# AgriTech Local Development Startup Script
# ===========================================
# This script starts all services for local development:
# - Supabase (local Docker containers)
# - NestJS API (port 3001)
# - Satellite Service / Python FastAPI (port 8001)
# - Frontend Dashboard (port 5173)
#
# Usage:
#   ./scripts/dev-local.sh           # Start all services
#   ./scripts/dev-local.sh stop      # Stop all services
#   ./scripts/dev-local.sh status    # Check service status
#   ./scripts/dev-local.sh logs      # View all logs
#   ./scripts/dev-local.sh reset     # Reset local database
#
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Log file locations
LOG_DIR="$ROOT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"

# PID file locations
PID_DIR="$ROOT_DIR/.dev-pids"
mkdir -p "$PID_DIR"

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}  AgriTech Local Development            ${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Run: npm install -g pnpm"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI is not installed. Run: brew install supabase/tap/supabase"
        print_warning "Skipping local Supabase..."
    fi
    
    # Check Python (optional for satellite service)
    if ! command -v python3 &> /dev/null; then
        print_warning "Python3 is not installed. Satellite service will not start."
    fi
    
    print_status "Dependencies check passed"
}

setup_env_files() {
    print_info "Setting up environment files..."
    
    # Copy .env.local to .env for frontend if using local
    if [ -f "$ROOT_DIR/project/.env.local" ]; then
        cp "$ROOT_DIR/project/.env.local" "$ROOT_DIR/project/.env"
        print_status "Frontend .env configured for local development"
    fi
    
    # Copy .env.local to .env for API if exists
    if [ -f "$ROOT_DIR/agritech-api/.env.local" ]; then
        cp "$ROOT_DIR/agritech-api/.env.local" "$ROOT_DIR/agritech-api/.env"
        print_status "API .env configured for local development"
    fi
    
    # Copy .env.local to .env for satellite service if exists
    if [ -f "$ROOT_DIR/backend-service/.env.local" ]; then
        cp "$ROOT_DIR/backend-service/.env.local" "$ROOT_DIR/backend-service/.env"
        print_status "Satellite service .env configured for local development"
    fi
}

start_supabase() {
    print_info "Starting Supabase..."

    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found, skipping..."
        return
    fi

    cd "$ROOT_DIR/project/supabase"

    # Check if already running
    if supabase status &> /dev/null; then
        print_status "Supabase is already running"
    else
        print_info "Starting Supabase..."
        # Just start supabase without db reset for faster startup
        supabase start > "$LOG_DIR/supabase.log" 2>&1
        sleep 5 # Give Supabase time to fully start

        if supabase status &> /dev/null; then
            print_status "Supabase started successfully"
            print_info "  Studio: http://127.0.0.1:54323"
            print_info "  API: http://127.0.0.1:54321"
            print_info "  DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        else
            print_error "Failed to start Supabase. Check $LOG_DIR/supabase.log"
        fi
    fi

    cd "$ROOT_DIR"
}

start_api() {
    print_info "Starting NestJS API on port 3001..."
    
    cd "$ROOT_DIR/agritech-api"
    
    # Check if already running
    if [ -f "$PID_DIR/api.pid" ] && kill -0 $(cat "$PID_DIR/api.pid") 2>/dev/null; then
        print_status "API is already running (PID: $(cat $PID_DIR/api.pid))"
        return
    fi
    
    # Start in background
    pnpm start:dev > "$LOG_DIR/api.log" 2>&1 &
    echo $! > "$PID_DIR/api.pid"
    
    sleep 3
    
    if kill -0 $(cat "$PID_DIR/api.pid") 2>/dev/null; then
        print_status "API started (PID: $(cat $PID_DIR/api.pid))"
        print_info "  URL: http://localhost:3001"
        print_info "  Logs: $LOG_DIR/api.log"
    else
        print_error "Failed to start API. Check $LOG_DIR/api.log"
    fi
    
    cd "$ROOT_DIR"
}

start_satellite() {
    print_info "Starting Satellite Service on port 8001..."
    
    if ! command -v python3 &> /dev/null; then
        print_warning "Python3 not found, skipping satellite service..."
        return
    fi
    
    cd "$ROOT_DIR/backend-service"
    
    # Check if already running
    if [ -f "$PID_DIR/satellite.pid" ] && kill -0 $(cat "$PID_DIR/satellite.pid") 2>/dev/null; then
        print_status "Satellite service is already running (PID: $(cat $PID_DIR/satellite.pid))"
        return
    fi
    
    # Check for virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv and install deps
    source venv/bin/activate
    pip install -q -r requirements.txt 2>/dev/null || true
    
    # Start uvicorn
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 > "$LOG_DIR/satellite.log" 2>&1 &
    echo $! > "$PID_DIR/satellite.pid"
    
    sleep 3
    
    if kill -0 $(cat "$PID_DIR/satellite.pid") 2>/dev/null; then
        print_status "Satellite service started (PID: $(cat $PID_DIR/satellite.pid))"
        print_info "  URL: http://localhost:8001"
        print_info "  Docs: http://localhost:8001/docs"
        print_info "  Logs: $LOG_DIR/satellite.log"
    else
        print_error "Failed to start satellite service. Check $LOG_DIR/satellite.log"
    fi
    
    cd "$ROOT_DIR"
}

start_frontend() {
    print_info "Starting Frontend Dashboard on port 5173..."
    
    cd "$ROOT_DIR/project"
    
    # Check if already running
    if [ -f "$PID_DIR/frontend.pid" ] && kill -0 $(cat "$PID_DIR/frontend.pid") 2>/dev/null; then
        print_status "Frontend is already running (PID: $(cat $PID_DIR/frontend.pid))"
        return
    fi
    
    # Start Vite dev server
    pnpm dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
    
    sleep 3
    
    if kill -0 $(cat "$PID_DIR/frontend.pid") 2>/dev/null; then
        print_status "Frontend started (PID: $(cat $PID_DIR/frontend.pid))"
        print_info "  URL: http://localhost:5173"
        print_info "  Logs: $LOG_DIR/frontend.log"
    else
        print_error "Failed to start frontend. Check $LOG_DIR/frontend.log"
    fi
    
    cd "$ROOT_DIR"
}

stop_services() {
    print_header
    print_info "Stopping all services..."
    
    # Stop Frontend
    if [ -f "$PID_DIR/frontend.pid" ]; then
        kill $(cat "$PID_DIR/frontend.pid") 2>/dev/null && print_status "Frontend stopped" || true
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    # Stop API
    if [ -f "$PID_DIR/api.pid" ]; then
        kill $(cat "$PID_DIR/api.pid") 2>/dev/null && print_status "API stopped" || true
        rm -f "$PID_DIR/api.pid"
    fi
    
    # Stop Satellite
    if [ -f "$PID_DIR/satellite.pid" ]; then
        kill $(cat "$PID_DIR/satellite.pid") 2>/dev/null && print_status "Satellite service stopped" || true
        rm -f "$PID_DIR/satellite.pid"
    fi
    
    # Stop Supabase
    if command -v supabase &> /dev/null; then
        cd "$ROOT_DIR/project/supabase"
        supabase stop 2>/dev/null && print_status "Supabase stopped" || true
        cd "$ROOT_DIR"
    fi
    
    print_status "All services stopped"
}

show_status() {
    print_header
    print_info "Service Status:"
    echo ""
    
    # Supabase
    if command -v supabase &> /dev/null; then
        cd "$ROOT_DIR/project/supabase"
        if supabase status &> /dev/null; then
            print_status "Supabase: Running"
            print_info "  Studio: http://127.0.0.1:54323"
            print_info "  API: http://127.0.0.1:54321"
        else
            print_error "Supabase: Stopped"
        fi
        cd "$ROOT_DIR"
    else
        print_warning "Supabase: CLI not installed"
    fi
    
    echo ""
    
    # API
    if [ -f "$PID_DIR/api.pid" ] && kill -0 $(cat "$PID_DIR/api.pid") 2>/dev/null; then
        print_status "NestJS API: Running (PID: $(cat $PID_DIR/api.pid))"
        print_info "  URL: http://localhost:3001"
    else
        print_error "NestJS API: Stopped"
    fi
    
    echo ""
    
    # Satellite
    if [ -f "$PID_DIR/satellite.pid" ] && kill -0 $(cat "$PID_DIR/satellite.pid") 2>/dev/null; then
        print_status "Satellite Service: Running (PID: $(cat $PID_DIR/satellite.pid))"
        print_info "  URL: http://localhost:8001"
    else
        print_error "Satellite Service: Stopped"
    fi
    
    echo ""
    
    # Frontend
    if [ -f "$PID_DIR/frontend.pid" ] && kill -0 $(cat "$PID_DIR/frontend.pid") 2>/dev/null; then
        print_status "Frontend: Running (PID: $(cat $PID_DIR/frontend.pid))"
        print_info "  URL: http://localhost:5173"
    else
        print_error "Frontend: Stopped"
    fi
    
    echo ""
}

show_logs() {
    print_header
    print_info "Tailing all logs (Ctrl+C to stop)..."
    echo ""
    
    tail -f "$LOG_DIR"/*.log 2>/dev/null || print_warning "No log files found"
}

start_all() {
    print_header
    
    check_dependencies
    setup_env_files
    
    echo ""
    print_info "Starting all services..."
    echo ""
    
    start_supabase
    start_api
    start_satellite
    start_frontend
    
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  All services started!                  ${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    print_info "Services:"
    echo "  - Frontend:  http://localhost:5173"
    echo "  - API:       http://localhost:3001"
    echo "  - Satellite: http://localhost:8001"
    echo "  - Supabase:  http://127.0.0.1:54323 (Studio)"
    echo ""
    print_info "Commands:"
    echo "  - ./scripts/dev-local.sh status  # Check status"
    echo "  - ./scripts/dev-local.sh logs    # View logs"
    echo "  - ./scripts/dev-local.sh stop    # Stop all"
    echo ""
}

# Main command handler
case "${1:-start}" in
    start)
        start_all
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        stop_services
        sleep 2
        start_all
        ;;
    reset)
        print_header
        check_dependencies
        setup_env_files

        if ! command -v supabase &> /dev/null; then
            print_error "Supabase CLI not found. Run: brew install supabase/tap/supabase"
            exit 1
        fi

        cd "$ROOT_DIR/project/supabase"
        print_info "Resetting local database..."
        supabase db reset

        print_status "Database reset complete"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|logs|restart|reset}"
        exit 1
        ;;
esac
