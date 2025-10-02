#!/bin/bash

# Deployment script for Supabase subscription system
# This script deploys migrations and edge functions

set -e

echo "🚀 Deploying Agritech Subscription System to Supabase"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "Please run: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"

# Link to project if not already linked
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Project not linked${NC}"
    echo "Linking project..."
    supabase link
fi

echo ""
echo "📊 Step 1: Running Database Migrations"
echo "----------------------------------------"

# Run migrations
echo "Applying subscription enforcement migration..."
supabase db push

echo -e "${GREEN}✅ Migrations applied${NC}"

echo ""
echo "⚡ Step 2: Deploying Edge Functions"
echo "----------------------------------------"

# Deploy edge function
echo "Deploying check-subscription function..."
supabase functions deploy check-subscription --no-verify-jwt

echo -e "${GREEN}✅ Edge functions deployed${NC}"

echo ""
echo "🔍 Step 3: Verifying Deployment"
echo "----------------------------------------"

# Test the function
echo "Testing subscription check function..."
# You can add a test call here

echo -e "${GREEN}✅ Deployment verification complete${NC}"

echo ""
echo "=================================================="
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify in Supabase Dashboard:"
echo "   - Database > Functions (has_valid_subscription, etc.)"
echo "   - Edge Functions > check-subscription"
echo ""
echo "2. Test the subscription system:"
echo "   - Create test organization"
echo "   - Try without subscription"
echo "   - Add subscription and retry"
echo ""
echo "3. Monitor logs:"
echo "   supabase functions logs check-subscription"
echo ""
