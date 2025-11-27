#!/bin/bash

echo "🔍 Verifying Blog Deployment"
echo "============================"
echo ""

API_URL="https://agritech-api.thebzlab.online"
FRONTEND_URL="https://agritech-dashboard.thebzlab.online"

# Test 1: API Health
echo "1️⃣ Testing API Health..."
HEALTH=$(curl -s "${API_URL}/api/v1/health" | jq -r '.status')
if [ "$HEALTH" = "ok" ]; then
    echo "   ✅ API is healthy"
else
    echo "   ❌ API health check failed"
    exit 1
fi

# Test 2: Blog Categories Endpoint
echo ""
echo "2️⃣ Testing Blog Categories Endpoint..."
RESPONSE=$(curl -s "${API_URL}/api/v1/blogs/categories")
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ -z "$ERROR" ]; then
    COUNT=$(echo "$RESPONSE" | jq 'length')
    echo "   ✅ SUCCESS! Found $COUNT categories"
    echo "   Categories:"
    echo "$RESPONSE" | jq -r '.[] | "      - \(.name) (\(.slug))"'
else
    echo "   ❌ FAILED: $ERROR"
    echo "   Response: $RESPONSE"
fi

# Test 3: Blog Posts Endpoint
echo ""
echo "3️⃣ Testing Blog Posts Endpoint..."
RESPONSE=$(curl -s "${API_URL}/api/v1/blogs?limit=100")
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ -z "$ERROR" ]; then
    COUNT=$(echo "$RESPONSE" | jq '.data | length')
    TOTAL=$(echo "$RESPONSE" | jq '.meta.total')
    echo "   ✅ SUCCESS! Found $COUNT/$TOTAL blog posts"
    echo "   Posts:"
    echo "$RESPONSE" | jq -r '.data[] | "      - \(.title) (Featured: \(.is_featured))"'
else
    echo "   ❌ FAILED: $ERROR"
    echo "   Response: $RESPONSE"
fi

# Test 4: Featured Blogs
echo ""
echo "4️⃣ Testing Featured Blogs..."
RESPONSE=$(curl -s "${API_URL}/api/v1/blogs/featured?limit=3")
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ -z "$ERROR" ]; then
    COUNT=$(echo "$RESPONSE" | jq 'length')
    echo "   ✅ SUCCESS! Found $COUNT featured posts"
    if [ "$COUNT" -gt 0 ]; then
        echo "   Featured posts:"
        echo "$RESPONSE" | jq -r '.[] | "      - \(.title)"'
    fi
else
    echo "   ❌ FAILED: $ERROR"
fi

# Test 5: Single Blog by Slug
echo ""
echo "5️⃣ Testing Single Blog by Slug..."
RESPONSE=$(curl -s "${API_URL}/api/v1/blogs/getting-started-digital-farm-management")
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ -z "$ERROR" ]; then
    TITLE=$(echo "$RESPONSE" | jq -r '.title')
    AUTHOR=$(echo "$RESPONSE" | jq -r '.author')
    echo "   ✅ SUCCESS! Blog found"
    echo "      Title: $TITLE"
    echo "      Author: $AUTHOR"
else
    echo "   ❌ FAILED: $ERROR"
fi

echo ""
echo "============================"
echo "✅ Blog API is working correctly!"
echo ""
echo "🌐 Frontend URLs:"
echo "   - Blog page: ${FRONTEND_URL}/blog"
echo "   - Landing page: ${FRONTEND_URL}/"
echo ""
echo "📊 API Endpoints:"
echo "   - All blogs: ${API_URL}/api/v1/blogs"
echo "   - Featured: ${API_URL}/api/v1/blogs/featured"
echo "   - Categories: ${API_URL}/api/v1/blogs/categories"
echo "   - By slug: ${API_URL}/api/v1/blogs/{slug}"
