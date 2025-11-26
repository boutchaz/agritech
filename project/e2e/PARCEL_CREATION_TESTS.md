# Playwright Parcel Creation Tests

## Overview
Automated end-to-end tests for parcel creation on the AgriTech Dashboard production site using Playwright.

## Test File
`e2e/parcel-creation-production.spec.ts`

## Prerequisites

1. **Playwright installed** (already done ✅)
2. **Test credentials** - Set environment variables or use defaults:
   ```bash
   export TEST_USER_EMAIL="your-email@example.com"
   export TEST_USER_PASSWORD="your-password"
   ```

## Running the Tests

### 1. Run All Parcel Creation Tests
```bash
npm run test:e2e -- parcel-creation-production
```

### 2. Run in Headed Mode (See Browser)
```bash
npm run test:e2e:headed -- parcel-creation-production
```

### 3. Run in UI Mode (Interactive)
```bash
npm run test:e2e:ui -- parcel-creation-production
```

### 4. Run in Debug Mode
```bash
npm run test:e2e:debug -- parcel-creation-production
```

### 5. Run Specific Test
```bash
npm run test:e2e -- parcel-creation-production -g "should create a new parcel successfully"
```

## Test Scenarios

### 1. **Direct Parcel Creation**
- Navigates to `/parcels`
- Selects a farm (if needed)
- Clicks "Add Parcel" button
- Fills in parcel form or draws on map
- Submits and verifies creation

### 2. **Farm Hierarchy Flow**
- Navigates to `/farm-hierarchy`
- Clicks on farm details
- Opens parcel management modal
- Clicks "Add Parcel"
- Redirects to parcels page for creation

### 3. **Form Validation**
- Tests required field validation
- Attempts to submit empty form
- Verifies error messages appear

## Test Structure

```typescript
test.describe('Parcel Creation - Production', () => {
  test.beforeEach(async ({ page }) => {
    // Login to production site
    // Navigate to starting page
  });

  test('should create a new parcel successfully', async ({ page }) => {
    // Main parcel creation test
  });

  test('should navigate to farm hierarchy and create parcel from there', async ({ page }) => {
    // Alternative creation flow
  });

  test('should validate required fields in parcel form', async ({ page }) => {
    // Validation testing
  });
});
```

## Helper Functions

### `fillParcelForm(page)`
Fills in the parcel creation form with test data:
- Name: `Test Parcel {timestamp}`
- Area: `5.5` hectares
- Description: Auto-generated
- Crop category: First available option

### `createParcelOnMap(page)`
Creates a parcel by drawing on the map:
- Waits for map to load
- Clicks draw button
- Draws a rectangular polygon
- Fills in the form after drawing

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_USER_EMAIL` | Login email | `zakaria.boutchamir@gmail.com` |
| `TEST_USER_PASSWORD` | Login password | `boutchaz` |

## Production URL
Tests run against: `https://agritech-dashboard.thebzlab.online`

## Timeouts
- Default test timeout: 2 minutes (120000ms)
- Login timeout: 30 seconds
- Page load timeout: 15 seconds
- Network idle timeout: 10 seconds

## Screenshots & Videos
- Screenshots: Captured on failure
- Videos: Retained on failure
- Reports: Generated in `playwright-report/`

## Viewing Test Reports

After running tests:
```bash
npm run test:e2e:report
```

This opens an HTML report showing:
- Test results
- Screenshots
- Videos
- Traces
- Network logs

## Debugging Failed Tests

1. **Run in headed mode** to see what's happening:
   ```bash
   npm run test:e2e:headed -- parcel-creation-production
   ```

2. **Use debug mode** for step-by-step execution:
   ```bash
   npm run test:e2e:debug -- parcel-creation-production
   ```

3. **Check screenshots** in `test-results/` directory

4. **View trace** in Playwright UI:
   ```bash
   npx playwright show-trace test-results/.../trace.zip
   ```

## Common Issues & Solutions

### Issue: Login fails
**Solution**: Check credentials in environment variables or update defaults in test file

### Issue: Elements not found
**Solution**: 
- Check if selectors match production site
- Increase timeouts if site is slow
- Verify test data IDs are present in production

### Issue: Map drawing doesn't work
**Solution**:
- Ensure Leaflet map is fully loaded
- Check if drawing tools are enabled
- Verify map container has correct dimensions

### Issue: Form submission fails
**Solution**:
- Check required fields are filled
- Verify API endpoints are accessible
- Check network tab for errors

## Customization

### Update Test Credentials
Edit the test file:
```typescript
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'your-email@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'your-password';
```

### Change Production URL
Update all `page.goto()` calls:
```typescript
await page.goto('https://your-production-url.com/parcels');
```

### Modify Parcel Data
Edit `fillParcelForm()` function:
```typescript
const parcelName = `Custom Name ${timestamp}`;
await areaInput.fill('10.0'); // Different area
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
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e -- parcel-creation-production
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Use data-testid attributes** in production code for reliable selectors
2. **Wait for network idle** before interacting with elements
3. **Use explicit waits** instead of arbitrary timeouts
4. **Clean up test data** after tests complete
5. **Run tests in isolation** - each test should be independent
6. **Use environment variables** for sensitive data
7. **Keep tests maintainable** - use helper functions

## Next Steps

1. **Add more test scenarios**:
   - Edit parcel
   - Delete parcel
   - Bulk operations
   - Error handling

2. **Improve selectors**:
   - Add data-testid attributes to production code
   - Use more specific selectors

3. **Add visual regression testing**:
   - Compare screenshots
   - Detect UI changes

4. **Integrate with CI/CD**:
   - Run on every commit
   - Block merges on test failures

## Support

For issues or questions:
1. Check Playwright documentation: https://playwright.dev
2. Review test logs and screenshots
3. Run in debug mode for step-by-step execution
