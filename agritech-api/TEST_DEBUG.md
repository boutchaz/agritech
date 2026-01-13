# Debug Test Execution Issues

## Problem: Only 3 tests running instead of expected ~100+

## Possible Causes:

1. **Jest Dependencies Issue**
   - Error: `Cannot find module '@jest/test-sequencer'`
   - Solution: Reinstall Jest dependencies
   ```bash
   cd agritech-api
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Test Parameterization Not Working**
   - The file uses `it.each()` which should create multiple tests
   - `SUPPORTED_COUNTRIES` has 6 items, so each `it.each()` should create 6 tests
   - Check if Jest version supports `it.each()` properly

3. **Tests Failing Early**
   - If tests fail in `beforeEach`, subsequent tests won't run
   - Check for errors in test setup

4. **Jest Configuration Issues**
   - Check if `bail: true` is set somewhere
   - Check if `maxWorkers` is too low
   - Check if `testTimeout` is too short

## How to Debug:

1. **Run with verbose output:**
   ```bash
   npm test -- --verbose accounts.service.spec.ts
   ```

2. **Run a single test to verify setup:**
   ```bash
   npm test -- -t "should return all 6 supported countries"
   ```

3. **Check test count:**
   ```bash
   npm test -- --listTests | grep accounts.service.spec.ts
   npm test -- --listTests --findRelatedTests src/modules/accounts/accounts.service.spec.ts
   ```

4. **Run with no cache:**
   ```bash
   npm test -- --no-cache accounts.service.spec.ts
   ```

5. **Check for test.only or describe.only:**
   ```bash
   grep -n "\.only\|describe\.only\|it\.only" src/modules/accounts/accounts.service.spec.ts
   ```

## Expected Test Count:

Based on the file structure:
- `SUPPORTED_COUNTRIES` = 6 countries
- Multiple `it.each(SUPPORTED_COUNTRIES)` blocks = ~18-24 tests from parameterized tests
- Individual tests = ~50+ tests
- **Total expected: ~70-100+ tests**

If only 3 are running, something is wrong with:
- Jest installation
- Test parameterization
- Test execution stopping early
