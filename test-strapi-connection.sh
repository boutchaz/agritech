#!/bin/bash

echo "🔍 Testing Strapi CMS Connection for NestJS API"
echo "================================================"
echo ""

echo "1️⃣ Testing Public Blog Access (what NestJS uses)..."
RESPONSE=$(curl -s "https://cms.thebzlab.online/api/blogs")
STATUS=$(echo "$RESPONSE" | jq -r '.error.status // "success"')

if [ "$STATUS" = "success" ]; then
    COUNT=$(echo "$RESPONSE" | jq '.data | length')
    echo "   ✅ SUCCESS! Found $COUNT blog posts"
    echo "   NestJS API will be able to fetch blogs"
else
    echo "   ❌ FAILED with status: $STATUS"
    echo "   NestJS API will get errors when trying to fetch blogs"
    echo ""
    echo "   👉 ACTION REQUIRED:"
    echo "      1. Go to https://cms.thebzlab.online/admin"
    echo "      2. Settings > Users & Permissions > Roles > Public"
    echo "      3. Enable: Blog (find, findOne) and Blog-Category (find, findOne)"
    echo "      4. Click Save"
    echo "      5. Run this script again"
fi

echo ""
echo "2️⃣ Testing Blog Categories..."
RESPONSE=$(curl -s "https://cms.thebzlab.online/api/blog-categories")
STATUS=$(echo "$RESPONSE" | jq -r '.error.status // "success"')

if [ "$STATUS" = "success" ]; then
    COUNT=$(echo "$RESPONSE" | jq '.data | length')
    echo "   ✅ SUCCESS! Found $COUNT categories"
else
    echo "   ❌ FAILED with status: $STATUS"
fi

echo ""
echo "3️⃣ Testing Featured Blogs Query..."
RESPONSE=$(curl -s "https://cms.thebzlab.online/api/blogs?filters[is_featured][\$eq]=true&populate=*")
STATUS=$(echo "$RESPONSE" | jq -r '.error.status // "success"')

if [ "$STATUS" = "success" ]; then
    COUNT=$(echo "$RESPONSE" | jq '.data | length')
    echo "   ✅ SUCCESS! Found $COUNT featured posts"
    echo "   These will appear on the landing page"
else
    echo "   ❌ FAILED with status: $STATUS"
fi

echo ""
echo "================================================"
if [ "$STATUS" = "success" ]; then
    echo "✅ All tests passed! NestJS API is ready to serve blogs"
    echo ""
    echo "Next steps:"
    echo "  - Visit: https://agritech-dashboard.thebzlab.online/blog"
    echo "  - The blog page should load without errors"
else
    echo "⚠️  Configuration needed - see ACTION REQUIRED above"
fi
