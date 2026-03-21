---
sidebar_position: 8
title: "Mobile App Store Publishing"
---

# Mobile App Store Publishing

> Complete guide to building, submitting, and maintaining the AgroGina mobile app on the Apple App Store and Google Play Store using Expo EAS.

## Overview

The mobile app uses **Expo SDK 54** (managed workflow) with **EAS Build** for native builds, **EAS Submit** for store submission, and **EAS Update** for OTA patches. CI/CD is handled via GitHub Actions.

### Infrastructure Files

| File | Purpose |
|------|---------|
| `mobile/eas.json` | Build profiles (dev/preview/production), submit config |
| `mobile/app.json` | App metadata, runtime version, EAS Update URL |
| `.github/workflows/eas-build.yml` | Automated builds on tags + manual dispatch |
| `.github/workflows/eas-update.yml` | OTA updates on push to main |
| `mobile/scripts/bump-version.sh` | Version bump helper + git tag creation |

---

## Prerequisites

### 1. Apple Developer Account

1. Enroll at [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)
2. Choose **Organization** enrollment (requires D-U-N-S number, 1-5 business days)
3. Cost: **$99/year**
4. Once approved, register an App ID with bundle identifier `com.agrogina.field`

### 2. Google Play Console

1. Sign up at [play.google.com/console/signup](https://play.google.com/console/signup)
2. Cost: **$25 one-time**
3. Complete identity verification (2-7 days for organizations)
4. Create a new app listing for "AgroGina"

### 3. Expo Account

1. Create an account at [expo.dev](https://expo.dev)
2. Generate an access token at Account Settings → Access Tokens
3. Add the token as `EXPO_TOKEN` in GitHub repo secrets

---

## EAS Setup

### Initialize EAS

```bash
cd mobile
npx eas-cli login
npx eas-cli init    # generates projectId
```

### Update Placeholders

After running `eas init`, update these placeholders with real values:

**`mobile/app.json`:**
```json
"extra": {
  "eas": {
    "projectId": "REPLACE_WITH_REAL_PROJECT_ID"
  }
},
"updates": {
  "url": "https://u.expo.dev/REPLACE_WITH_REAL_PROJECT_ID"
}
```

**`mobile/eas.json` → `submit.production`:**
```json
"ios": {
  "appleId": "your@email.com",
  "ascAppId": "APP_STORE_CONNECT_APP_ID",
  "appleTeamId": "YOUR_TEAM_ID"
},
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "internal",
  "releaseStatus": "draft"
}
```

:::caution
Never commit `google-service-account.json` to git. It is already in `.gitignore`.
:::

---

## Build Profiles

Defined in `mobile/eas.json`:

| Profile | Use Case | Distribution | Channel |
|---------|----------|-------------|---------|
| `development` | Dev builds with Expo dev client | Internal | `development` |
| `preview` | Internal testing (TestFlight / Internal Track) | Internal | `preview` |
| `production` | Store release | Store | `production` |

### Running Builds Manually

```bash
# Development build (includes dev tools)
eas build --platform all --profile development

# Preview build (for internal testers)
eas build --platform all --profile preview

# Production build (for store submission)
eas build --platform all --profile production
```

---

## OTA Updates (EAS Update)

EAS Update allows pushing JavaScript-only changes without going through store review. Configured via `runtimeVersion` policy in `app.json`.

### How It Works

- `runtimeVersion: { "policy": "appVersion" }` ties updates to the app version
- Updates only apply to builds with matching native version
- Native changes (new permissions, new native modules) require a full build

### Pushing an Update

```bash
# Update preview channel (for internal testers)
eas update --branch preview --message "Fix: harvest date display"

# Update production channel (goes to all production users)
eas update --branch production --message "Fix: critical login bug"
```

:::tip
Use OTA for bug fixes and small UI changes. Native dependency changes still require a full store build.
:::

---

## CI/CD Workflows

### Build Workflow (`.github/workflows/eas-build.yml`)

**Automatic triggers:**
- Push a `v*` tag → production build + auto-submit to both stores

**Manual trigger:**
- Go to Actions → EAS Build & Submit → Run workflow
- Select platform (`all`, `ios`, `android`) and profile

### OTA Update Workflow (`.github/workflows/eas-update.yml`)

**Automatic triggers:**
- Push to `main` that changes files in `mobile/` → OTA update to `preview` channel

**Manual trigger:**
- Go to Actions → EAS Update → Run workflow
- Select branch (`preview` or `production`) and message

### Required GitHub Secrets

| Secret | Source | Required For |
|--------|--------|-------------|
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/accounts) | All workflows |

---

## Release Process

### Standard Release

```bash
cd mobile

# 1. Bump version (creates commit + tag)
./scripts/bump-version.sh patch    # 1.0.0 → 1.0.1
# or: ./scripts/bump-version.sh minor  # 1.0.0 → 1.1.0
# or: ./scripts/bump-version.sh major  # 1.0.0 → 2.0.0

# 2. Push (triggers CI/CD build + submit)
git push origin develop --tags
```

### Hotfix (OTA, no store review)

```bash
# Fix the bug, commit, push to main
git push origin main

# Or manually push to production
eas update --branch production --message "Hotfix: description"
```

### First-Time Submission

The first build on each platform requires special handling:

**Android:**
```bash
eas build --platform android --profile production
# EAS auto-generates a signing keystore — BACK IT UP
eas submit --platform android
# Complete the store listing in Google Play Console
```

**iOS:**
```bash
eas build --platform ios --profile production
# EAS handles provisioning profiles and certificates
eas submit --platform ios
# App appears in TestFlight → submit for App Store review
```

---

## App Store Assets Checklist

### Required Before First Submission

| Asset | iOS Spec | Android Spec |
|-------|----------|-------------|
| **App Icon** | 1024×1024 (no alpha, no rounded corners) | 512×512 (adaptive icon) |
| **Screenshots** | 6.7" (1290×2796), 6.5" (1284×2778) minimum | Phone, 7" tablet, 10" tablet |
| **Feature Graphic** | — | 1024×500 |
| **Privacy Policy** | URL required | URL required |
| **App Description** | EN, FR, AR | EN, FR, AR |
| **Category** | Business / Productivity | Business / Productivity |
| **Age Rating** | 4+ | Everyone |

### Store Listing Metadata

```
App Name: AgroGina
Subtitle: Smart Farm Management
Keywords: agriculture, farming, crop management, harvest, agritech
Support URL: https://agrogina.com/support
Privacy Policy: https://agrogina.com/privacy
```

---

## Troubleshooting

### Build fails with credential errors
```bash
# Reset iOS credentials
eas credentials --platform ios

# Reset Android keystore
eas credentials --platform android
```

### OTA update not appearing on device
- Verify `runtimeVersion` matches between the build and the update
- Check the update channel matches the build profile's channel
- Force-close and reopen the app (updates apply on next launch)

### "Version already exists" on submission
- Bump `buildNumber` (iOS) or `versionCode` (Android) in `app.json`
- Or use `"autoIncrement": true` in `eas.json` production profile (already configured)

---

## Execution Checklist

- [ ] Apple Developer account enrolled and approved
- [ ] Google Play Console account created and verified
- [ ] Expo account created
- [ ] `eas init` run, `projectId` set in `app.json`
- [ ] `updates.url` placeholder replaced in `app.json`
- [ ] `eas.json` submit section filled with real credentials
- [ ] `google-service-account.json` created (not committed)
- [ ] `EXPO_TOKEN` added to GitHub repo secrets
- [ ] App icons and screenshots prepared
- [ ] Privacy policy URL hosted
- [ ] Preview build tested on physical device
- [ ] OTA update tested on preview channel
- [ ] First production build submitted to both stores
- [ ] Store listings completed (description, screenshots, category)
- [ ] Store review passed on both platforms
