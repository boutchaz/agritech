# Testing Guide

This comprehensive guide covers testing strategies for the AgriTech Platform, including unit tests with Vitest, end-to-end tests with Playwright, and testing patterns for React components, hooks, and API integrations.

## Overview

The AgriTech Platform uses a multi-layered testing approach:

1. **Unit Tests** (Vitest) - Components, hooks, utilities
2. **Integration Tests** (Vitest + React Testing Library) - Component interactions
3. **E2E Tests** (Playwright) - Critical user flows
4. **Manual Testing** - Database migrations, complex features

## Testing Stack

- **Vitest** - Unit test runner (Vite-native, fast)
- **React Testing Library** - Component testing utilities
- **Playwright** - E2E browser automation
- **MSW (Mock Service Worker)** - API mocking

## Project Structure

```
project/
├── src/
│   ├── components/
│   │   └── __tests__/
│   │       └── Component.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useHook.test.ts
│   └── utils/
│       └── __tests__/
│           └── util.test.ts
├── tests/
│   └── e2e/
│       └── critical-flow.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

## Unit Testing with Vitest

### Setup

**File:** `/project/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/__tests__/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**File:** `/project/src/test/setup.ts`

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));
```

### Testing Components

**Example: Testing a Button Component**

**File:** `/project/src/components/ui/__tests__/button.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('applies variant styles', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByText('Outline');
    expect(button).toHaveClass('border');
  });
});
```

**Example: Testing a Form Component**

**File:** `/project/src/components/Tasks/__tests__/TaskForm.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskForm } from '../TaskForm';

describe('TaskForm', () => {
  const mockOnSubmit = vi.fn();
  const mockParcels = [
    { id: '1', name: 'Parcel 1' },
    { id: '2', name: 'Parcel 2' },
  ];

  it('renders all form fields', () => {
    render(<TaskForm onSubmit={mockOnSubmit} parcels={mockParcels} />);

    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(<TaskForm onSubmit={mockOnSubmit} parcels={mockParcels} />);

    // Submit without filling form
    fireEvent.click(screen.getByText(/save task/i));

    await waitFor(() => {
      expect(screen.getByText(/task name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    render(<TaskForm onSubmit={mockOnSubmit} parcels={mockParcels} />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/task name/i), {
      target: { value: 'Water plants' },
    });
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: '2024-12-31' },
    });

    // Submit
    fireEvent.click(screen.getByText(/save task/i));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Water plants',
        description: '',
        due_date: '2024-12-31',
        assigned_to: '',
      });
    });
  });

  it('displays loading state when submitting', () => {
    render(<TaskForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    expect(screen.getByText(/saving.../i)).toBeDisabled();
  });
});
```

### Testing Custom Hooks

**Example: Testing useAuth Hook**

**File:** `/project/src/hooks/__tests__/useAuth.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: '1', email: 'test@example.com' },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: { id: '1', email: 'test@example.com' },
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
      });
    });
  });

  it('returns null when not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });
});
```

**Example: Testing Data Fetching Hook**

**File:** `/project/src/hooks/__tests__/useParcels.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParcels } from '../useParcels';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

const mockParcels = [
  { id: '1', name: 'Parcel 1', farm_id: 'farm-1' },
  { id: '2', name: 'Parcel 2', farm_id: 'farm-1' },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useParcels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches parcels for a farm', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockParcels,
          error: null,
        }),
      }),
    } as any);

    const { result } = renderHook(() => useParcels('farm-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockParcels);
    });
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Failed to fetch');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error,
        }),
      }),
    } as any);

    const { result } = renderHook(() => useParcels('farm-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
```

### Testing Utilities

**Example: Testing Date Utilities**

**File:** `/project/src/utils/__tests__/dateUtils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, isWithinDateRange, addDays } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date('2024-06-15');
      expect(formatDate(date)).toBe('2024-06-15');
    });

    it('handles string dates', () => {
      expect(formatDate('2024-06-15')).toBe('2024-06-15');
    });
  });

  describe('isWithinDateRange', () => {
    it('returns true for date within range', () => {
      const date = '2024-06-15';
      const start = '2024-06-01';
      const end = '2024-06-30';

      expect(isWithinDateRange(date, start, end)).toBe(true);
    });

    it('returns false for date outside range', () => {
      const date = '2024-07-15';
      const start = '2024-06-01';
      const end = '2024-06-30';

      expect(isWithinDateRange(date, start, end)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds days to a date', () => {
      const date = new Date('2024-06-15');
      const result = addDays(date, 5);

      expect(result.toISOString().split('T')[0]).toBe('2024-06-20');
    });

    it('handles negative days', () => {
      const date = new Date('2024-06-15');
      const result = addDays(date, -5);

      expect(result.toISOString().split('T')[0]).toBe('2024-06-10');
    });
  });
});
```

## E2E Testing with Playwright

### Setup

**File:** `/project/playwright.config.ts`

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

**Example: Login Flow**

**File:** `/project/tests/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify user is logged in
    expect(await page.textContent('body')).toContain('Dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('user can logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('button:has-text("Sign out")');

    // Verify redirected to login
    await page.waitForURL('/login');
  });
});
```

**Example: Task Management Flow**

**File:** `/project/tests/e2e/tasks.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('user can create a new task', async ({ page }) => {
    await page.goto('/tasks');

    // Open create dialog
    await page.click('button:has-text("New Task")');

    // Fill form
    await page.fill('input[name="name"]', 'Water plants');
    await page.fill('textarea[name="description"]', 'Water all the tomato plants');
    await page.fill('input[name="due_date"]', '2024-12-31');

    // Submit
    await page.click('button[type="submit"]:has-text("Save Task")');

    // Verify task appears in list
    await expect(page.locator('text=Water plants')).toBeVisible();
  });

  test('user can complete a task', async ({ page }) => {
    await page.goto('/tasks');

    // Find a task and mark as complete
    const taskRow = page.locator('text=Water plants').locator('..');
    await taskRow.locator('button[aria-label="Complete"]').click();

    // Verify status updated
    await expect(taskRow.locator('text=Completed')).toBeVisible();
  });

  test('user can filter tasks by status', async ({ page }) => {
    await page.goto('/tasks');

    // Apply filter
    await page.selectOption('select[name="status"]', 'completed');

    // Verify only completed tasks shown
    const tasks = page.locator('[data-testid="task-item"]');
    await expect(tasks).toHaveCount(await tasks.count());

    for (const task of await tasks.all()) {
      await expect(task.locator('text=Completed')).toBeVisible();
    }
  });
});
```

**Example: Satellite Analysis Flow**

**File:** `/project/tests/e2e/satellite-analysis.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Satellite Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('user can run satellite analysis on a parcel', async ({ page }) => {
    await page.goto('/satellite-analysis');

    // Select parcel
    await page.selectOption('select[name="parcel"]', 'parcel-1');

    // Select vegetation index
    await page.selectOption('select[name="index"]', 'NDVI');

    // Select date
    await page.selectOption('select[name="date"]', '2024-06-15');

    // Run analysis
    await page.click('button:has-text("Calculate Indices")');

    // Wait for heatmap to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });

    // Verify results displayed
    await expect(page.locator('text=Heatmap - NDVI')).toBeVisible();
  });

  test('user can export GeoTIFF', async ({ page }) => {
    await page.goto('/satellite-analysis');

    await page.selectOption('select[name="parcel"]', 'parcel-1');
    await page.selectOption('select[name="index"]', 'NDVI');
    await page.selectOption('select[name="date"]', '2024-06-15');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export GeoTIFF")');
    const download = await downloadPromise;

    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/\.tif$/);
  });
});
```

## Testing Patterns

### 1. Test Isolation

Each test should be independent:

```typescript
test.beforeEach(() => {
  // Reset state before each test
  vi.clearAllMocks();
});

test.afterEach(() => {
  // Cleanup after each test
  cleanup();
});
```

### 2. AAA Pattern (Arrange, Act, Assert)

```typescript
test('adds two numbers', () => {
  // Arrange
  const a = 2;
  const b = 3;

  // Act
  const result = add(a, b);

  // Assert
  expect(result).toBe(5);
});
```

### 3. Testing Async Operations

```typescript
test('fetches data asynchronously', async () => {
  const { result } = renderHook(() => useData());

  // Wait for data to load
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### 4. Testing Error States

```typescript
test('handles errors gracefully', async () => {
  vi.mocked(api.fetch).mockRejectedValue(new Error('Network error'));

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Running Tests

### Unit Tests

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/hooks/__tests__/useAuth.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Run specific test
npx playwright test tests/e2e/auth.spec.ts

# Show test report
npm run test:e2e:report
```

## Coverage Goals

- **Unit Tests:** 80%+ coverage for critical paths
- **Integration Tests:** Cover major user flows
- **E2E Tests:** Cover critical business workflows

## Checklist

**Unit Tests:**
- [ ] Component rendering tests
- [ ] Component interaction tests (click, input, etc.)
- [ ] Form validation tests
- [ ] Hook data fetching tests
- [ ] Utility function tests
- [ ] Error handling tests

**E2E Tests:**
- [ ] Authentication flow
- [ ] CRUD operations for main features
- [ ] Multi-step workflows
- [ ] Error scenarios
- [ ] Mobile responsiveness (optional)

**Best Practices:**
- [ ] Tests are isolated and independent
- [ ] Tests have clear, descriptive names
- [ ] AAA pattern used consistently
- [ ] Mocks used for external dependencies
- [ ] Async operations handled properly
- [ ] Edge cases covered

## Next Steps

- [Deployment Guide](./deployment.md) - Deploy with confidence after testing
- [Adding Features](./adding-feature.md) - Build features with TDD

## Reference

- **Vitest Docs:** https://vitest.dev
- **React Testing Library:** https://testing-library.com/react
- **Playwright Docs:** https://playwright.dev
- **Test Files:** `/project/src/**/__tests__/` and `/project/tests/e2e/`
