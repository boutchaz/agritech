#!/bin/bash

# Script to create a trial subscription for an organization
# This will grant access to the platform for 14 days

API_URL="https://agritech-api.thebzlab.online"

echo "🔑 Creating trial subscription for CodeLovers organization..."
echo ""
echo "Please provide the following information:"
echo ""

# Get user credentials
read -p "Enter your email: " USER_EMAIL
read -sp "Enter your password: " USER_PASSWORD
echo ""

# Login to get access token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${USER_EMAIL}\",
    \"password\": \"${USER_PASSWORD}\"
  }")

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed. Please check your credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"

# Get organization ID
read -p "Enter organization ID (or press Enter to use default): " ORG_ID

if [ -z "$ORG_ID" ]; then
  # Try to get the organization ID from user's profile
  echo "🔍 Fetching your organization..."
  # This would require additional API call
  echo "⚠️  Please provide the organization ID"
  read -p "Organization ID: " ORG_ID
fi

# Ask for plan type
echo ""
echo "Select plan type:"
echo "1. STARTER (Trial)"
echo "2. PROFESSIONAL (Trial)"
echo "3. ENTERPRISE (Trial)"
read -p "Enter choice (1-3, default is 2): " PLAN_CHOICE

case $PLAN_CHOICE in
  1) PLAN_TYPE="STARTER" ;;
  3) PLAN_TYPE="ENTERPRISE" ;;
  *) PLAN_TYPE="PROFESSIONAL" ;;
esac

echo ""
echo "📝 Creating trial subscription..."
echo "   Organization ID: $ORG_ID"
echo "   Plan Type: $PLAN_TYPE"
echo ""

# Create trial subscription
SUBSCRIPTION_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/subscriptions/trial" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"organization_id\": \"${ORG_ID}\",
    \"plan_type\": \"${PLAN_TYPE}\"
  }")

# Check if successful
if echo "$SUBSCRIPTION_RESPONSE" | grep -q "success"; then
  echo "✅ Trial subscription created successfully!"
  echo ""
  echo "Subscription Details:"
  echo "$SUBSCRIPTION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SUBSCRIPTION_RESPONSE"
  echo ""
  echo "🎉 You now have access to the platform for 14 days!"
  echo "   Please refresh your browser to see the changes."
else
  echo "❌ Failed to create trial subscription"
  echo "Response: $SUBSCRIPTION_RESPONSE"
  exit 1
fi
