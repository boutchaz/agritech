#!/bin/bash
# Bump version and create a git tag for store release
#
# Usage:
#   ./scripts/bump-version.sh patch    # 1.0.0 -> 1.0.1
#   ./scripts/bump-version.sh minor    # 1.0.0 -> 1.1.0
#   ./scripts/bump-version.sh major    # 1.0.0 -> 2.0.0

set -euo pipefail

BUMP_TYPE="${1:-patch}"
APP_JSON="$(dirname "$0")/../app.json"

if [[ ! -f "$APP_JSON" ]]; then
  echo "❌ app.json not found at $APP_JSON"
  exit 1
fi

# Read current version
CURRENT_VERSION=$(node -e "console.log(require('$APP_JSON').expo.version)")
echo "📱 Current version: $CURRENT_VERSION"

# Split into parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "❌ Invalid bump type: $BUMP_TYPE (use major, minor, or patch)"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "🚀 New version: $NEW_VERSION"

# Update app.json
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$APP_JSON', 'utf8'));
config.expo.version = '$NEW_VERSION';
fs.writeFileSync('$APP_JSON', JSON.stringify(config, null, 2) + '\n');
"

echo "✅ Updated app.json"

# Git commit and tag
cd "$(dirname "$0")/.."
git add app.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "✅ Created tag v$NEW_VERSION"
echo ""
echo "Next steps:"
echo "  git push origin develop --tags"
echo ""
echo "This will trigger the EAS Build workflow automatically."
