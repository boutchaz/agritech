#!/bin/bash

# Master setup script for Agritech project
# Run this once to set up everything from scratch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${CYAN}"
cat << "EOF"
   ___            _ __           __
  / _ | ___ _____(_) /____ ____/ /
 / __ |/ _ `/ __/ / __/ -_) __/ _ \
/_/ |_|\_, /_/ /_/\__/\__/\__/_//_/
      /___/
EOF
echo -e "${NC}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Complete Project Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${MAGENTA}[1/6] Checking prerequisites...${NC}"
echo ""

MISSING_DEPS=0

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    MISSING_DEPS=1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: ${NODE_VERSION}${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    MISSING_DEPS=1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm installed: v${NPM_VERSION}${NC}"
fi

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI is not installed${NC}"
    echo -e "${YELLOW}  Install with: brew install supabase/tap/supabase${NC}"
    MISSING_DEPS=1
else
    SUPABASE_VERSION=$(supabase --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)
    echo -e "${GREEN}✓ Supabase CLI installed: v${SUPABASE_VERSION}${NC}"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker is not installed (required for local Supabase)${NC}"
    echo -e "${YELLOW}  Install from: https://www.docker.com/products/docker-desktop${NC}"
else
    echo -e "${GREEN}✓ Docker installed${NC}"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}Please install missing dependencies and run this script again.${NC}"
    exit 1
fi

echo ""

# Step 2: Install npm dependencies
echo -e "${MAGENTA}[2/6] Installing npm dependencies...${NC}"
echo ""

cd "$PROJECT_ROOT"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""

# Step 3: Setup environment files
echo -e "${MAGENTA}[3/6] Setting up environment files...${NC}"
echo ""

if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
        echo -e "${YELLOW}  Please update .env with your configuration${NC}"
    else
        echo -e "${YELLOW}⚠ No .env.example found. Skipping.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

echo ""

# Step 4: Initialize Supabase
echo -e "${MAGENTA}[4/6] Initializing Supabase...${NC}"
echo ""

read -p "Do you want to start local Supabase? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚀 Starting Supabase...${NC}"
    supabase start

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Supabase started successfully${NC}"
        echo ""
        echo -e "${CYAN}📋 Save these credentials:${NC}"
        supabase status
    else
        echo -e "${RED}✗ Failed to start Supabase${NC}"
    fi
else
    echo -e "${YELLOW}⏭  Skipping Supabase start${NC}"
fi

echo ""

# Step 5: Link to remote project
echo -e "${MAGENTA}[5/6] Link to remote Supabase project...${NC}"
echo ""

read -p "Do you want to link to a remote Supabase project? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your Supabase project ref (or press Enter to skip): " PROJECT_REF

    if [ -n "$PROJECT_REF" ]; then
        supabase link --project-ref "$PROJECT_REF"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Linked to remote project${NC}"
        else
            echo -e "${RED}✗ Failed to link to remote project${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⏭  Skipping remote link${NC}"
fi

echo ""

# Step 6: Apply migrations
echo -e "${MAGENTA}[6/6] Apply database migrations...${NC}"
echo ""

read -p "Apply migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$SCRIPT_DIR/db-migrate.sh" ]; then
        bash "$SCRIPT_DIR/db-migrate.sh"
    else
        echo -e "${YELLOW}Running supabase migration up...${NC}"
        supabase migration up
    fi
else
    echo -e "${YELLOW}⏭  Skipping migrations${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Update ${YELLOW}.env${NC} with your configuration"
echo -e "  2. Run ${YELLOW}npm run dev${NC} to start development server"
echo -e "  3. Visit ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  ${YELLOW}npm run dev${NC}              - Start dev server"
echo -e "  ${YELLOW}supabase status${NC}          - Check Supabase status"
echo -e "  ${YELLOW}supabase db reset${NC}        - Reset local database"
echo -e "  ${YELLOW}./scripts/db-migrate.sh${NC}  - Apply migrations"
echo -e "  ${YELLOW}./scripts/db-sync.sh${NC}     - Sync databases"
echo ""
