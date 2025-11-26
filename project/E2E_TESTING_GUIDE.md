# E2E Testing with Playwright - Complete Guide

## Overview

End-to-end testing setup for AgriTech platform using Playwright to test critical user flows on:
- Farm Hierarchy page (`/farm-hierarchy`)
- Parcels page (`/parcels`)

## Setup

### Prerequisites
✅ **Already installed**:
- Playwright (`@playwright/test`)
- Test dependencies

### Install Browsers

First time setup - install Playwright browsers:

```bash
cd project
npx playwright install
```

This installs Chromium, Firefox, and WebKit browsers.

## Project Structure

```
project/
├── e2e/                          # E2E test directory
│   ├── fixtures/
│   │   └── auth.ts              # Authentication fixtures
│   ├── utils/
│   │   └── test-helpers.ts      # Test utility functions
│   ├── farm-hierarchy.spec.ts   # Farm hierarchy tests
│   └── parcels.spec.ts          # Parcels page tests
├── playwright.config.ts         # Playwright configuration
└── playwright-report/           # Test reports (generated)
```

## Running Tests

### All Tests
```bash
yarn test:e2e
```

### Specific Test File
```bash
yarn test:e2e e2e/farm-hierarchy.spec.ts
yarn test:e2e e2e/parcels.spec.ts
```

### UI Mode (Interactive)
```bash
yarn test:e2e:ui
```
Opens Playwright's UI where you can:
- Run tests individually
- See test execution in real-time
- Debug failed tests
- View traces and screenshots

### Headed Mode (See Browser)
```bash
yarn test:e2e:headed
```
Runs tests with visible browser windows.

### Debug Mode
```bash
yarn test:e2e:debug
```
Step through tests line by line with Playwright Inspector.

### View Test Report
```bash
yarn test:e2e:report
```
Opens HTML report of last test run.

## Test Configuration

### playwright.config.ts

Key settings:
- **Base URL**: `http://localhost:5173`
- **Test Directory**: `./e2e`
- **Browsers**: Chromium (Chrome), Firefox, WebKit (Safari)
- **Dev Server**: Automatically starts with `yarn dev`
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## Authentication Setup

### Current Setup

Tests use an authentication fixture in `e2e/fixtures/auth.ts`:

```typescript
import { test, expect } from './fixtures/auth';

test('my test', async ({ authenticatedPage }) => {
  // Already logged in!
  await authenticatedPage.goto('/farm-hierarchy');
});
```

### Configuration Required

**IMPORTANT**: Update `e2e/fixtures/auth.ts` with your test credentials:

```typescript
// In auth.ts - login() function
const email = process.env.TEST_USER_EMAIL || 'test@example.com';
const password = process.env.TEST_USER_PASSWORD || 'testpassword';
```

**Recommended**: Use environment variables:

```bash
# Create .env.test file
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
TEST_ORGANIZATION_ID=your-org-id
```

Then in `playwright.config.ts`:
```typescript
import { config } from 'dotenv';
config({ path: '.env.test' });
```

## Test Structure

### Farm Hierarchy Tests

**File**: `e2e/farm-hierarchy.spec.ts`

Tests cover:
1. ✅ Page loads successfully
2. ✅ Displays farms list
3. ✅ Shows create farm button
4. ✅ Opens create farm dialog
5. ✅ Creates a new farm
6. ✅ Displays farm details
7. ✅ Filters farms by search
8. ✅ Handles delete farm
9. ✅ Toggles view mode (grid/list)
10. ✅ Validates required fields
11. ✅ Checks network status indicator

**Total**: 11 test cases

### Parcels Tests

**File**: `e2e/parcels.spec.ts`

Tests cover:
1. ✅ Page loads successfully
2. ✅ Displays parcels list
3. ✅ Shows create parcel button
4. ✅ Filters parcels by farm
5. ✅ Opens create parcel dialog
6. ✅ Creates a new parcel
7. ✅ Displays parcel details
8. ✅ Searches parcels
9. ✅ Edits a parcel
10. ✅ Deletes a parcel
11. ✅ Displays parcel area and units
12. ✅ Validates required fields
13. ✅ Displays crop information
14. ✅ Handles empty state
15. ✅ Checks API headers for organization ID

**Total**: 15 test cases

## Test Utilities

### Available Helpers

Located in `e2e/utils/test-helpers.ts`:

#### API Helpers
```typescript
// Wait for API response and get data
const data = await waitForAPIResponse(page, /\/api\/v1\/farms/, async () => {
  await page.click('button');
});

// Wait for multiple APIs
await waitForMultipleAPIs(page, [/farms/, /parcels/], async () => {
  await page.goto('/dashboard');
});
```

#### Form Helpers
```typescript
// Fill form field with validation wait
await fillFormField(page, 'input[name="name"]', 'Test Farm', {
  waitForValidation: true
});

// Click and wait for navigation or API
await clickAndWait(page, 'button', {
  waitForAPI: /\/api\/v1\/farms/
});
```

#### Toast Notifications
```typescript
// Wait for success toast
await waitForToast(page, undefined, 'success');

// Wait for specific message
await waitForToast(page, 'Farm created successfully');

// Dismiss all toasts
await dismissToasts(page);
```

#### Loading States
```typescript
// Wait for all loading spinners to disappear
await waitForLoadingComplete(page);

// Wait for network idle
await waitForNetworkIdle(page);
```

#### Table Helpers
```typescript
// Get row count
const count = await getTableRowCount(page);

// Get cell text
const text = await getTableCellText(page, 1, 2); // row 1, column 2
```

## Writing New Tests

### Template

```typescript
import { test, expect } from './fixtures/auth';
import { waitForLoadingComplete, waitForToast } from './utils/test-helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-page');
    await waitForLoadingComplete(authenticatedPage);
  });

  test('should do something', async ({ authenticatedPage: page }) => {
    // Arrange
    await page.click('button');

    // Act
    await page.fill('input', 'value');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

### Best Practices

#### 1. Use Data Test IDs
```typescript
// ✅ Good - stable selector
await page.click('[data-testid="create-farm-button"]');

// ❌ Avoid - fragile selector
await page.click('.MuiButton-root.css-12345');
```

#### 2. Wait for Elements
```typescript
// ✅ Good - explicit wait
await page.waitForSelector('[role="dialog"]');
await page.click('button');

// ❌ Avoid - no wait
await page.click('button'); // Might fail if not loaded
```

#### 3. Use Locators
```typescript
// ✅ Good - chained locators
const dialog = page.locator('[role="dialog"]');
await dialog.locator('button[type="submit"]').click();

// ❌ Avoid - complex selectors
await page.click('[role="dialog"] button[type="submit"]');
```

#### 4. Isolate Tests
```typescript
// ✅ Good - each test creates its own data
test('create farm', async ({ page }) => {
  const farmName = `Test Farm ${Date.now()}`;
  // ...
});

// ❌ Avoid - tests depend on each other
let sharedFarmId;
test('create farm', async ({ page }) => {
  sharedFarmId = await createFarm();
});
test('delete farm', async ({ page }) => {
  await deleteFarm(sharedFarmId); // Depends on previous test
});
```

#### 5. Clean Up
```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data if needed
  await deleteTestData(page);
});
```

## Debugging Tests

### 1. Run in UI Mode
```bash
yarn test:e2e:ui
```
Best for development - interactive test runner.

### 2. Run in Debug Mode
```bash
yarn test:e2e:debug
```
Step through test line by line.

### 3. View Traces
When test fails:
```bash
yarn test:e2e:report
```
Click on failed test → View trace → See full timeline.

### 4. Add Console Logs
```typescript
test('my test', async ({ page }) => {
  console.log('Current URL:', page.url());

  const text = await page.textContent('h1');
  console.log('Heading:', text);
});
```

### 5. Take Screenshots
```typescript
// Manual screenshot
await page.screenshot({ path: 'debug.png' });

// Auto screenshots on failure (already configured)
```

### 6. Pause Execution
```typescript
test('my test', async ({ page }) => {
  await page.goto('/farm-hierarchy');

  await page.pause(); // Opens Playwright Inspector

  await page.click('button');
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: yarn install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: yarn test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Common Issues

### Issue 1: Tests Fail with "Page not found"

**Solution**: Ensure dev server is running:
```bash
# Terminal 1
yarn dev

# Terminal 2
yarn test:e2e
```

Or use configured webServer (already set up in config).

### Issue 2: Authentication Fails

**Solution**: Update credentials in `e2e/fixtures/auth.ts` or set environment variables.

### Issue 3: Timeouts

**Solution**: Increase timeout in test:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  await page.waitForSelector('.slow-element', { timeout: 30000 });
});
```

### Issue 4: Flaky Tests

**Causes**:
- Network delays
- Animation timings
- Race conditions

**Solutions**:
```typescript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific API
await page.waitForResponse(/\/api\/v1\/farms/);

// Use retry
await expect(async () => {
  const text = await page.textContent('h1');
  expect(text).toContain('Farm');
}).toPass({ timeout: 5000 });
```

## Test Data Management

### Option 1: API Setup
```typescript
test.beforeEach(async ({ page }) => {
  // Create test data via API
  const farmId = await createTestFarm();
  await page.goto(`/parcels?farm=${farmId}`);
});
```

### Option 2: Database Seeding
```bash
# Before tests
yarn db:seed:remote

# Run tests
yarn test:e2e

# After tests
yarn db:clean-remote
```

### Option 3: Test Isolation
```typescript
// Each test creates and cleans up its own data
test('create farm', async ({ page }) => {
  const farmName = `Test ${Date.now()}`;

  // Create
  await createFarm(page, farmName);

  // Test
  await expect(page.locator(`text="${farmName}"`)).toBeVisible();

  // Clean up
  await deleteFarm(page, farmName);
});
```

## Performance Optimization

### Run Tests in Parallel
```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4, // Run 4 tests in parallel
  fullyParallel: true,
});
```

### Reuse Browser Context
```typescript
// For tests that don't need isolation
test.describe.configure({ mode: 'parallel' });
```

### Skip Non-Critical Tests in CI
```typescript
test('visual test', async ({ page }) => {
  test.skip(!!process.env.CI, 'Skip visual tests in CI');
  // ...
});
```

## Reporting

### HTML Report (Default)
```bash
yarn test:e2e:report
```
Opens interactive HTML report.

### JSON Reporter
```typescript
// playwright.config.ts
reporter: [
  ['html'],
  ['json', { outputFile: 'test-results.json' }]
],
```

### Custom Reporter
```bash
yarn test:e2e --reporter=list
yarn test:e2e --reporter=dot
```

## Next Steps

1. ✅ **Update auth credentials** in `e2e/fixtures/auth.ts`
2. ✅ **Run tests locally**: `yarn test:e2e:ui`
3. ✅ **Add data-testid attributes** to your components
4. ✅ **Set up CI/CD** integration
5. ✅ **Write more tests** for other critical flows
6. ✅ **Add visual regression tests** (optional)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-test)

## Summary

✅ **Installed**: Playwright and dependencies
✅ **Configured**: `playwright.config.ts`
✅ **Created**: 26 test cases (11 farm + 15 parcels)
✅ **Utilities**: Authentication, helpers, test utilities
✅ **Scripts**: `test:e2e`, `test:e2e:ui`, `test:e2e:debug`

**Ready to use**: Just update auth credentials and run `yarn test:e2e:ui`!
