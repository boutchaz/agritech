# Testing Strategy

This document outlines the comprehensive testing strategy for the AgriTech Platform.

## Table of Contents

- [Testing Pyramid](#testing-pyramid)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Test Organization](#test-organization)
- [Testing Tools](#testing-tools)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Testing Pyramid

We follow the testing pyramid approach:

```
        /\
       /  \     E2E Tests (10%)
      /    \    - Critical user flows
     /------\   - Cross-browser testing
    /        \
   / Integration\ (30%)
  /    Tests     \  - Component integration
 /--------------  \ - API integration
/                  \
/   Unit Tests      \ (60%)
/    (Majority)      \ - Utilities, hooks
/____________________\ - Business logic
```

### Test Distribution

- **60% Unit Tests**: Fast, isolated, testing individual functions/components
- **30% Integration Tests**: Medium speed, testing component interactions
- **10% E2E Tests**: Slow, expensive, testing critical user journeys

## Unit Testing

### What to Test

Unit tests should cover:
- Utility functions
- Custom hooks
- Business logic
- Data transformations
- Validation functions
- Pure components (input/output)

### Framework: Vitest

We use Vitest for unit testing (fast, Vite-native).

**Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

### Examples

**Testing Utility Functions**:

```typescript
// src/utils/__tests__/currencies.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, convertCurrency } from '../currencies';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('formats MAD with proper locale', () => {
    expect(formatCurrency(1234.56, 'MAD')).toBe('1 234,56 MAD');
  });

  it('handles zero values', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(10.999, 'USD')).toBe('$11.00');
  });
});

describe('convertCurrency', () => {
  it('converts between currencies', () => {
    const result = convertCurrency(100, 'USD', 'MAD', 10);
    expect(result).toBe(1000);
  });

  it('returns same value for same currency', () => {
    const result = convertCurrency(100, 'USD', 'USD', 10);
    expect(result).toBe(100);
  });

  it('handles decimal exchange rates', () => {
    const result = convertCurrency(100, 'USD', 'EUR', 0.85);
    expect(result).toBe(85);
  });
});
```

**Testing Custom Hooks**:

```typescript
// src/hooks/__tests__/useFarms.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFarms } from '../useFarms';
import * as supabase from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useFarms', () => {
  it('fetches farms successfully', async () => {
    const mockFarms = [
      { id: '1', name: 'Farm 1', area: 100 },
      { id: '2', name: 'Farm 2', area: 200 },
    ];

    vi.mocked(supabase.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockFarms,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(
      () => useFarms('org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockFarms);
  });

  it('handles errors gracefully', async () => {
    const mockError = new Error('Database error');

    vi.mocked(supabase.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });

    const { result } = renderHook(
      () => useFarms('org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('does not fetch when organizationId is null', () => {
    const { result } = renderHook(
      () => useFarms(null),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
```

**Testing Business Logic**:

```typescript
// src/utils/__tests__/metayage.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMetayageShare } from '../metayage';

describe('calculateMetayageShare', () => {
  it('calculates basic percentage split', () => {
    const result = calculateMetayageShare(1000, 30, 'vegetables');
    expect(result).toBe(300);
  });

  it('deducts maintenance for fruit trees', () => {
    const result = calculateMetayageShare(1000, 30, 'fruit-trees');
    // 1000 - (1000 * 0.15) = 850
    // 850 * 0.30 = 255
    expect(result).toBe(255);
  });

  it('handles zero harvest value', () => {
    const result = calculateMetayageShare(0, 30, 'vegetables');
    expect(result).toBe(0);
  });

  it('handles 100% worker share', () => {
    const result = calculateMetayageShare(1000, 100, 'vegetables');
    expect(result).toBe(1000);
  });

  it('handles 0% worker share', () => {
    const result = calculateMetayageShare(1000, 0, 'vegetables');
    expect(result).toBe(0);
  });
});
```

### Running Unit Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm test src/utils/__tests__/currencies.test.ts

# Run tests matching pattern
npm test -- --grep="formatCurrency"
```

## Integration Testing

### What to Test

Integration tests cover:
- Component interactions
- Form submissions with validation
- API integration with mocked responses
- State management across components
- Router navigation

### Framework: Vitest + React Testing Library

**Testing Component Integration**:

```typescript
// src/components/__tests__/FarmForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FarmForm } from '../FarmForm';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const mockOnSuccess = vi.fn();
const mockCreateFarm = vi.fn();

vi.mock('@/hooks/useFarms', () => ({
  useCreateFarm: () => ({
    mutate: mockCreateFarm,
    isLoading: false,
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('FarmForm', () => {
  it('renders form fields', () => {
    renderWithProviders(<FarmForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/farm name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/area/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create farm/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithProviders(<FarmForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole('button', { name: /create farm/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockCreateFarm.mockResolvedValue({ id: '1', name: 'Test Farm' });

    renderWithProviders(<FarmForm onSuccess={mockOnSuccess} />);

    // Fill form
    await user.type(screen.getByLabelText(/farm name/i), 'Test Farm');
    await user.type(screen.getByLabelText(/area/i), '100');

    // Submit
    await user.click(screen.getByRole('button', { name: /create farm/i }));

    await waitFor(() => {
      expect(mockCreateFarm).toHaveBeenCalledWith({
        name: 'Test Farm',
        area: 100,
      });
    });
  });

  it('displays error message on submission failure', async () => {
    const user = userEvent.setup();
    mockCreateFarm.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<FarmForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/farm name/i), 'Test Farm');
    await user.click(screen.getByRole('button', { name: /create farm/i }));

    await waitFor(() => {
      expect(screen.getByText(/error creating farm/i)).toBeInTheDocument();
    });
  });

  it('validates area is positive number', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FarmForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/farm name/i), 'Test Farm');
    await user.type(screen.getByLabelText(/area/i), '-10');
    await user.click(screen.getByRole('button', { name: /create farm/i }));

    await waitFor(() => {
      expect(screen.getByText(/area must be positive/i)).toBeInTheDocument();
    });
  });
});
```

**Testing with Authentication Context**:

```typescript
// src/components/__tests__/FarmList.test.tsx
import { render, screen } from '@testing-library/react';
import { FarmList } from '../FarmList';
import { MultiTenantAuthProvider } from '@/components/MultiTenantAuthProvider';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
};

const mockOrganization = {
  id: 'org-1',
  name: 'Test Org',
};

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <MultiTenantAuthProvider>
      {component}
    </MultiTenantAuthProvider>
  );
};

describe('FarmList with Auth', () => {
  it('displays farms for authenticated user', async () => {
    renderWithAuth(<FarmList />);

    await waitFor(() => {
      expect(screen.getByText('Farm 1')).toBeInTheDocument();
    });
  });
});
```

## End-to-End Testing

### What to Test

E2E tests cover:
- Critical user journeys
- Multi-step workflows
- Cross-page navigation
- Real API interactions
- Browser-specific behavior

### Framework: Playwright

**Configuration** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

**User Authentication Flow**:

```typescript
// tests/e2e/authentication.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login successfully', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});
```

**Worker Management Flow**:

```typescript
// tests/e2e/worker-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Worker Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('create new worker', async ({ page }) => {
    // Navigate to workers page
    await page.click('text=Workers');
    await expect(page).toHaveURL('/employees');

    // Open create form
    await page.click('button:has-text("Add Worker")');

    // Fill form
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+212612345678');
    await page.selectOption('select[name="role"]', 'farm_worker');

    // Submit
    await page.click('button:has-text("Save")');

    // Verify success
    await expect(page.locator('text=Worker created successfully')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('edit existing worker', async ({ page }) => {
    await page.goto('/employees');

    // Click edit on first worker
    await page.click('[data-testid="worker-card"]:first-child button:has-text("Edit")');

    // Update name
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill('Jane Smith');

    // Save
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Worker updated successfully')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
  });

  test('delete worker', async ({ page }) => {
    await page.goto('/employees');

    // Click delete on first worker
    await page.click('[data-testid="worker-card"]:first-child button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify deletion
    await expect(page.locator('text=Worker deleted successfully')).toBeVisible();
  });

  test('search workers', async ({ page }) => {
    await page.goto('/employees');

    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'John');

    // Wait for results
    await page.waitForTimeout(500); // Debounce

    // Verify filtered results
    const workerCards = page.locator('[data-testid="worker-card"]');
    await expect(workerCards).toHaveCount(1);
    await expect(workerCards.first()).toContainText('John');
  });
});
```

**Satellite Analysis Flow**:

```typescript
// tests/e2e/satellite-analysis.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Satellite Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to satellite analysis
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.click('text=Satellite Analysis');
  });

  test('request satellite analysis', async ({ page }) => {
    // Select parcel
    await page.selectOption('select[name="parcel"]', { index: 1 });

    // Select date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');

    // Select indices
    await page.check('input[value="NDVI"]');
    await page.check('input[value="NDRE"]');

    // Submit request
    await page.click('button:has-text("Calculate")');

    // Wait for results
    await expect(page.locator('text=Analysis complete')).toBeVisible({ timeout: 30000 });

    // Verify results displayed
    await expect(page.locator('[data-testid="ndvi-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="ndre-chart"]')).toBeVisible();
  });

  test('export GeoTIFF', async ({ page }) => {
    // After analysis is complete
    await page.click('button:has-text("Export")');

    // Select format
    await page.click('text=GeoTIFF');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.tif');
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/authentication.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# View test report
npm run test:e2e:report
```

## Test Organization

### File Structure

```
project/
├── src/
│   ├── components/
│   │   └── __tests__/
│   │       ├── FarmForm.test.tsx
│   │       └── WorkerCard.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useFarms.test.ts
│   └── utils/
│       └── __tests__/
│           └── currencies.test.ts
├── tests/
│   └── e2e/
│       ├── authentication.spec.ts
│       ├── worker-management.spec.ts
│       └── satellite-analysis.spec.ts
└── test/
    └── setup.ts
```

### Naming Conventions

- Unit/Integration tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `*.spec.ts`
- Test files co-located with source files in `__tests__/` directory

## Testing Tools

### Core Testing Libraries

- **Vitest**: Unit and integration test runner
- **React Testing Library**: Component testing utilities
- **Playwright**: E2E testing framework
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers

### Mocking Libraries

- **vi** (Vitest): Mocking functions and modules
- **msw**: Mock Service Worker for API mocking

## Best Practices

### General Principles

1. **Test behavior, not implementation**
2. **Write descriptive test names**
3. **Follow AAA pattern (Arrange, Act, Assert)**
4. **Keep tests independent and isolated**
5. **Use data-testid sparingly (prefer accessible queries)**
6. **Mock external dependencies**
7. **Test error cases and edge cases**

### Query Priority (React Testing Library)

```typescript
// 1. Accessible to everyone (BEST)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
screen.getByPlaceholderText(/search/i)
screen.getByText(/welcome/i)

// 2. Semantic queries
screen.getByAltText(/profile picture/i)
screen.getByTitle(/close/i)

// 3. Test IDs (LAST RESORT)
screen.getByTestId('custom-element')
```

### Coverage Goals

- **Overall coverage**: >80%
- **Utilities**: >90%
- **Business logic**: >85%
- **Components**: >70%
- **E2E**: Critical paths covered

### Continuous Improvement

- Review test failures in CI/CD
- Update tests when bugs are found
- Refactor tests along with code
- Remove obsolete tests
- Monitor test execution time

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

Following this testing strategy ensures high-quality, reliable code with confidence in deployments.
