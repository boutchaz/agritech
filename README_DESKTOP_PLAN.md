# Desktop App Plan - AgriTech Platform

> Standalone desktop version using Tauri, with full org data export/import and offline-first architecture.

---

## Overview

This document outlines the plan to create a **standalone desktop application** for the AgriTech platform. The desktop app will:

- **Reuse the existing codebase** (same React/Vite frontend)
- **Export full organization data** from the SaaS version
- **Run fully standalone** (no internet required after import)
- **Support macOS, Windows, and Linux**

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| Desktop Runtime | **Tauri** (Rust backend, native WebView) |
| Data Export Scope | **Full organization** (all tables, assets, users) |
| Offline Mode | **Fully standalone** (no sync back to SaaS) |
| Local Database | **SQLite** (encrypted at rest) |
| Auth (Offline) | **Password-based** (local login against SQLite) |
| Maps/Satellite | **Offline cached** (pre-exported tile bundles) |
| Export Encryption | **Passphrase-based** (AES-GCM) |
| Desktop Updates | **Manual** (download portal) |
| Target Platforms | **macOS, Windows, Linux** |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Desktop App (Tauri)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Frontend (same codebase)          │   │
│  │  - Vite build                                        │   │
│  │  - TanStack Query hooks                              │   │
│  │  - CASL authorization                                │   │
│  │  - i18n (en/fr/ar)                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                   VITE_RUNTIME=desktop                      │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Data Abstraction Layer                  │   │
│  │  - api-client.ts routes to Tauri commands            │   │
│  │  - auth-provider uses local auth                     │   │
│  │  - map components use local tile server              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Tauri Backend (Rust)                    │   │
│  │  - SQLite database (encrypted)                       │   │
│  │  - CRUD commands                                     │   │
│  │  - File system access                                │   │
│  │  - Import/export handlers                            │   │
│  │  - Local tile server                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Local Storage                           │   │
│  │  - SQLite DB: app_data/agritech.db                   │   │
│  │  - Assets: app_data/assets/                          │   │
│  │  - Map tiles: app_data/tiles/                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Tauri Shell Setup

**Goal**: Wrap the existing Vite app in a Tauri shell without changing any functionality.

### Tasks

1. **Install Tauri CLI and dependencies**
   ```bash
   cd project
   npm install --save-dev @tauri-apps/cli @tauri-apps/api
   ```

2. **Initialize Tauri project**
   ```bash
   npx tauri init
   ```
   - App name: `AgriTech Desktop`
   - Window title: `AgriTech`
   - Dev server URL: `http://localhost:5173`
   - Build output: `../dist`

3. **Configure `tauri.conf.json`**
   - Set bundle identifier: `com.agritech.desktop`
   - Configure window size: 1280x800, resizable
   - Set app icons for all platforms
   - Configure build targets: macOS (.dmg, .app), Windows (.msi, .exe), Linux (.deb, .AppImage)

4. **Add npm scripts**
   ```json
   {
     "tauri:dev": "tauri dev",
     "tauri:build": "tauri build",
     "tauri:build:mac": "tauri build --target universal-apple-darwin",
     "tauri:build:win": "tauri build --target x86_64-pc-windows-msvc",
     "tauri:build:linux": "tauri build --target x86_64-unknown-linux-gnu"
   }
   ```

5. **Verify the app runs**
   ```bash
   npm run tauri:dev
   ```

### Files Created/Modified

| File | Action |
|------|--------|
| `project/src-tauri/` | New directory (Tauri Rust backend) |
| `project/src-tauri/Cargo.toml` | Rust dependencies |
| `project/src-tauri/tauri.conf.json` | Tauri configuration |
| `project/src-tauri/src/main.rs` | Rust entry point |
| `project/package.json` | Add Tauri deps and scripts |

### Success Criteria

- [ ] `npm run tauri:dev` launches desktop window with the web app
- [ ] Hot reload works during development
- [ ] `npm run tauri:build` produces installable binaries

---

## Phase 2: Runtime Detection & Switching

**Goal**: Add ability to detect desktop vs web runtime and switch data sources accordingly.

### Tasks

1. **Add runtime environment variable**
   - Create `project/src/lib/runtime.ts`
   ```typescript
   export const isDesktop = import.meta.env.VITE_RUNTIME === 'desktop';
   export const isWeb = !isDesktop;
   ```

2. **Create Tauri API bridge**
   - Create `project/src/lib/tauri-bridge.ts`
   - Wrapper for `@tauri-apps/api` invoke calls
   - Type-safe command definitions

3. **Update Vite config for desktop builds**
   - Add `VITE_RUNTIME=desktop` for Tauri builds
   - Configure in `vite.config.ts`

4. **Create data provider abstraction**
   - Create `project/src/lib/data-provider.ts`
   - Interface that both web (API) and desktop (Tauri) implement
   - Hooks call data provider, not API directly

### Files Created/Modified

| File | Action |
|------|--------|
| `project/src/lib/runtime.ts` | New - runtime detection |
| `project/src/lib/tauri-bridge.ts` | New - Tauri command wrapper |
| `project/src/lib/data-provider.ts` | New - data abstraction |
| `project/vite.config.ts` | Add desktop build config |
| `project/.env.desktop` | Desktop environment variables |

### Success Criteria

- [ ] `isDesktop` correctly detects Tauri environment
- [ ] Web mode continues to work unchanged
- [ ] Desktop mode can call Tauri commands

---

## Phase 3: Local Database (SQLite)

**Goal**: Implement SQLite storage with schema matching Supabase tables.

### Tasks

1. **Add SQLite dependencies to Rust backend**
   ```toml
   # Cargo.toml
   [dependencies]
   rusqlite = { version = "0.31", features = ["bundled"] }
   sqlcipher = "0.1"  # For encryption
   serde = { version = "1.0", features = ["derive"] }
   serde_json = "1.0"
   ```

2. **Create database schema**
   - Mirror all Supabase tables used by the app:
     - `organizations`
     - `organization_users`
     - `user_profiles`
     - `roles`
     - `farms`
     - `parcels`
     - `workers`
     - `tasks`
     - `harvests`
     - `analyses`
     - `accounts`
     - `journal_entries`
     - `invoices`
     - `purchase_orders`
     - `sales_orders`
     - `inventory_items`
     - `stock_entries`
     - `customers`
     - `suppliers`
     - `subscriptions`
     - ... (all other tables)

3. **Implement Tauri commands for CRUD**
   ```rust
   #[tauri::command]
   fn get_farms(org_id: String) -> Result<Vec<Farm>, String>

   #[tauri::command]
   fn create_farm(farm: CreateFarmDto) -> Result<Farm, String>

   #[tauri::command]
   fn update_farm(id: String, farm: UpdateFarmDto) -> Result<Farm, String>

   #[tauri::command]
   fn delete_farm(id: String) -> Result<(), String>
   ```

4. **Create TypeScript types for commands**
   - Generate from Rust types or manually sync

5. **Implement desktop data provider**
   - `project/src/lib/desktop-data-provider.ts`
   - Calls Tauri commands instead of HTTP API

### Files Created/Modified

| File | Action |
|------|--------|
| `project/src-tauri/src/db/mod.rs` | Database module |
| `project/src-tauri/src/db/schema.sql` | SQLite schema |
| `project/src-tauri/src/db/migrations/` | Schema migrations |
| `project/src-tauri/src/commands/` | Tauri commands |
| `project/src/lib/desktop-data-provider.ts` | Desktop data provider |

### Success Criteria

- [ ] SQLite database created on first launch
- [ ] All CRUD operations work via Tauri commands
- [ ] Data persists between app restarts
- [ ] Database is encrypted at rest

---

## Phase 4: Export System (SaaS Side)

**Goal**: Build org-level data export from the SaaS platform.

### Tasks

1. **Create export API endpoint**
   - `POST /api/v1/organizations/:id/export`
   - Requires `organization_admin` role
   - Returns download URL for export bundle

2. **Build export job**
   - Query all org-scoped tables
   - Include related assets (files, images)
   - Generate manifest with:
     - Export version
     - Schema version
     - Organization ID
     - Timestamp
     - Checksums

3. **Package export bundle**
   - Structure:
     ```
     export-{org_id}-{timestamp}.agritech
     ├── manifest.json
     ├── data/
     │   ├── organizations.json
     │   ├── farms.json
     │   ├── parcels.json
     │   ├── ... (all tables)
     ├── assets/
     │   ├── images/
     │   ├── documents/
     │   └── reports/
     └── tiles/
         └── {farm_id}/
             └── {z}/{x}/{y}.png
     ```

4. **Encrypt bundle**
   - Prompt user for passphrase
   - Use AES-256-GCM encryption
   - Store encrypted as `.agritech` file

5. **Add export UI**
   - Settings > Organization > Export Data
   - Progress indicator
   - Download button

### Files Created/Modified

| File | Action |
|------|--------|
| `agritech-api/src/modules/export/` | New module |
| `agritech-api/src/modules/export/export.controller.ts` | Export endpoint |
| `agritech-api/src/modules/export/export.service.ts` | Export logic |
| `project/src/components/Settings/ExportData.tsx` | Export UI |

### Success Criteria

- [ ] Export produces valid encrypted bundle
- [ ] All org data included
- [ ] Assets properly packaged
- [ ] Map tiles exported for all farms

---

## Phase 5: Import System (Desktop Side)

**Goal**: Import exported bundle into desktop app.

### Tasks

1. **Create import wizard UI**
   - File picker for `.agritech` file
   - Passphrase input
   - Validation status display
   - Import progress

2. **Implement import flow in Rust**
   ```rust
   #[tauri::command]
   fn import_bundle(path: String, passphrase: String) -> Result<ImportResult, String>
   ```
   - Decrypt bundle
   - Validate manifest
   - Check schema compatibility
   - Run migrations if needed
   - Import data into SQLite
   - Extract assets to app data directory

3. **Handle schema migrations**
   - Compare export schema version with app schema version
   - Run migration scripts if needed
   - Fail gracefully with clear error if incompatible

4. **Import assets**
   - Copy images/documents to `app_data/assets/`
   - Update file paths in database
   - Copy map tiles to `app_data/tiles/`

5. **Post-import validation**
   - Verify data integrity
   - Check foreign key relationships
   - Report any issues

### Files Created/Modified

| File | Action |
|------|--------|
| `project/src/routes/import.tsx` | Import wizard route |
| `project/src/components/Import/ImportWizard.tsx` | Import UI |
| `project/src-tauri/src/import/mod.rs` | Import module |
| `project/src-tauri/src/import/decrypt.rs` | Decryption |
| `project/src-tauri/src/import/migrate.rs` | Data migration |

### Success Criteria

- [ ] Import wizard guides user through process
- [ ] Wrong passphrase shows clear error
- [ ] Import completes with success message
- [ ] All data accessible after import
- [ ] App fully functional offline

---

## Phase 6: Offline Authentication

**Goal**: Password-based local authentication.

### Tasks

1. **Export user credentials**
   - Include salted password hashes in export
   - Or generate new local passwords on import

2. **Create local login screen**
   - Detect desktop mode
   - Show simplified login (email + password only)
   - No OAuth, no "forgot password" (local only)

3. **Implement local auth in Rust**
   ```rust
   #[tauri::command]
   fn local_login(email: String, password: String) -> Result<LocalSession, String>

   #[tauri::command]
   fn local_logout() -> Result<(), String>

   #[tauri::command]
   fn get_current_user() -> Result<Option<LocalUser>, String>
   ```

4. **Create local auth provider**
   - `project/src/components/LocalAuthProvider.tsx`
   - Replace `MultiTenantAuthProvider` in desktop mode
   - Same interface, different implementation

5. **Enforce CASL rules locally**
   - Load roles from SQLite
   - Build ability using imported permissions
   - Same CASL rules apply offline

### Files Created/Modified

| File | Action |
|------|--------|
| `project/src/components/LocalAuthProvider.tsx` | Local auth provider |
| `project/src/routes/(auth)/local-login.tsx` | Local login page |
| `project/src-tauri/src/auth/mod.rs` | Auth commands |

### Success Criteria

- [ ] Local login works with imported credentials
- [ ] Session persists between app restarts
- [ ] Logout clears session
- [ ] Role-based access enforced offline

---

## Phase 7: Offline Maps & Satellite

**Goal**: Serve cached map tiles locally.

### Tasks

1. **Export map tiles for farms**
   - Calculate bounding box for each farm
   - Download tiles for zoom levels 10-18
   - Store as MBTiles or file tree

2. **Implement local tile server**
   - Tauri command to serve tiles
   - Or use Tauri's asset protocol

3. **Configure map components**
   - Detect desktop mode
   - Point tile URLs to local source
   - Fallback gracefully if tiles missing

4. **Handle satellite imagery**
   - Export latest satellite snapshots
   - Store as static images
   - Display cached images in desktop mode

### Files Created/Modified

| File | Action |
|------|--------|
| `project/src/components/Map/OfflineTileLayer.tsx` | Offline tile layer |
| `project/src-tauri/src/tiles/mod.rs` | Tile server |
| `agritech-api/src/modules/export/tiles.service.ts` | Tile export |

### Success Criteria

- [ ] Maps render offline
- [ ] Zoom/pan works smoothly
- [ ] Farm boundaries display correctly
- [ ] Satellite imagery available for parcels

---

## Phase 8: Build & Distribution

**Goal**: Produce signed installers for all platforms.

### Tasks

1. **Configure code signing**
   - macOS: Apple Developer certificate
   - Windows: Code signing certificate
   - Linux: GPG signing

2. **Set up build pipelines**
   - GitHub Actions or similar
   - Build for all three platforms
   - Upload artifacts

3. **Create download portal**
   - Static page with download links
   - Version history
   - System requirements

4. **Implement update checker**
   - Settings > About > Check for Updates
   - Compare local version with remote
   - Link to download page

5. **Create installer assets**
   - App icons (all sizes)
   - DMG background (macOS)
   - Installer graphics (Windows)

### Files Created/Modified

| File | Action |
|------|--------|
| `.github/workflows/desktop-build.yml` | Build pipeline |
| `project/src-tauri/icons/` | App icons |
| `project/src/components/Settings/About.tsx` | Update checker UI |

### Success Criteria

- [ ] Signed installers for macOS, Windows, Linux
- [ ] Installation works on each platform
- [ ] Update checker shows available updates
- [ ] Download portal accessible

---

## Phase 9: Testing & QA

**Goal**: Validate all offline functionality.

### Tasks

1. **Create test dataset**
   - Sample organization with full data
   - Various user roles
   - Farm with parcels and boundaries

2. **Export/import round-trip tests**
   - Export from SaaS
   - Import to desktop
   - Verify all data present

3. **Offline functionality tests**
   - Authentication
   - CRUD operations (all modules)
   - Reports generation
   - Map rendering
   - File attachments

4. **Cross-platform testing**
   - macOS (Intel + Apple Silicon)
   - Windows 10/11
   - Ubuntu/Debian

5. **Performance testing**
   - Large org export (1000+ parcels)
   - Import time benchmarks
   - App startup time

### Success Criteria

- [ ] All CRUD operations work offline
- [ ] No data loss during export/import
- [ ] App performs well on all platforms
- [ ] No regressions in web version

---

## Timeline (Estimated)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Tauri Shell | 1 week | None |
| Phase 2: Runtime Switch | 1 week | Phase 1 |
| Phase 3: SQLite Layer | 2 weeks | Phase 2 |
| Phase 4: Export System | 2 weeks | Phase 3 |
| Phase 5: Import System | 2 weeks | Phase 3, 4 |
| Phase 6: Offline Auth | 1 week | Phase 5 |
| Phase 7: Offline Maps | 1 week | Phase 5 |
| Phase 8: Build & Dist | 1 week | Phase 6, 7 |
| Phase 9: Testing | 2 weeks | Phase 8 |

**Total: ~13 weeks**

---

## File Structure (Final)

```
project/
├── src/
│   ├── lib/
│   │   ├── runtime.ts              # Runtime detection
│   │   ├── tauri-bridge.ts         # Tauri API wrapper
│   │   ├── data-provider.ts        # Data abstraction interface
│   │   ├── web-data-provider.ts    # Web implementation
│   │   ├── desktop-data-provider.ts # Desktop implementation
│   │   └── ...
│   ├── components/
│   │   ├── LocalAuthProvider.tsx   # Desktop auth provider
│   │   ├── Import/
│   │   │   └── ImportWizard.tsx    # Import UI
│   │   ├── Map/
│   │   │   └── OfflineTileLayer.tsx # Offline maps
│   │   └── ...
│   └── routes/
│       ├── (auth)/
│       │   └── local-login.tsx     # Desktop login
│       └── import.tsx              # Import wizard route
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── icons/
│   └── src/
│       ├── main.rs
│       ├── db/
│       │   ├── mod.rs
│       │   ├── schema.sql
│       │   └── migrations/
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── farms.rs
│       │   ├── parcels.rs
│       │   └── ...
│       ├── auth/
│       │   └── mod.rs
│       ├── import/
│       │   ├── mod.rs
│       │   ├── decrypt.rs
│       │   └── migrate.rs
│       └── tiles/
│           └── mod.rs
└── .env.desktop
```

---

## Security Considerations

1. **Export encryption**: AES-256-GCM with user passphrase
2. **Database encryption**: SQLCipher for SQLite at rest
3. **No secrets in bundle**: API keys, service accounts excluded
4. **Local-only auth**: No tokens transmitted
5. **Code signing**: All installers signed

---

## Limitations (Desktop vs SaaS)

| Feature | SaaS | Desktop |
|---------|------|---------|
| Real-time collaboration | Yes | No |
| Satellite live updates | Yes | Cached only |
| AI reports | Yes | No (requires API) |
| Push notifications | Yes | No |
| Password reset | Yes | No (local only) |
| Multi-device sync | Yes | No |
| Auto-updates | Yes | Manual |

---

## Open Questions

1. Should desktop support re-export (to move to another machine)?
2. Should we support partial imports (specific modules only)?
3. Do we need a "demo mode" without import?
4. Should we add local backup/restore?

---

## Next Steps

1. **Approve this plan**
2. **Begin Phase 1**: Scaffold Tauri shell
3. **Set up development environment** with Rust toolchain
4. **Create tracking issues** for each phase

---

*Last updated: January 2026*
