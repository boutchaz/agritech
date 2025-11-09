#!/bin/bash

# Script to find potential RTL issues in the codebase
# This helps identify places where RTL-aware utilities should be used

echo "🔍 Scanning for potential RTL issues..."
echo ""

# Find space-x usage
echo "📊 Components using space-x (should use gap instead):"
grep -rn "space-x-[0-9]" src/components/*.tsx src/routes/*.tsx 2>/dev/null | grep -v "space-x-reverse" | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

# Find ml- usage (margin-left)
echo "📊 Components using ml- (should use ms- instead):"
grep -rn 'className.*ml-[0-9]' src/components/*.tsx src/routes/*.tsx 2>/dev/null | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

# Find mr- usage (margin-right)
echo "📊 Components using mr- (should use me- instead):"
grep -rn 'className.*mr-[0-9]' src/components/*.tsx src/routes/*.tsx 2>/dev/null | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

# Find pl- usage (padding-left)
echo "📊 Components using pl- (should use ps- instead):"
grep -rn 'className.*pl-[0-9]' src/components/*.tsx src/routes/*.tsx 2>/dev/null | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

# Find pr- usage (padding-right)
echo "📊 Components using pr- (should use pe- instead):"
grep -rn 'className.*pr-[0-9]' src/components/*.tsx src/routes/*.tsx 2>/dev/null | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

# Find text-left usage
echo "📊 Components using text-left (should use text-start instead):"
grep -rn 'text-left' src/components/*.tsx src/routes/*.tsx 2>/dev/null | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

# Find text-right usage
echo "📊 Components using text-right (should use text-end instead):"
grep -rn 'text-right' src/components/*.tsx src/routes/*.tsx 2>/dev/null | wc -l | xargs -I {} echo "  Found {} instances"
echo ""

echo "✅ Scan complete!"
echo ""
echo "💡 Tips:"
echo "  • Replace 'space-x-N' with 'gap-N' for flex containers"
echo "  • Replace 'ml-N' with 'ms-N' (margin-inline-start)"
echo "  • Replace 'mr-N' with 'me-N' (margin-inline-end)"
echo "  • Replace 'pl-N' with 'ps-N' (padding-inline-start)"
echo "  • Replace 'pr-N' with 'pe-N' (padding-inline-end)"
echo "  • Replace 'text-left' with 'text-start'"
echo "  • Replace 'text-right' with 'text-end'"
echo ""
echo "📖 See RTL-GUIDE.md for more details"
