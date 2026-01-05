# E2E Test Suite Documentation

This directory contains comprehensive end-to-end tests for the AgriTech platform using Playwright.

## 📋 Test Files

### Core Test Files

| File | Description |
|------|-------------|
| [`auth.spec.ts`](./auth.spec.ts) | Authentication flow tests (login, logout, session persistence) |
| [`farm-hierarchy.spec.ts`](./farm-hierarchy.spec.ts) | Farm and hierarchy management tests |
| [`complete-user-flow.spec.ts`](./complete-user-flow.spec.ts) | **Complete user journey from registration to harvest** |
| [`parcels.spec.ts`](./parcels.spec.ts) | Parcel management tests |
| [`subscription.spec.ts`](./subscription.spec.ts) | Subscription and billing tests |
| [`workers-management.spec.ts`](./workers-management.spec.ts) | **Workers management tests** (CRUD, assignments, payments) |
| [`tasks-management.spec.ts`](./tasks-management.spec.ts) | **Tasks management tests** (CRUD, completion, time tracking) |
| [`harvests-management.spec.ts`](./harvests-management.spec.ts) | **Harvests management tests** (CRUD, sales, quality control) |
| [`inventory-management.spec.ts`](./inventory-management.spec.ts) | **Inventory/Stock management tests** (CRUD, stock movements) |
| [`deliveries-management.spec.ts`](./deliveries-management.spec.ts) | **Deliveries management tests** (CRUD, tracking, status updates) |
| [`reports-analytics.spec.ts`](./reports-analytics.spec.ts) | **Reports and Analytics tests** (harvest, production, financial, worker reports) |
| [`multi-language.spec.ts`](./multi-language.spec.ts) | **Multi-language support tests** (English, French, Arabic, RTL/LTR) |
| [`responsive-design.spec.ts`](./responsive-design.spec.ts) | **Responsive design tests** (desktop, tablet, mobile, orientation) |
| [`accessibility.spec.ts`](./accessibility.spec.ts) | **Accessibility tests** (WCAG 2.1 AA compliance) |

### Test Utilities

| File | Description |
|------|-------------|
| [`fixtures/auth.ts`](./fixtures/auth.ts) | Authentication fixture for authenticated tests |
| [`utils/test-helpers.ts`](./utils/test-helpers.ts) | Reusable test helper functions |

## 🚀 Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Set up environment variables (create `.env.test`):
```env
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test e2e/complete-user-flow.spec.ts
```

### Run Specific Test

```bash
npx playwright test -g "should complete full user journey"
```

### Run Tests in UI Mode

```bash
npx playwright test --ui
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

### Run Tests with Debugging

```bash
npx playwright test --debug
```

### Run Tests on Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📊 Test Coverage

### Complete User Flow Test Suite

The [`complete-user-flow.spec.ts`](./complete-user-flow.spec.ts) file contains comprehensive tests covering:

#### 1. **User Registration Flow** ✅
- Navigate to registration page
- Fill registration form with unique credentials
- Submit and verify successful registration
- Redirect to organization creation or onboarding

#### 2. **Organization Creation** ✅
- Create new organization
- Set organization name and country
- Verify organization is created successfully

#### 3. **Trial Selection** ✅
- Select trial plan if shown
- Complete trial onboarding flow

#### 4. **Dashboard Navigation** ✅
- Navigate to dashboard
- Verify main content loads
- Check navigation sidebar is visible

#### 5. **Farm Creation** ✅
- Navigate to farm hierarchy page
- Create new farm with unique name
- Verify farm appears in list
- Test form validation

#### 6. **Parcel Creation** ✅
- Navigate to parcels page
- Create new parcel
- Link parcel to farm
- Set parcel area
- Verify parcel is created

#### 7. **Worker Creation** ✅
- Navigate to workers page
- Create new worker
- Set worker details (name, email, type)
- Verify worker is created

#### 8. **Task Management** ✅
- Navigate to tasks page
- Create new task
- Set task type, priority, and description
- Verify task is created

#### 9. **Harvest Creation** ✅
- Navigate to harvests page
- Create new harvest record
- Set harvest date, quantity, and crop
- Verify harvest is created

#### 10. **Inventory/Stock Management** ✅
- Navigate to stock page
- Add new inventory item
- Set item name and quantity
- Verify item is created

#### 11. **Settings Navigation** ✅
- Navigate to settings page
- Verify all settings sections are visible
- Check profile, organization, subscription, and preferences

#### 12. **Logout Flow** ✅
- Click logout button
- Verify redirect to login page
- Confirm session is terminated

### Additional Test Scenarios

#### Session Persistence Test
- Login and verify session persists after page reload
- Test localStorage management

#### Error Handling Test
- Test invalid login credentials
- Test protected route redirects
- Verify appropriate error messages

#### Form Validation Test
- Test required field validation
- Verify error messages display correctly
- Test form submission with invalid data

#### Network Error Handling Test
- Simulate offline mode
- Test graceful error handling
- Verify app doesn't crash on network errors

## 🎯 Test Best Practices

### Test Structure

Each test follows this pattern:

1. **Setup**: Navigate to page, wait for loading
2. **Action**: Perform user action (click, fill form, etc.)
3. **Wait**: Wait for API response or UI update
4. **Assert**: Verify expected outcome

### Selectors

Tests use multiple selector strategies for robustness:

```typescript
// By test ID (preferred)
page.locator('[data-testid="create-farm-button"]')

// By text content
page.locator('button:has-text("Add Farm")')

// By name attribute
page.locator('input[name="farmName"]')

// By placeholder
page.locator('input[placeholder*="Farm" i]')
```

### Helper Functions

The [`test-helpers.ts`](./utils/test-helpers.ts) file provides reusable utilities:

- `waitForAPIResponse()` - Wait for API calls
- `waitForLoadingComplete()` - Wait for loading spinners
- `waitForToast()` - Wait for toast notifications
- `fillFormField()` - Fill form fields
- `clickAndWait()` - Click and wait for navigation/API
- `waitForNetworkIdle()` - Wait for network to settle

## 🔧 Configuration

### Playwright Config

Configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
  ],
});
```

### Environment Variables

Create `.env.test` for test-specific configuration:

```env
# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# API Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001

# Test Configuration
NODE_ENV=test
```

## 📝 Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test';
import { waitForAPIResponse, waitForLoadingComplete } from './utils/test-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/some-page');
    await waitForLoadingComplete(page);

    // Act
    await page.click('[data-testid="some-button"]');

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Test IDs**: Add `data-testid` attributes to elements for reliable selection
2. **Wait for Loading**: Always wait for loading to complete before assertions
3. **Use Helper Functions**: Leverage existing helpers for common operations
4. **Unique Test Data**: Use timestamps to generate unique test data
5. **Clean Up**: Clean up test data after tests (or use test database)
6. **Descriptive Names**: Use clear, descriptive test names
7. **Single Responsibility**: Each test should verify one thing

## 🐛 Debugging

### Screenshots on Failure

Playwright automatically takes screenshots on test failures. They are saved in:
```
test-results/
```

### Traces

Enable trace recording for debugging:
```typescript
use: {
  trace: 'retain-on-failure', // or 'on' for all tests
}
```

View traces:
```bash
npx playwright show-trace test-results/trace.zip
```

### Console Logs

Tests log to console for debugging:
```typescript
console.log('🔍 Debug info:', data);
```

### Step-by-Step Debugging

Run tests in debug mode:
```bash
npx playwright test --debug
```

## 📊 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Use test IDs for element selection
3. Add helper functions to `utils/test-helpers.ts` if needed
4. Update this README with new test descriptions
5. Ensure tests run locally before pushing

## 📞 Support

For issues or questions about E2E tests:
- Check Playwright logs in `test-results/`
- Review screenshots and traces for failures
- Run tests in UI mode for interactive debugging
