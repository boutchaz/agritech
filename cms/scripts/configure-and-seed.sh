#!/bin/bash

# AgriTech Blog Configuration and Seeding Script
# This script helps configure Strapi permissions and seed blog content

set -e

STRAPI_URL="https://cms.thebzlab.online"
STRAPI_API_URL="${STRAPI_URL}/api"
STRAPI_TOKEN="06403fae5125d4546bfa15b4f818331784fc06120c205cb127e5fa2c9f3fbeb85b09a94f37c6e76a2fd6d43bb9eb4a26b865747c20a0705978845ed0da29fab0e43d5aab8aead7c453e03d095e7545f51a9c9df9f2eb4f5618fdcbc300cc63819c59264b638a719145432486d69e65f243776269dad3fb34d7548e455ccfabe8"

echo "🌾 AgriTech Blog Setup Script"
echo "=============================="
echo ""

# Step 1: Test Strapi connectivity
echo "📡 Testing Strapi connectivity..."
if curl -s "${STRAPI_URL}/admin" > /dev/null; then
    echo "✅ Strapi is accessible at ${STRAPI_URL}"
else
    echo "❌ Cannot reach Strapi at ${STRAPI_URL}"
    exit 1
fi

# Step 2: Test API with token
echo ""
echo "🔑 Testing API token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${STRAPI_TOKEN}" "${STRAPI_API_URL}/blogs")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API token is valid and permissions are configured"
    echo ""
    echo "📊 Current blogs in system:"
    echo "$BODY" | jq '.data | length' 2>/dev/null || echo "0"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "⚠️  API token is valid but permissions are not configured"
    echo ""
    echo "📋 MANUAL SETUP REQUIRED:"
    echo "   1. Go to ${STRAPI_URL}/admin"
    echo "   2. Navigate to Settings > Users & Permissions > Roles > Public"
    echo "   3. Enable these permissions:"
    echo "      - Blog: find, findOne"
    echo "      - Blog-category: find, findOne"
    echo "   4. Save and run this script again"
    echo ""
    read -p "Press Enter once you've configured permissions, or Ctrl+C to exit..."
else
    echo "❌ Unexpected response: HTTP $HTTP_CODE"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi

# Step 3: Check if content already exists
echo ""
echo "🔍 Checking existing content..."
BLOG_COUNT=$(curl -s -H "Authorization: Bearer ${STRAPI_TOKEN}" "${STRAPI_API_URL}/blogs" | jq '.data | length' 2>/dev/null || echo "0")
CATEGORY_COUNT=$(curl -s -H "Authorization: Bearer ${STRAPI_TOKEN}" "${STRAPI_API_URL}/blog-categories" | jq '.data | length' 2>/dev/null || echo "0")

echo "   Existing blogs: $BLOG_COUNT"
echo "   Existing categories: $CATEGORY_COUNT"

if [ "$BLOG_COUNT" != "0" ] || [ "$CATEGORY_COUNT" != "0" ]; then
    echo ""
    read -p "⚠️  Content already exists. Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Step 4: Run Node.js seeding script
echo ""
echo "🌱 Running seeding script..."
if [ -f "cms/scripts/seed-blogs.js" ]; then
    node cms/scripts/seed-blogs.js
else
    echo "❌ Seeding script not found at cms/scripts/seed-blogs.js"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔗 Next steps:"
echo "   - View blogs at: https://agritech-dashboard.thebzlab.online/blog"
echo "   - Manage content at: ${STRAPI_URL}/admin"
echo "   - API endpoint: ${STRAPI_API_URL}/blogs"
