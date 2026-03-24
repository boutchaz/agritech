---
description: Review changed code for multi-tenancy, security, patterns, and quality
---

# Code Review Checklist

Review the current changes against AgriTech project conventions and security requirements.

## Input: $ARGUMENTS

## Process

### 1. Identify what changed
Run `git diff --stat` and `git diff` to see all changes. If a branch is specified, use `git diff develop...HEAD`.

### 2. Review each category

#### Multi-Tenancy (CRITICAL)
- [ ] Every DB query filters by `organization_id`
- [ ] Backend extracts org from `req.headers['x-organization-id']` (NOT from body/query)
- [ ] Frontend passes `organizationId` to every API call
- [ ] No cross-organization data leakage possible
- [ ] New tables have RLS policies with `is_organization_member()`

#### Authorization
- [ ] Controller uses `@UseGuards(JwtAuthGuard, PoliciesGuard)`
- [ ] `@CheckPolicies()` decorator with correct Action and Subject
- [ ] Subscription limits checked for create operations (if applicable)
- [ ] Frontend uses `<Can>` wrapper or ability checks for UI gating

#### Data Fetching (Frontend)
- [ ] Query keys include `organizationId`
- [ ] `enabled: !!organizationId` guard on queries
- [ ] Mutations invalidate related query keys on success
- [ ] No stale closure issues (deps in useEffect/useMemo/useCallback)

#### Forms
- [ ] Uses react-hook-form + zod (NOT uncontrolled or useState-based forms)
- [ ] Schema uses i18n for validation messages
- [ ] Error display via FormField or `errors.field.message`
- [ ] Submit handler uses try/catch with toast notifications

#### i18n
- [ ] No hardcoded user-facing strings
- [ ] Uses `t('key', 'Fallback')` pattern
- [ ] Keys added to all 3 languages (en, fr, ar)

#### TypeScript
- [ ] No `any` types (use proper typing or `unknown`)
- [ ] Interfaces defined for API responses and form data
- [ ] No `@ts-ignore` or `@ts-expect-error` without explanation

#### Database
- [ ] Schema uses idempotent SQL (IF NOT EXISTS)
- [ ] RLS enabled on new tables
- [ ] Indexes on `organization_id` and frequently filtered columns
- [ ] `updated_at` trigger present
- [ ] Foreign keys with appropriate ON DELETE

#### Security
- [ ] No secrets or credentials in code
- [ ] No SQL injection vectors (parameterized queries)
- [ ] No XSS vectors (React handles by default, but check dangerouslySetInnerHTML)
- [ ] Input validation on all user inputs (DTOs with class-validator or zod)

#### Performance
- [ ] No N+1 query patterns (use joins or batch fetches)
- [ ] Large lists use pagination
- [ ] Heavy computations wrapped in useMemo
- [ ] Images/assets optimized

### 3. Output format

For each issue found, report:
```
[SEVERITY] Category — Description
File: path/to/file.ts:line
Fix: Suggested fix
```

Severity levels:
- **CRITICAL**: Security issue or data leak — must fix before merge
- **HIGH**: Bug or pattern violation — should fix
- **MEDIUM**: Code quality or convention — nice to fix
- **LOW**: Style or minor improvement — optional

### 4. Summary
End with a summary: total issues by severity, overall assessment (approve / request changes), and any positive callouts for well-done code.
