#!/bin/bash

# Fix remaining components that use DEFAULT_FARM_ID

cd /Users/boutchaz/Documents/CodeLovers/agritech/project/src/components

# Files to fix
files=("EmployeeManagement.tsx" "DayLaborerManagement.tsx" "UtilitiesManagement.tsx")

for file in "${files[@]}"; do
    echo "Fixing $file..."

    # Replace import statement
    sed -i '' 's/import { supabase, DEFAULT_FARM_ID } from/import { supabase } from/g' "$file"

    # Add useAuth import
    sed -i '' '/import { supabase } from/a\
import { useAuth } from '\''./MultiTenantAuthProvider'\'';
' "$file"

    # Replace DEFAULT_FARM_ID with currentOrganization?.id
    sed -i '' 's/DEFAULT_FARM_ID/currentOrganization?.id/g' "$file"

    # Add useAuth hook to component (this is a simple replacement, might need manual adjustment)
    sed -i '' 's/const \([A-Za-z]*Management\): React\.FC = () => {/const \1: React.FC = () => {\
  const { currentOrganization, currentFarm } = useAuth();/g' "$file"

    echo "Fixed $file"
done

echo "All components fixed! Please review and test."