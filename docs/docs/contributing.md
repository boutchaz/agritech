# Contributing Guide

Thank you for your interest in contributing to the AgriTech Platform! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or derogatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ and npm
- Docker Desktop (for local Supabase)
- Git
- A code editor (VS Code recommended)
- Basic knowledge of TypeScript, React, and PostgreSQL

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agritech.git
   cd agritech
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/agritech.git
   ```

4. **Install dependencies**:
   ```bash
   cd project
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

6. **Start local development**:
   ```bash
   npm run db:start  # Start Supabase
   npm run dev       # Start Vite dev server
   ```

### Project Structure

Familiarize yourself with the project structure:

```
agritech/
├── project/                    # React frontend
│   ├── src/
│   │   ├── routes/            # TanStack Router routes
│   │   ├── components/        # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities and API clients
│   │   ├── schemas/          # Zod validation schemas
│   │   └── types/            # TypeScript types
│   ├── supabase/
│   │   └── migrations/       # Database migrations
│   └── scripts/              # Build and deployment scripts
├── satellite-indices-service/ # FastAPI backend
│   └── app/
│       ├── api/              # Route handlers
│       └── services/         # Business logic
└── docs/                     # Documentation
```

## Development Workflow

### 1. Create a Branch

Always create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

**Branch naming conventions**:
- Features: `feature/add-user-notifications`
- Bug fixes: `fix/login-redirect-issue`
- Documentation: `docs/update-api-guide`
- Performance: `perf/optimize-query-performance`
- Refactoring: `refactor/simplify-auth-logic`

### 2. Make Your Changes

- Write clean, maintainable code
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Test your changes thoroughly

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: add user notification system"
```

See [Commit Message Guidelines](#commit-message-guidelines) for details.

### 4. Keep Your Branch Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

If conflicts occur, resolve them and continue:

```bash
# Fix conflicts in your editor
git add .
git rebase --continue
```

### 5. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to GitHub and create a PR from your branch
2. Fill out the PR template completely
3. Link related issues
4. Request reviews from maintainers
5. Address review feedback promptly

## Code Style Guidelines

### TypeScript

**Use explicit types**:
```typescript
// Good
const fetchFarms = async (organizationId: string): Promise<Farm[]> => {
  // ...
};

// Avoid
const fetchFarms = async (organizationId) => {
  // ...
};
```

**Avoid `any` type**:
```typescript
// Good
const data: unknown = await response.json();
const farms = data as Farm[];

// Avoid
const data: any = await response.json();
```

**Use type inference when obvious**:
```typescript
// Good (type is obvious)
const count = 5;
const name = "John";

// Unnecessary
const count: number = 5;
```

### React Components

**Use functional components with TypeScript**:
```typescript
interface Props {
  farmId: string;
  onUpdate?: (farm: Farm) => void;
}

export const FarmDetails: React.FC<Props> = ({ farmId, onUpdate }) => {
  // Component logic
};
```

**Use hooks properly**:
```typescript
// Good - dependencies specified
useEffect(() => {
  fetchData();
}, [farmId]);

// Bad - missing dependencies
useEffect(() => {
  fetchData();
}, []);
```

**Extract complex logic into custom hooks**:
```typescript
// Good
const { farms, loading, error } = useFarms(organizationId);

// Instead of
const [farms, setFarms] = useState<Farm[]>([]);
const [loading, setLoading] = useState(false);
// ... lots of logic in component
```

### File Organization

**Group related functionality**:
```
components/
├── Workers/
│   ├── WorkerList.tsx
│   ├── WorkerCard.tsx
│   ├── WorkerForm.tsx
│   └── index.ts
```

**Use index.ts for exports**:
```typescript
// components/Workers/index.ts
export { WorkerList } from './WorkerList';
export { WorkerCard } from './WorkerCard';
export { WorkerForm } from './WorkerForm';
```

### Naming Conventions

- **Components**: PascalCase (`FarmDetails`, `WorkerList`)
- **Hooks**: camelCase with 'use' prefix (`useFarms`, `useAuth`)
- **Utilities**: camelCase (`formatCurrency`, `calculateArea`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`Farm`, `UserProfile`)
- **Files**: kebab-case for utilities, PascalCase for components

### Path Aliases

Always use `@/` path alias for imports:

```typescript
// Good
import { supabase } from '@/lib/supabase';
import { Farm } from '@/types';

// Avoid
import { supabase } from '../../lib/supabase';
```

### ESLint and Prettier

Run linting before committing:

```bash
npm run lint:fix
```

Configure your editor to auto-fix on save:

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true
}
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, configs)
- `ci`: CI/CD changes
- `build`: Build system changes

### Scope (Optional)

The scope specifies what part of the codebase is affected:

- `auth`: Authentication/authorization
- `accounting`: Accounting module
- `satellite`: Satellite analysis
- `workers`: Worker management
- `tasks`: Task management
- `ui`: UI components
- `db`: Database/migrations
- `api`: API changes

### Examples

**Simple feature**:
```
feat(workers): add metayage calculator component
```

**Bug fix with details**:
```
fix(auth): resolve session expiry redirect loop

Users were getting stuck in redirect loop when session expired.
Fixed by checking session state before redirecting.

Fixes #123
```

**Breaking change**:
```
feat(api)!: update satellite API response format

BREAKING CHANGE: Satellite API now returns data in new format.
Update all client code to handle new response structure.

Migration guide: docs/migrations/satellite-api-v2.md
```

**Multiple changes**:
```
feat(accounting): add journal entry validation

- Add debit/credit balance validation
- Implement account type restrictions
- Add validation error messages
- Update tests

Closes #456
```

### Subject Line Rules

- Use imperative mood ("add feature" not "added feature")
- Don't capitalize first letter
- No period at the end
- Keep under 72 characters

### Body (Optional)

- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (Optional)

- Reference issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Multiple issues: `Refs #123, #456, #789`

## Pull Request Process

### PR Title

Use the same format as commit messages:

```
feat(workers): add bulk import functionality
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues
Fixes #123
Related to #456

## Changes Made
- Added bulk import component for workers
- Implemented CSV parsing and validation
- Added error handling for invalid data
- Updated worker management UI

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed
- [ ] Tested on different browsers
- [ ] Tested with different roles

### Test Scenarios
1. Import valid CSV file with 100 workers
2. Import CSV with validation errors
3. Import with duplicate worker IDs
4. Cancel import in progress

## Screenshots (if applicable)
[Add screenshots here]

## Database Changes
- [ ] Migration required
- [ ] Types updated (`npm run db:generate-types`)
- [ ] Tested migration locally

### Migration Details
New table: worker_imports
New columns: workers.import_batch_id

## Documentation
- [ ] Updated CLAUDE.md
- [ ] Updated API documentation
- [ ] Added code comments
- [ ] Updated user guide

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No console.log statements (except intentional logging)
- [ ] Tests pass locally
- [ ] No merge conflicts
- [ ] Branch is up to date with main

## Additional Notes
Any additional context, concerns, or notes for reviewers.
```

### Review Process

1. **Automated Checks**: Ensure all CI checks pass
2. **Code Review**: Address reviewer feedback promptly
3. **Testing**: Test the changes thoroughly
4. **Approval**: Get approval from at least one maintainer
5. **Merge**: Maintainer will merge when ready

### Review Criteria

Reviewers will check for:

- Code quality and style compliance
- Test coverage
- Documentation updates
- Performance impact
- Security considerations
- Breaking changes properly documented
- Migration path for database changes

## Testing Requirements

### Unit Tests

Write unit tests for:
- Utilities and helper functions
- Custom hooks
- Complex business logic
- Data transformations

**Example**:
```typescript
// src/utils/__tests__/currencies.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../currencies';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('formats MAD correctly', () => {
    expect(formatCurrency(1234.56, 'MAD')).toBe('1 234,56 MAD');
  });
});
```

### Component Tests

Test user interactions and component behavior:

```typescript
// src/components/__tests__/FarmCard.test.tsx
import { render, screen } from '@testing-library/react';
import { FarmCard } from '../FarmCard';

describe('FarmCard', () => {
  it('renders farm name', () => {
    render(<FarmCard farm={{ name: 'Test Farm', ...}} />);
    expect(screen.getByText('Test Farm')).toBeInTheDocument();
  });
});
```

### E2E Tests

Write E2E tests for critical user flows:

```typescript
// tests/e2e/worker-management.spec.ts
import { test, expect } from '@playwright/test';

test('create new worker', async ({ page }) => {
  await page.goto('/employees');
  await page.click('button:has-text("Add Worker")');
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="email"]', 'john@example.com');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=John Doe')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Test Coverage

- Aim for >80% coverage for utilities and hooks
- Test happy paths and error cases
- Test edge cases and boundary conditions

## Documentation

### Code Comments

**Document complex logic**:
```typescript
// Calculate metayage (sharecropping) allocation based on crop type
// and agreed-upon percentage split between owner and worker
const calculateMetayageShare = (
  harvestValue: number,
  workerPercentage: number,
  cropType: CropType
) => {
  // For fruit trees, subtract maintenance costs first
  if (cropType === 'fruit-trees') {
    const maintenanceCost = harvestValue * 0.15;
    const netValue = harvestValue - maintenanceCost;
    return netValue * (workerPercentage / 100);
  }

  return harvestValue * (workerPercentage / 100);
};
```

**Use JSDoc for public APIs**:
```typescript
/**
 * Calculates vegetation indices for a given parcel and date range.
 *
 * @param parcelId - The ID of the parcel to analyze
 * @param options - Analysis options
 * @param options.startDate - Start date for analysis (ISO 8601)
 * @param options.endDate - End date for analysis (ISO 8601)
 * @param options.indices - Array of vegetation indices to calculate
 * @returns Promise resolving to analysis results
 * @throws {SatelliteServiceError} If satellite service is unavailable
 *
 * @example
 * ```typescript
 * const results = await calculateIndices('parcel-123', {
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   indices: ['NDVI', 'NDRE']
 * });
 * ```
 */
export const calculateIndices = async (
  parcelId: string,
  options: AnalysisOptions
): Promise<AnalysisResult> => {
  // Implementation
};
```

### README Updates

Update README.md if your changes:
- Add new features
- Change setup/installation process
- Modify configuration requirements
- Update dependencies

### CLAUDE.md Updates

Update CLAUDE.md for:
- New architectural patterns
- New database tables or significant schema changes
- New environment variables
- New API endpoints
- New workflows or processes

### API Documentation

Document new API endpoints:

```typescript
/**
 * POST /api/workers/bulk-import
 *
 * Imports workers from CSV file.
 *
 * Request Body:
 * {
 *   file: File,           // CSV file with worker data
 *   organizationId: string
 * }
 *
 * Response:
 * {
 *   imported: number,     // Number of workers imported
 *   errors: Array<{       // Validation errors
 *     row: number,
 *     field: string,
 *     message: string
 *   }>
 * }
 *
 * Errors:
 * - 400: Invalid CSV format
 * - 403: Insufficient permissions
 * - 413: File too large (max 5MB)
 */
```

## Community

### Getting Help

- Review existing documentation
- Check GitHub Issues for similar problems
- Ask in community Discord (if available)
- Create a GitHub Discussion for questions
- Email support: support@agritech.example.com

### Reporting Bugs

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. macOS 13.0]
 - Browser: [e.g. Chrome 120]
 - Node version: [e.g. 18.17.0]

**Additional context**
Any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Additional context**
Any other context, screenshots, or examples.
```

### Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to AgriTech Platform!
