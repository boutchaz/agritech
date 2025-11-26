# Playwright E2E Tests - Quick Start

## 🚀 Get Started in 3 Steps

### Step 1: Install Browsers (First Time Only)
```bash
cd project
npx playwright install
```

### Step 2: Update Test Credentials
Edit `e2e/fixtures/auth.ts` with your test user:
```typescript
const email = process.env.TEST_USER_EMAIL || 'your-test-email@example.com';
const password = process.env.TEST_USER_PASSWORD || 'your-test-password';
```

### Step 3: Run Tests
```bash
yarn test:e2e:ui
```

That's it! 🎉

---

## 📝 Common Commands

| Command | Description |
|---------|-------------|
| `yarn test:e2e` | Run all tests (headless) |
| `yarn test:e2e:ui` | Run tests in UI mode (recommended) |
| `yarn test:e2e:headed` | Run tests with visible browser |
| `yarn test:e2e:debug` | Debug mode with step-through |
| `yarn test:e2e:report` | View HTML test report |

---

## 📂 What's Tested

### Farm Hierarchy Page (`/farm-hierarchy`)
✅ Load page
✅ Display farms list
✅ Create new farm
✅ Edit farm
✅ Delete farm
✅ Search/filter farms
✅ View farm details
✅ Toggle grid/list view

**Total: 11 tests**

### Parcels Page (`/parcels`)
✅ Load page
✅ Display parcels list
✅ Create new parcel
✅ Edit parcel
✅ Delete parcel
✅ Search/filter parcels
✅ View parcel details
✅ Validate forms
✅ Check API headers

**Total: 15 tests**

---

## 🎯 File Structure

```
project/
├── e2e/
│   ├── farm-hierarchy.spec.ts   ← Farm tests
│   ├── parcels.spec.ts          ← Parcel tests
│   ├── fixtures/
│   │   └── auth.ts              ← Login helper
│   └── utils/
│       └── test-helpers.ts      ← Test utilities
└── playwright.config.ts         ← Configuration
```

---

## 🔧 Quick Examples

### Run Specific Test File
```bash
yarn test:e2e e2e/farm-hierarchy.spec.ts
yarn test:e2e e2e/parcels.spec.ts
```

### Run Single Test
```bash
yarn test:e2e -g "should create a new farm"
```

### Debug Failing Test
```bash
yarn test:e2e:debug e2e/farm-hierarchy.spec.ts
```

### Run in Chrome Only
```bash
yarn test:e2e --project=chromium
```

---

## 🐛 Troubleshooting

### Tests timeout?
- Ensure dev server is running (`yarn dev`)
- Or let Playwright start it automatically (already configured)

### Authentication fails?
- Update credentials in `e2e/fixtures/auth.ts`
- Check login form selectors match your app

### Can't find elements?
- Add `data-testid` attributes to your components
- Use Playwright Inspector: `yarn test:e2e:debug`

---

## 📚 Full Documentation

See [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) for:
- Complete setup guide
- All available helpers
- Best practices
- CI/CD integration
- Advanced debugging

---

## ✨ Features

✅ **Auto-login** - Tests start authenticated
✅ **API waiting** - Smart waits for network calls
✅ **Screenshots** - Auto-capture on failure
✅ **Videos** - Record failed test runs
✅ **Traces** - Full timeline for debugging
✅ **Multiple browsers** - Chrome, Firefox, Safari
✅ **Parallel execution** - Fast test runs

---

## 📊 Test Report

After running tests:
```bash
yarn test:e2e:report
```

Shows:
- ✅ Passed tests
- ❌ Failed tests
- 📸 Screenshots
- 🎥 Videos
- 📝 Traces

---

## 🎨 UI Mode (Recommended)

Best way to work with tests:
```bash
yarn test:e2e:ui
```

Features:
- Run tests individually
- Watch execution in real-time
- Time-travel debugging
- Edit tests and re-run
- Visual test picker

---

## 🚦 CI/CD Ready

Tests are configured for CI/CD:
- Retry on failure (2x in CI)
- HTML reports generated
- Screenshots/videos saved
- Parallel execution disabled in CI

Just add to your GitHub Actions or CI pipeline!

---

**Need help?** Check [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)
