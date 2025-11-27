#!/bin/bash

# AgriTech Local Development - Helper Script
# Manages the local Docker Compose environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment file
ENV_FILE=".env.local"
COMPOSE_FILE="docker-compose.local.yml"

# Function to print colored messages
print_header() {
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}==================================${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if hosts are configured
check_hosts() {
    print_info "Checking /etc/hosts configuration..."

    if ! grep -q "agritech.local.thebzlab.online" /etc/hosts; then
        print_warning "/etc/hosts not configured!"
        echo ""
        echo "Run the following command to setup local hosts:"
        echo "  ./setup-local-hosts.sh"
        echo ""
        read -p "Do you want to run it now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./setup-local-hosts.sh
        else
            exit 1
        fi
    else
        print_success "Hosts file is configured"
    fi
}

# Function to check if .env.local exists
check_env() {
    print_info "Checking environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found!"
        echo ""
        echo "Please create $ENV_FILE from the template:"
        echo "  cp .env.local.example .env.local"
        echo ""
        echo "Then update the variables with your configuration."
        exit 1
    fi

    # Check for default/placeholder values
    if grep -q "your-super-secret" "$ENV_FILE"; then
        print_warning "Found placeholder values in $ENV_FILE"
        print_warning "Please update with real values before starting"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Environment file configured"
    fi
}

# Function to start services
start_services() {
    print_header "Starting AgriTech Local Development"

    check_hosts
    check_env

    echo ""
    print_info "Starting Docker Compose services..."

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    echo ""
    print_success "Services started successfully!"

    echo ""
    print_info "Waiting for services to be healthy..."
    sleep 5

    show_status
}

# Function to stop services
stop_services() {
    print_header "Stopping AgriTech Local Development"

    print_info "Stopping Docker Compose services..."
    docker compose -f "$COMPOSE_FILE" down

    print_success "Services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_header "Restarting AgriTech Local Development"

    stop_services
    echo ""
    start_services
}

# Function to show logs
show_logs() {
    SERVICE=$1

    if [ -z "$SERVICE" ]; then
        print_info "Showing logs for all services..."
        docker compose -f "$COMPOSE_FILE" logs -f
    else
        print_info "Showing logs for $SERVICE..."
        docker compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
    fi
}

# Function to show status
show_status() {
    print_header "AgriTech Services Status"

    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    print_header "Available Services"
    echo ""
    echo -e "${GREEN}Traefik Dashboard:${NC}     http://traefik.local.thebzlab.online:8080"
    echo -e "${GREEN}Supabase Studio:${NC}       http://supabase.local.thebzlab.online"
    echo -e "${GREEN}Supabase API:${NC}          http://agritech.local.thebzlab.online"
    echo -e "${GREEN}AgriTech Dashboard:${NC}    http://agritech-dashboard.local.thebzlab.online"
    echo -e "${GREEN}AgriTech API:${NC}          http://agritech-api.local.thebzlab.online"
    echo -e "${GREEN}Strapi CMS:${NC}            http://cms.local.thebzlab.online"
    echo -e "${GREEN}Satellite API:${NC}         http://satellite-api.local.thebzlab.online"
    echo -e "${GREEN}MinIO Console:${NC}         http://minio.local.thebzlab.online"
    echo -e "${GREEN}S3 API:${NC}                http://s3.local.thebzlab.online"
    echo -e "${GREEN}Adminer:${NC}               http://adminer.local.thebzlab.online"
    echo ""
}

# Function to reset everything
reset_services() {
    print_header "Resetting AgriTech Local Development"

    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping and removing services..."
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

        print_success "Reset complete!"
    else
        print_info "Reset cancelled"
    fi
}

# Function to rebuild services
rebuild_services() {
    print_header "Rebuilding AgriTech Services"

    print_info "Rebuilding all services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

    print_success "Rebuild complete!"

    echo ""
    read -p "Start services now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
    fi
}

# Function to exec into a service
exec_service() {
    SERVICE=$1
    SHELL=${2:-bash}

    if [ -z "$SERVICE" ]; then
        print_error "Please specify a service name"
        exit 1
    fi

    print_info "Connecting to $SERVICE..."
    docker compose -f "$COMPOSE_FILE" exec "$SERVICE" "$SHELL"
}

# Function to show help
show_help() {
    cat << EOF
AgriTech Local Development Helper

Usage: ./local-dev.sh [command] [options]

Commands:
  start               Start all services
  stop                Stop all services
  restart             Restart all services
  status              Show service status and URLs
  logs [service]      Show logs (all or specific service)
  reset               Reset everything (removes volumes)
  rebuild             Rebuild all services
  exec <service>      Execute shell in a service
  help                Show this help message

Examples:
  ./local-dev.sh start
  ./local-dev.sh logs frontend
  ./local-dev.sh exec frontend
  ./local-dev.sh status

Services:
  traefik              Reverse proxy
  supabase-db          Supabase PostgreSQL
  supabase-kong        Supabase API Gateway
  supabase-studio      Supabase Studio UI
  frontend             AgriTech Dashboard (React)
  backend-service      Satellite API (Python)
  agritech-api         NestJS API
  strapi               CMS
  minio                S3-compatible storage
  adminer              Database management

EOF
}

# Main script
COMMAND=${1:-help}

case "$COMMAND" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    reset)
        reset_services
        ;;
    rebuild)
        rebuild_services
        ;;
    exec)
        exec_service "$2" "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
