#!/bin/bash

# Script to apply security fixes to Edge Functions
# This script helps identify which functions need security fixes

set -e

FUNCTIONS_DIR="project/supabase/functions"
VULNERABLE_FUNCTIONS=(
  "crop-planning"
  "yield-prediction"
  "farm-analytics"
  "task-assignment"
  "recommendations"
  "sensor-data"
  "generate-parcel-report"
  "generate-index-image"
)

echo "🔒 Edge Functions Security Audit"
echo "=================================="
echo ""

echo "✅ Already Fixed:"
echo "  - irrigation-scheduling"
echo "  - edge-functions-api.ts (client)"
echo "  - satellite-api.ts (client)"
echo ""

echo "⚠️  Functions that need security fixes:"
for func in "${VULNERABLE_FUNCTIONS[@]}"; do
  if [ -f "$FUNCTIONS_DIR/$func/index.ts" ]; then
    echo "  - $func"

    # Check if it uses SUPABASE_SERVICE_ROLE_KEY
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$FUNCTIONS_DIR/$func/index.ts" 2>/dev/null; then
      echo "    ❌ Still uses service role key without auth"
    fi

    # Check if it has authenticateRequest
    if grep -q "authenticateRequest" "$FUNCTIONS_DIR/$func/index.ts" 2>/dev/null; then
      echo "    ✅ Uses authenticateRequest"
    else
      echo "    ⚠️  Missing authenticateRequest"
    fi
  else
    echo "  - $func (file not found)"
  fi
done

echo ""
echo "📝 Next Steps:"
echo "  1. Review EDGE_FUNCTIONS_SECURITY_FIX.md for implementation pattern"
echo "  2. Apply fixes to each function listed above"
echo "  3. Test authentication and authorization"
echo "  4. Update CORS headers for production"
echo ""

echo "🔧 To fix a function, follow this pattern:"
echo ""
echo "  1. Update imports:"
echo "     import { authenticateRequest, validateParcelAccess } from '../_shared/auth.ts';"
echo ""
echo "  2. Add authentication:"
echo "     const { user, supabase } = await authenticateRequest(req);"
echo ""
echo "  3. Validate access:"
echo "     await validateParcelAccess(supabase, user.id, parcel_id);"
echo ""
echo "  4. Remove service role client creation"
echo ""

# Count total vulnerable functions
TOTAL=${#VULNERABLE_FUNCTIONS[@]}
echo "📊 Summary: $TOTAL functions need security fixes"
echo ""
