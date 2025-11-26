#!/bin/bash

# Strapi Setup Script
# This script generates secure secrets and sets up the Strapi directory structure

set -e

echo "🚀 Setting up Strapi CMS for Agritech..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-${1:-32}
}

# Create strapi directories
echo -e "${BLUE}📁 Creating Strapi directories...${NC}"
mkdir -p strapi/app
mkdir -p strapi/public/uploads

# Generate secrets
echo -e "${BLUE}🔐 Generating secure secrets...${NC}"
STRAPI_DB_PASSWORD=$(generate_secret 24)
STRAPI_JWT_SECRET=$(generate_secret 32)
STRAPI_ADMIN_JWT_SECRET=$(generate_secret 32)
STRAPI_API_TOKEN_SALT=$(generate_secret 32)

# Generate 4 APP_KEYS
APP_KEY1=$(generate_secret 32)
APP_KEY2=$(generate_secret 32)
APP_KEY3=$(generate_secret 32)
APP_KEY4=$(generate_secret 32)
STRAPI_APP_KEYS="${APP_KEY1},${APP_KEY2},${APP_KEY3},${APP_KEY4}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating .env file from .env.example...${NC}"
    cp .env.example .env
fi

# Add Strapi configuration to .env if not already present
if ! grep -q "STRAPI_DB_PASSWORD" .env; then
    echo -e "${BLUE}✏️  Adding Strapi configuration to .env...${NC}"
    cat >> .env << EOF

# Strapi CMS Configuration (Generated on $(date))
STRAPI_DB_NAME=agritech_strapi
STRAPI_DB_USER=strapi
STRAPI_DB_PASSWORD=${STRAPI_DB_PASSWORD}
STRAPI_JWT_SECRET=${STRAPI_JWT_SECRET}
STRAPI_ADMIN_JWT_SECRET=${STRAPI_ADMIN_JWT_SECRET}
STRAPI_APP_KEYS=${STRAPI_APP_KEYS}
STRAPI_API_TOKEN_SALT=${STRAPI_API_TOKEN_SALT}
STRAPI_URL=http://localhost:1337
VITE_STRAPI_URL=http://localhost:1337
VITE_STRAPI_API_URL=http://localhost:1337/api
EOF
    echo -e "${GREEN}✅ Strapi configuration added to .env${NC}"
else
    echo -e "${GREEN}✅ Strapi configuration already exists in .env${NC}"
fi

# Create .gitignore for strapi directory
echo -e "${BLUE}📝 Creating .gitignore for Strapi...${NC}"
cat > strapi/.gitignore << 'EOF'
############################
# OS X
############################

.DS_Store
.AppleDouble
.LSOverride
Icon
.Spotlight-V100
.Trashes
._*


############################
# Linux
############################

*~


############################
# Windows
############################

Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/
*.cab
*.msi
*.msm
*.msp


############################
# Packages
############################

*.7z
*.csv
*.dat
*.dmg
*.gz
*.iso
*.jar
*.rar
*.tar
*.zip
*.com
*.class
*.dll
*.exe
*.o
*.seed
*.so
*.swo
*.swp
*.swn
*.swm
*.out
*.pid


############################
# Logs and databases
############################

.tmp
*.log
*.sql
*.sqlite
*.sqlite3


############################
# Misc.
############################

*#
ssl
.idea
nbproject
public/uploads/*
!public/uploads/.gitkeep

############################
# Node.js
############################

lib-cov
lcov.info
pids
logs
results
node_modules
.node_history

############################
# Tests
############################

coverage

############################
# Strapi
############################

.env
license.txt
exports
*.cache
dist
build
.strapi-updater.json
.strapi
app/
EOF

# Create README for strapi directory
cat > strapi/README.md << 'EOF'
# Strapi CMS for Agritech

This directory contains the Strapi CMS configuration and data.

## Directory Structure

- `app/` - Strapi application files (auto-generated on first run)
- `public/uploads/` - Media uploads directory

## First Time Setup

1. Start the services:
   ```bash
   docker-compose up -d strapi strapi-db
   ```

2. Wait for Strapi to initialize (check logs):
   ```bash
   docker-compose logs -f strapi
   ```

3. Access the admin panel:
   - URL: http://localhost:1337/admin
   - Create your first admin user

## Useful Commands

- View logs: `docker-compose logs -f strapi`
- Restart Strapi: `docker-compose restart strapi`
- Access Strapi shell: `docker-compose exec strapi sh`

## Content Types

Content types will be created through the Strapi admin panel or via code.

See the main implementation plan for details on content type definitions.
EOF

echo ""
echo -e "${GREEN}✅ Strapi setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Start Strapi services:"
echo "   docker-compose up -d strapi strapi-db"
echo ""
echo "2. Wait for initialization (30-60 seconds):"
echo "   docker-compose logs -f strapi"
echo ""
echo "3. Access admin panel:"
echo "   http://localhost:1337/admin"
echo ""
echo "4. Create your first admin user"
echo ""
echo -e "${GREEN}🎉 Happy content managing!${NC}"
