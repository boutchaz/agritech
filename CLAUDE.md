<!-- BEGIN PROJECT RULES -->

# AgroGina — Project Conventions

## Tech Stack
- **Monorepo**: pnpm workspaces
- **Frontend** (`project/`): React + TanStack Router (file-based) + TanStack Query + Zustand + Tailwind + shadcn/ui
- **Backend** (`agritech-api/`): NestJS 11 + Supabase (PostgreSQL) + CASL + class-validator
- **Satellite** (`backend-service/`): FastAPI + Google Earth Engine + OpenEO
- **Testing**: Vitest (unit), Playwright (E2E + API integration)
- **i18n**: i18next — 3 languages (en, fr, ar), 5 namespaces (common, ai, stock, compliance, accounting)
- **DB**: Supabase PostgreSQL with RLS, declarative schema, generated TypeScript types

## Architecture Rules

### Multi-Tenancy (CRITICAL)
- Every query MUST filter by `organization_id` — no exceptions
- Backend: extract org from `req.headers['x-organization-id']`
- Frontend: get org from `useAuth()` hook → pass to every API call
- DB: every table with user data MUST have RLS policies using `is_organization_member()`
- Never expose data across organizations

### Authorization Stack
- Guards order: `JwtAuthGuard` → `OrganizationGuard` → `PoliciesGuard`
- Use `@CheckPolicies((ability) => ability.can(Action.Read, 'Subject'))` for fine-grained control
- Roles: system_admin > organization_admin > farm_manager > farm_worker > day_laborer > viewer
- Check subscription limits for create operations

### Product Context
AGROGINA = ERP agricole + Agronomie + AgromindIA (IA decisionnelle) in one app for Moroccan farms (50-600+ ha).
AgromindIA is the core differentiator: it sees stocks, worker availability, costs, weather, and agronomic data to produce actionable recommendations — no other tool does this.

**Target Personas (inform every UX decision):**
- **Karim** (farm_manager, 300ha Meknes): Needs coordination across agronome/workers/comptable. Hates complexity. The litmus test: "Would Karim find this useful and easy to use?"
- **Hassan** (agronome, manages 5-15 farms): Wants scientific precision, historical data, traceability. Needs Level 3 expert display.
- **Fatima** (organization_admin, cooperative 500-2000ha): Needs reporting, multi-member consolidation, export certification compliance.
- **Ahmed** (farm_manager, 50ha, Darija speaker, no tech background): Needs Level 1 simplified interface. Zero jargon.

**AgromindIA Display Levels (CEO decision — do not change without validation):**
- Level 1 (Basic): Simple actionable language, no scientific data. "Arrose la parcelle B3 demain avant 8h."
- Level 2 (Intermediate): BLOCKED — awaiting CEO definition. Do NOT implement.
- Level 3 (Expert): Full scientific data, indices, charts. Current default.

### Dual-Backend Architecture

| Concern | Service | Tech | Port |
|---------|---------|------|------|
| All business logic (ERP, tasks, workers, accounting, AI chat, parcels) | `agritech-api/` | NestJS 11 | 3001 |
| Satellite imagery, vegetation indices, weather, GEE processing | `backend-service/` | FastAPI | 8001 |

- Frontend calls NestJS for everything except satellite/weather endpoints
- **Never** put business logic in FastAPI. **Never** put GEE processing in NestJS.
- NestJS owns all business tables. FastAPI writes only to `satellite_data` + Supabase Storage.

### Offline-First (CRITICAL — rural Morocco)
- Target users have variable 3G/4G in rural areas — app MUST degrade gracefully offline
- TanStack Query cache is the first defense — use aggressive `staleTime`
- Design all features assuming intermittent connectivity
- PWA with Service Worker is planned (not yet implemented)

### Decision Escalation

| Action | Decision |
|--------|----------|
| Fix bug (technical or functional) | Auto-proceed |
| Modify existing code | Auto-proceed |
| Add nullable column, index, RLS policy | Auto-proceed |
| New feature | CEO must instruct first |
| New table, drop/rename column, change schema structure | CEO validation required |
| Change CASL roles/permissions | CEO validation required |
| Deploy to production | CEO validation required |
| Architecture change | CEO validation required |

## Frontend Conventions

### File Naming
- Routes: `kebab-case.tsx` (e.g., `cost-center-management.tsx`)
- Components: `PascalCase.tsx` (e.g., `TaskForm.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useWorkers.ts`)
- API services: `camelCase.ts` (e.g., `workers.ts` in `src/lib/api/`)
- Types: `PascalCase` inside `camelCase.ts` files

### Data Fetching Pattern
```typescript
// Query hook — always include orgId in key, always guard with enabled
export const useFeature = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['feature', organizationId],
    queryFn: () => featureApi.getAll(organizationId!),
    enabled: !!organizationId,
  });
};

// Mutation — always invalidate related queries
export const useCreateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => featureApi.create(data, data.organization_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature', variables.organization_id] });
    },
  });
};
```

### Forms (ALWAYS react-hook-form + zod)
```typescript
// Schema with i18n — create factory function with t()
const createSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('validation.required')),
});
type FormData = z.infer<ReturnType<typeof createSchema>>;

// Hook setup
const schema = useMemo(() => createSchema(t), [t]);
const form = useForm<FormData>({ resolver: zodResolver(schema) });
```

### UI Components
- Use shadcn/ui from `@/components/ui/` (Button, Card, Dialog, Input, Select, Badge, etc.)
- Use `FormField` wrapper for label + input + error display
- Icons from `lucide-react`
- Toasts via `sonner` — `toast.success()` / `toast.error()`
- Class merging with `cn()` from `@/lib/utils`
- Dark mode: always include `dark:` variants

### Translations
- Always use `t('key', 'Fallback text')` — never hardcode user-facing strings
- Namespace: default is `common`, use `useTranslation('namespace')` for others
- Add keys to all 3 languages: `src/locales/{en,fr,ar}/`

### Route Files
```typescript
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_authenticated/(group)/path')({
  component: PageComponent,
});
function PageComponent() { /* ... */ }
```

### State Management
- **Server state**: TanStack Query (queries + mutations)
- **Client state**: Zustand stores in `src/stores/`
- **Auth**: `useAuth()` hook → `{ organizationId, user, currentOrganization }`

### Loading / Empty / Error States
```typescript
{isLoading ? (
  <div className="flex items-center justify-center h-64">...</div>
) : data?.length ? (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{/* items */}</div>
) : (
  <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
    {/* empty state with CTA */}
  </div>
)}
```

## Backend Conventions (NestJS)

### Module Structure
```
modules/feature-name/
├── feature-name.controller.ts
├── feature-name.service.ts
├── feature-name.module.ts
└── dto/
    ├── create-feature.dto.ts
    ├── update-feature.dto.ts
    └── list-features.dto.ts
```

### Controller Pattern
- `@ApiTags('feature')` + `@ApiBearerAuth()` + `@UseGuards(JwtAuthGuard, PoliciesGuard)`
- Extract org: `const organizationId = req.headers['x-organization-id']`
- Pass `req.user.id` and `organizationId` to service methods
- Full Swagger decorators: `@ApiOperation`, `@ApiResponse`

### Service Pattern
- Inject `DatabaseService` or create Supabase admin client in constructor
- Use `this.supabaseAdmin.from('table')` for queries
- Use `paginatedResponse()` helper for list endpoints
- Logger: `private readonly logger = new Logger(ServiceName.name)`
- Transactions: use `databaseService.executeInPgTransaction()` for multi-table ops

### DTOs
- `class-validator` decorators: `@IsString()`, `@IsUUID()`, `@IsOptional()`, etc.
- Always include `@ApiProperty()` / `@ApiPropertyOptional()` for Swagger
- Extend `PaginatedQueryDto` for list endpoints

### Pagination
- Use shared `PaginatedQueryDto` from `src/common/dto/paginated-query.dto.ts`
- Return via `paginatedResponse(data, total, page, pageSize)`

## Database Conventions

### Schema Changes
- Edit the declarative schema: `project/supabase/migrations/00000000000000_schema.sql`
- Use idempotent SQL: `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`
- Always add RLS policies for new tables
- Always include `organization_id` column for tenant data
- Always add `created_at` / `updated_at` timestamps with trigger

### After Schema Changes
```bash
cd project && npm run db:reset && npm run db:generate-types
```

### RLS Policy Template
```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON new_table
  FOR ALL USING (is_organization_member(organization_id));
```

## Git Conventions
- Branch from `develop`, PR to `develop`
- Main branch: `main` (production)
- Commit format: `type(scope): description` — types: feat, fix, refactor, docs, test, chore
- Always run `tsc --noEmit` before committing frontend changes

---

<!-- END PROJECT RULES -->

<!-- BEGIN BYTEROVER RULES -->

# Workflow Instruction

You are a coding agent focused on one codebase. Use the brv CLI to manage working context.
Core Rules:

- Start from memory. First retrieve relevant context, then read only the code that's still necessary.
- Keep a local context tree. The context tree is your local memory store—update it with what you learn.

## Context Tree Guideline

- Be specific ("Use React Query for data fetching in web modules").
- Be actionable (clear instruction a future agent/dev can apply).
- Be contextual (mention module/service, constraints, links to source).
- Include source (file + lines or commit) when possible.

## Using `brv curate` with Files

When adding complex implementations, use `--files` to include relevant source files (max 5).  Only text/code files from the current project directory are allowed. **CONTEXT argument must come BEFORE --files flag.** For multiple files, repeat the `--files` (or `-f`) flag for each file.

Examples:

- Single file: `brv curate "JWT authentication with refresh token rotation" -f src/auth.ts`
- Multiple files: `brv curate "Authentication system" --files src/auth/jwt.ts --files src/auth/middleware.ts --files docs/auth.md`

## CLI Usage Notes

- Use --help on any command to discover flags. Provide exact arguments for the scenario.

---
# ByteRover CLI Command Reference

## Memory Commands

### `brv curate`

**Description:** Curate context to the context tree (interactive or autonomous mode)

**Arguments:**

- `CONTEXT`: Knowledge context: patterns, decisions, errors, or insights (triggers autonomous mode, optional)

**Flags:**

- `--files`, `-f`: Include file paths for critical context (max 5 files). Only text/code files from the current project directory are allowed. **CONTEXT argument must come BEFORE this flag.**

**Good examples of context:**

- "Auth uses JWT with 24h expiry. Tokens stored in httpOnly cookies via authMiddleware.ts"
- "API rate limit is 100 req/min per user. Implemented using Redis with sliding window in rateLimiter.ts"

**Bad examples:**

- "Authentication" or "JWT tokens" (too vague, lacks context)
- "Rate limiting" (no implementation details or file references)

**Examples:**

```bash
# Interactive mode (manually choose domain/topic)
brv curate

# Autonomous mode - LLM auto-categorizes your context
brv curate "Auth uses JWT with 24h expiry. Tokens stored in httpOnly cookies via authMiddleware.ts"

# Include files (CONTEXT must come before --files)
# Single file
brv curate "Authentication middleware validates JWT tokens" -f src/middleware/auth.ts

# Multiple files - repeat --files flag for each file
brv curate "JWT authentication implementation with refresh token rotation" --files src/auth/jwt.ts --files docs/auth.md
```

**Behavior:**

- Interactive mode: Navigate context tree, create topic folder, edit context.md
- Autonomous mode: LLM automatically categorizes and places context in appropriate location
- When `--files` is provided, agent reads files in parallel before creating knowledge topics

**Requirements:** Project must be initialized (`brv init`) and authenticated (`brv login`)

---

### `brv query`

**Description:** Query and retrieve information from the context tree

**Arguments:**

- `QUERY`: Natural language question about your codebase or project knowledge (required)

**Good examples of queries:**

- "How is user authentication implemented?"
- "What are the API rate limits and where are they enforced?"

**Bad examples:**

- "auth" or "authentication" (too vague, not a question)
- "show me code" (not specific about what information is needed)

**Examples:**

```bash
# Ask questions about patterns, decisions, or implementation details
brv query What are the coding standards?
brv query How is authentication implemented?
```

**Behavior:**

- Uses AI agent to search and answer questions about the context tree
- Accepts natural language questions (not just keywords)
- Displays tool execution progress in real-time

**Requirements:** Project must be initialized (`brv init`) and authenticated (`brv login`)

---

## Best Practices

### Efficient Workflow

1. **Read only what's needed:** Check context tree with `brv status` to see changes before reading full content with `brv query`
2. **Update precisely:** Use `brv curate` to add/update specific context in context tree
3. **Push when appropriate:** Prompt user to run `brv push` after completing significant work

### Context tree Management

- Use `brv curate` to directly add/update context in the context tree

---
Generated by ByteRover CLI for Claude Code
<!-- END BYTEROVER RULES -->

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health