---
description: Create a pull request with auto-generated description from commits and changes
---

# Create Pull Request

Create a well-structured PR to the develop branch with auto-generated description.

## Input: $ARGUMENTS

Optional: PR title override, target branch override, or additional context.

## Process

### 1. Analyze the branch
```bash
# Current branch
git branch --show-current

# All commits since diverging from develop
git log develop..HEAD --oneline

# Full diff summary
git diff --stat develop...HEAD

# Full diff for analysis
git diff develop...HEAD
```

### 2. Categorize changes

Scan the diff and categorize:
- **Database**: `project/supabase/` changes
- **Backend API**: `agritech-api/` changes
- **Frontend**: `project/src/` changes
- **Python Service**: `backend-service/` changes
- **Tests**: `**/test*/**`, `**/*.spec.*`, `**/*.test.*`
- **Config**: `package.json`, `tsconfig.json`, CI files
- **Translations**: `src/locales/` changes

### 3. Generate PR title
- Format: `type(scope): short description`
- Types: feat, fix, refactor, docs, test, chore
- Keep under 70 characters
- Use the user's override if provided

### 4. Generate PR body

Structure:
```markdown
## Summary
- Bullet points describing what changed and why

## Changes
### Database
- Table/column changes, RLS policies

### Backend
- New endpoints, service changes

### Frontend
- New pages, components, hooks

## Areas affected
- List modules/features impacted

## Testing
- [ ] Type check passes (`tsc --noEmit`)
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] Tested with different roles
- [ ] Translations added for all languages

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 5. Pre-flight checks
Before creating the PR, run:
```bash
# Ensure we're up to date
git fetch origin develop

# Check for conflicts
git merge-base --is-ancestor origin/develop HEAD && echo "No rebase needed" || echo "Consider rebasing on develop"

# Push branch
git push -u origin $(git branch --show-current)
```

### 6. Create the PR
```bash
gh pr create \
  --base develop \
  --title "PR_TITLE" \
  --body "PR_BODY"
```

### 7. Output
Return the PR URL to the user.
