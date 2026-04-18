---
description: Smart test runner — detects what changed and runs relevant tests
---

# Smart Test Runner

Run the right tests based on what changed in the codebase.

## Input: $ARGUMENTS

If arguments provided, use them to determine scope. Otherwise, auto-detect from git changes.

## Process

### 1. Detect what changed
```bash
# Get changed files vs develop
git diff --name-only develop...HEAD 2>/dev/null || git diff --name-only HEAD~1
```

### 2. Categorize changes and determine test scope

Based on changed files, run the appropriate tests:

#### Frontend changes (`project/src/**`)
```bash
# Type check first (fast, catches most issues)
cd project && npx tsc --noEmit

# Unit tests if test files exist for changed modules
cd project && npx vitest run --reporter=verbose

# If route files changed, check route generation
cd project && npx tsr generate
```

#### Backend API changes (`agritech-api/src/**`)
```bash
# Type check
cd agritech-api && npx tsc --noEmit

# Unit tests for changed modules
cd agritech-api && npm test
```

#### Database changes (`project/supabase/**`)
```bash
# Reset local DB to verify schema
cd project && npm run db:reset

# Regenerate types
cd project && npm run db:generate-types

# Type check frontend (to catch type mismatches)
cd project && npx tsc --noEmit
```

#### Python backend changes (`backend-service/**`)
```bash
cd backend-service && python -m pytest tests/ -v
```

#### E2E tests (only if explicitly requested or critical paths changed)
```bash
# Run specific test file
cd project && npx playwright test e2e/{spec-file}.spec.ts

# Run all E2E
cd project && npx playwright test
```

#### API integration tests
```bash
# Run specific suite
cd api-tests && npx playwright test src/tests/{suite}/

# Run smoke tests
cd api-tests && npm run test:smoke
```

### 3. Report results

For each test suite run, report:
- **Passed**: count
- **Failed**: count with failure details
- **Skipped**: count

If tests fail:
1. Show the error message
2. Identify the likely cause
3. Suggest a fix

### 4. Quick commands reference

| Scope | Command |
|-------|---------|
| Frontend types | `cd project && npx tsc --noEmit` |
| Frontend unit | `cd project && npx vitest run` |
| Backend types | `cd agritech-api && npx tsc --noEmit` |
| Backend unit | `cd agritech-api && npm test` |
| DB reset | `cd project && npm run db:reset` |
| DB types | `cd project && npm run db:generate-types` |
| E2E | `cd project && npx playwright test` |
| API smoke | `cd api-tests && npm run test:smoke` |
| Python | `cd backend-service && python -m pytest tests/ -v` |
