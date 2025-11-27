#!/bin/bash

# AgriTech - Generate Secrets for Local Development
# This script generates all required secrets for .env.local

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}AgriTech Secret Generator${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local already exists!${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    # Backup existing file
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}Backup created${NC}"
fi

echo -e "${BLUE}Generating secrets...${NC}"
echo ""

# Generate secrets
SUPABASE_DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
LOGFLARE_API_KEY=$(openssl rand -base64 32)
SECRET_KEY_BASE=$(openssl rand -base64 64)
STRAPI_DB_PASSWORD=$(openssl rand -base64 24)
STRAPI_JWT_SECRET=$(openssl rand -base64 24)
STRAPI_ADMIN_JWT_SECRET=$(openssl rand -base64 24)
STRAPI_API_TOKEN_SALT=$(openssl rand -base64 16)
STRAPI_TRANSFER_TOKEN_SALT=$(openssl rand -base64 16)

# Generate 4 app keys
STRAPI_APP_KEY1=$(openssl rand -base64 16)
STRAPI_APP_KEY2=$(openssl rand -base64 16)
STRAPI_APP_KEY3=$(openssl rand -base64 16)
STRAPI_APP_KEY4=$(openssl rand -base64 16)
STRAPI_APP_KEYS="$STRAPI_APP_KEY1,$STRAPI_APP_KEY2,$STRAPI_APP_KEY3,$STRAPI_APP_KEY4"

MINIO_PASSWORD=$(openssl rand -base64 16)

# Create .env.local
cat > .env.local << EOF
# ===================================
# AgriTech Local Development Environment
# Generated on $(date)
# ===================================

# ===================================
# SUPABASE CONFIGURATION
# ===================================
SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Supabase Keys (default demo keys - replace with production keys if needed)
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Analytics
LOGFLARE_API_KEY=$LOGFLARE_API_KEY

# Secret Key Base
SECRET_KEY_BASE=$SECRET_KEY_BASE

# ===================================
# STRAPI CMS CONFIGURATION
# ===================================
STRAPI_DB_NAME=agritech_strapi
STRAPI_DB_USER=strapi
STRAPI_DB_PASSWORD=$STRAPI_DB_PASSWORD
STRAPI_JWT_SECRET=$STRAPI_JWT_SECRET
STRAPI_ADMIN_JWT_SECRET=$STRAPI_ADMIN_JWT_SECRET
STRAPI_APP_KEYS=$STRAPI_APP_KEYS
STRAPI_API_TOKEN_SALT=$STRAPI_API_TOKEN_SALT
STRAPI_TRANSFER_TOKEN_SALT=$STRAPI_TRANSFER_TOKEN_SALT

# ===================================
# GOOGLE EARTH ENGINE CONFIGURATION
# ===================================
# TODO: Update these with your actual GCP credentials
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY={"type": "service_account", "project_id": "...", "private_key": "..."}
GEE_PROJECT_ID=agrisat-463314
GOOGLE_API_KEY=your-google-api-key

# ===================================
# NESTJS API CONFIGURATION
# ===================================
DATABASE_URL=postgresql://postgres:$SUPABASE_DB_PASSWORD@supabase-db:5432/postgres

# ===================================
# MINIO CONFIGURATION
# ===================================
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
EOF

echo -e "${GREEN}✓ Secrets generated successfully!${NC}"
echo ""
echo -e "${GREEN}Created: .env.local${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Update the following values in .env.local:${NC}"
echo ""
echo "  1. GEE_SERVICE_ACCOUNT"
echo "  2. GEE_PRIVATE_KEY"
echo "  3. GEE_PROJECT_ID"
echo "  4. GOOGLE_API_KEY"
echo ""
echo -e "${BLUE}You can get these from your Google Cloud Platform project.${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Edit .env.local and update the Google Earth Engine credentials"
echo "  2. Run: ./setup-local-hosts.sh"
echo "  3. Run: ./local-dev.sh start"
echo ""
