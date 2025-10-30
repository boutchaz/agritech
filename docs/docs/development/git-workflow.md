# Git Workflow

This document describes the Git workflow and branching strategy used in the AgriTech Platform project.

## Table of Contents

- [Branch Strategy](#branch-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Workflow](#pull-request-workflow)
- [Code Review Process](#code-review-process)
- [Release Process](#release-process)
- [Git Best Practices](#git-best-practices)

## Branch Strategy

We use a simplified Git Flow strategy with the following main branches:

### Main Branches

**`main`** - Production-ready code
- Always stable and deployable
- Protected branch (requires PR and approvals)
- Tagged with version numbers for releases
- Automatically deploys to production

**`develop`** (optional) - Integration branch
- Latest development changes
- Feature branches merge here first
- Periodically merged to `main` for releases
- Can be omitted for smaller teams (merge directly to `main`)

### Supporting Branches

**Feature branches** - `feature/*`
- New features or enhancements
- Branched from: `main` (or `develop`)
- Merge back to: `main` (or `develop`)
- Deleted after merge

**Bug fix branches** - `fix/*`
- Bug fixes
- Branched from: `main` (or `develop`)
- Merge back to: `main` (or `develop`)

**Hotfix branches** - `hotfix/*`
- Critical production fixes
- Branched from: `main`
- Merge back to: `main` AND `develop`
- Tagged with patch version

**Release branches** - `release/*`
- Release preparation
- Branched from: `develop`
- Merge back to: `main` AND `develop`
- Tagged with version number

### Branch Lifecycle

```
main
 │
 ├─── feature/add-worker-import
 │     │
 │     └─── (develop, test, commit)
 │           │
 │           └─── PR → main
 │                 │
 │                 └─── merge → tag v1.2.0
 │
 └─── hotfix/fix-auth-bug
       │
       └─── (fix, test, commit)
             │
             └─── PR → main
                   │
                   └─── merge → tag v1.2.1
```

## Branch Naming Conventions

### Format

```
<type>/<description>
```

### Types

- `feature/` - New features
- `fix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks
- `perf/` - Performance improvements

### Description

- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise
- Use imperative mood
- Include issue number if applicable

### Examples

```bash
# Features
feature/add-bulk-worker-import
feature/satellite-batch-processing
feature/accounting-reports

# Bug fixes
fix/login-redirect-loop
fix/rls-policy-farms
fix/satellite-timeout

# Hotfixes
hotfix/security-auth-bypass
hotfix/payment-webhook-failure

# Documentation
docs/update-api-reference
docs/add-deployment-guide

# With issue number
feature/123-add-notifications
fix/456-resolve-cors-error
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test additions/updates
- `chore` - Maintenance tasks
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Revert previous commit

### Scope (Optional)

Area of the codebase affected:

- `auth` - Authentication/authorization
- `accounting` - Accounting module
- `satellite` - Satellite analysis
- `workers` - Worker management
- `tasks` - Task management
- `ui` - UI components
- `db` - Database/migrations
- `api` - API changes

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Max 72 characters

### Body (Optional)

- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line
- Can include multiple paragraphs

### Footer (Optional)

- Reference issues: `Fixes #123`, `Closes #456`, `Refs #789`
- Breaking changes: `BREAKING CHANGE: description`
- Multiple footers separated by blank line

### Examples

**Simple feature**:
```
feat(workers): add metayage calculator
```

**Bug fix with details**:
```
fix(auth): resolve session expiry redirect loop

Users were getting stuck in redirect loop when session expired.
Fixed by checking session state before redirecting and clearing
stale session data from localStorage.

Fixes #123
```

**Breaking change**:
```
feat(api)!: update satellite API response format

BREAKING CHANGE: Satellite API now returns data in new format.
The `indices` field is now an object instead of an array.

Before:
  indices: ['NDVI', 'NDRE']

After:
  indices: {
    NDVI: { value: 0.8, ... },
    NDRE: { value: 0.7, ... }
  }

Migration guide: docs/migrations/satellite-api-v2.md
```

**Multiple changes**:
```
feat(accounting): implement journal entry validation

- Add debit/credit balance validation
- Implement account type restrictions (debit/credit normal balance)
- Add validation error messages with i18n support
- Update journal entry form with real-time validation
- Add comprehensive test coverage

Closes #456
Refs #457, #458
```

**Revert commit**:
```
revert: feat(workers): add bulk import

This reverts commit abc123def456.

Reason: Bulk import causing performance issues with large datasets.
Will reimplement with pagination in next iteration.
```

## Pull Request Workflow

### 1. Create Feature Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-worker-notifications

# Or with issue number
git checkout -b feature/123-add-notifications
```

### 2. Develop and Commit

```bash
# Make changes
# ...

# Stage changes
git add src/components/Notifications/

# Commit with conventional commit message
git commit -m "feat(workers): add notification component"

# Continue development
# ...

# Add more commits
git commit -m "feat(workers): add notification API integration"
git commit -m "test(workers): add notification tests"
```

### 3. Keep Branch Updated

```bash
# Fetch latest changes
git fetch origin

# Rebase on main (preferred for cleaner history)
git rebase origin/main

# Or merge (if rebase is complex)
git merge origin/main

# Resolve conflicts if any
# ... fix conflicts ...
git add .
git rebase --continue  # or git merge --continue
```

### 4. Push Branch

```bash
# First push
git push -u origin feature/add-worker-notifications

# Subsequent pushes
git push

# Force push after rebase (use with caution)
git push --force-with-lease
```

### 5. Create Pull Request

On GitHub:

1. Navigate to repository
2. Click "New Pull Request"
3. Select your branch
4. Fill out PR template:
   - Title (conventional commit format)
   - Description (what, why, how)
   - Link related issues
   - Add screenshots/videos if UI changes
   - List breaking changes
   - Mention reviewers

**Example PR Title**:
```
feat(workers): add bulk worker import functionality
```

**Example PR Description**:
```markdown
## Description
Adds bulk worker import functionality allowing users to import multiple workers from CSV files.

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Changes Made
- Added CSV parser for worker data
- Implemented validation for imported data
- Created preview component before final import
- Added error handling and user feedback
- Updated worker management UI with import button

## Testing
- [x] Unit tests added for CSV parser
- [x] Integration tests for import workflow
- [x] Manual testing with various CSV formats
- [x] Tested error scenarios

### Test Scenarios
1. Import valid CSV with 100 workers ✓
2. Import CSV with validation errors ✓
3. Import with duplicate worker IDs ✓
4. Cancel import in progress ✓
5. Import with special characters in names ✓

## Screenshots
[Add screenshots]

## Database Changes
- [ ] Migration required
- [x] Types updated
- [x] Tested migration locally

## Documentation
- [x] Code comments added
- [x] CLAUDE.md updated
- [ ] User guide updated (will do in separate PR)

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Tests pass locally
- [x] No console.log statements
- [x] No merge conflicts
```

### 6. Address Review Feedback

```bash
# Make requested changes
# ...

# Commit changes
git add .
git commit -m "fix: address PR feedback - improve error handling"

# Push updates
git push
```

### 7. Merge

Once approved, maintainer will merge using one of these strategies:

**Squash and Merge** (preferred for features)
- Combines all commits into one
- Clean history on main branch
- Loses individual commit history

**Rebase and Merge**
- Keeps all commits
- Linear history
- Good for well-organized commits

**Merge Commit**
- Creates merge commit
- Preserves all history
- Can create complex history

## Code Review Process

### For Authors

**Before requesting review**:
- [ ] Code is complete and tested
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Self-review completed
- [ ] No console.log or debug code
- [ ] Branch is up to date with main

**During review**:
- Respond to feedback promptly
- Ask questions if feedback is unclear
- Be open to suggestions
- Don't take criticism personally
- Push updates after addressing feedback

### For Reviewers

**What to look for**:
- Code correctness and logic
- Test coverage
- Performance considerations
- Security vulnerabilities
- Code style compliance
- Documentation completeness
- Breaking changes
- Database migration safety

**Review checklist**:
- [ ] Code achieves stated goal
- [ ] Tests are adequate
- [ ] No obvious bugs
- [ ] Error handling is appropriate
- [ ] Performance impact is acceptable
- [ ] Security considerations addressed
- [ ] Code is maintainable
- [ ] Documentation is clear

**Providing feedback**:
- Be respectful and constructive
- Explain the "why" behind suggestions
- Distinguish between required changes and suggestions
- Ask questions to understand author's approach
- Praise good solutions

**Feedback categories**:
- 🔴 **Blocker**: Must fix before merge
- 🟡 **Suggestion**: Consider changing
- 🟢 **Nit**: Minor style/formatting
- 💡 **Idea**: Future enhancement
- ❓ **Question**: Need clarification

**Example feedback**:
```
🔴 Blocker: Missing null check on line 45
The `farm` object could be null here if the query fails.

🟡 Suggestion: Consider extracting this logic into a hook
This validation logic is used in multiple components. Creating
a `useWorkerValidation` hook would make it more reusable.

🟢 Nit: Inconsistent spacing on line 23

💡 Idea: Could add batch processing for large imports
For future enhancement, consider implementing batch processing
for imports with >1000 workers.

❓ Question: Why use setTimeout here?
Could you explain the need for the delay on line 67?
```

## Release Process

### Semantic Versioning

We use [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Creating a Release

**1. Prepare release branch**:
```bash
git checkout main
git pull origin main
git checkout -b release/v1.2.0
```

**2. Update version**:
```bash
# Update package.json
npm version minor  # or major/patch

# This creates commit and tag
```

**3. Update changelog**:
```bash
# Edit CHANGELOG.md
# Add new version section with changes
```

**4. Create release PR**:
```bash
git push -u origin release/v1.2.0
# Create PR on GitHub
```

**5. After PR approval and merge**:
```bash
git checkout main
git pull origin main

# Push tags
git push origin v1.2.0
```

**6. Create GitHub release**:
- Go to GitHub → Releases → New Release
- Select tag: v1.2.0
- Title: "Version 1.2.0"
- Description: Copy from CHANGELOG.md
- Publish release

### Changelog Format

```markdown
# Changelog

## [1.2.0] - 2024-10-30

### Added
- Worker bulk import functionality (#123)
- Satellite batch processing (#145)
- Metayage calculator component (#167)

### Changed
- Improved performance of parcel rendering (#189)
- Updated authentication flow (#201)

### Fixed
- Session expiry redirect loop (#156)
- RLS policy for farms table (#178)
- Satellite service timeout issues (#192)

### Breaking Changes
- Satellite API response format changed (see migration guide)

### Security
- Updated dependencies with security patches

## [1.1.0] - 2024-09-15
...
```

## Git Best Practices

### Commit Frequency

```bash
# ✅ Good - Logical, atomic commits
git commit -m "feat(auth): add login form component"
git commit -m "feat(auth): add login API integration"
git commit -m "feat(auth): add login error handling"

# ❌ Bad - Too large, mixed concerns
git commit -m "add complete authentication system with login, signup, and password reset"

# ❌ Bad - Too small, incomplete
git commit -m "add file"
```

### Keeping Commits Clean

**Before pushing**:
```bash
# Amend last commit (if not pushed yet)
git add forgotten-file.ts
git commit --amend --no-edit

# Interactive rebase to clean up commits
git rebase -i HEAD~3

# Options:
# pick = keep commit
# reword = change commit message
# squash = combine with previous commit
# fixup = combine and discard commit message
# drop = remove commit
```

### Handling Conflicts

```bash
# When rebasing
git rebase origin/main

# If conflicts occur:
# 1. Fix conflicts in your editor
# 2. Stage resolved files
git add resolved-file.ts

# 3. Continue rebase
git rebase --continue

# Or abort if needed
git rebase --abort
```

### Useful Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline --graph

# View changes
git diff
git diff --staged

# Stash changes
git stash
git stash pop

# Cherry-pick specific commit
git cherry-pick abc123

# Undo last commit (keep changes)
git reset HEAD~1

# Undo last commit (discard changes) - DANGEROUS
git reset --hard HEAD~1

# View file history
git log -p filename

# Find who changed a line
git blame filename

# Search commits
git log --grep="search term"
```

### Git Hooks

The project uses Husky for Git hooks:

**Pre-commit** - Runs lint-staged:
```bash
# Automatically runs on git commit
# Lints and formats staged files
```

**Pre-push** - Runs tests:
```bash
# Automatically runs on git push
# Ensures tests pass before pushing
```

Configure in `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix"
    ]
  }
}
```

### Common Mistakes to Avoid

❌ **Don't commit to main directly**
```bash
# Always use feature branches
```

❌ **Don't force push to shared branches**
```bash
git push --force origin main  # NEVER do this
```

❌ **Don't commit sensitive data**
```bash
# Check .gitignore before committing
# Never commit .env, credentials, API keys
```

❌ **Don't mix unrelated changes**
```bash
# Keep commits focused on one logical change
```

❌ **Don't commit commented-out code**
```bash
# Delete instead of commenting
# Git history preserves everything
```

✅ **Do commit often**
```bash
# Small, logical commits are easier to review
```

✅ **Do write meaningful commit messages**
```bash
# Explain what and why, not how
```

✅ **Do keep branches up to date**
```bash
# Regularly rebase on main
git fetch origin
git rebase origin/main
```

✅ **Do test before pushing**
```bash
# Run tests locally
npm test
npm run lint
```

✅ **Do review your own PR first**
```bash
# Self-review on GitHub before requesting review
```

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Contributing Guide](/docs/contributing.md)

---

Following this Git workflow ensures consistent, high-quality code management and smooth collaboration across the team.
