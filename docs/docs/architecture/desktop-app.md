---
sidebar_position: 4
---

# Desktop App (Tauri)

## Overview

The AgriTech Desktop app is a standalone offline-capable application built with **Tauri v1** (Rust backend + web frontend). It allows users to work without an internet connection by importing organization data bundles exported from the web app.

**Location:** `project/src-tauri/`

## Key Features

- **Offline-first**: Works completely offline with a local SQLite database
- **Data import**: Import encrypted organization data bundles from the web app
- **Full CRUD**: Manage farms, parcels, tasks, workers, harvests, and inventory
- **Local authentication**: Secure bcrypt password hashing for offline login
- **Cross-platform**: Builds for macOS, Windows, and Linux

## Architecture

```
project/src-tauri/
├── src/
│   ├── main.rs           # Tauri app entry point
│   ├── commands/         # Tauri IPC commands (Rust)
│   │   ├── auth.rs       # Local login/logout/setup
│   │   ├── farms.rs      # Farm CRUD operations
│   │   ├── parcels.rs    # Parcel CRUD operations
│   │   ├── organizations.rs
│   │   ├── import.rs     # Bundle import/validation
│   │   └── data.rs       # Generic table operations
│   └── db/
│       ├── mod.rs        # SQLite database initialization
│       └── schema.sql    # Full database schema (35+ tables)
├── Cargo.toml            # Rust dependencies
└── tauri.conf.json       # Tauri configuration
```

## Database

The desktop app uses SQLite and mirrors the cloud database schema with 35+ tables:

| Domain | Tables |
|--------|--------|
| Core | organizations, roles, user_profiles, organization_users |
| Farm | farms, parcels, structures, warehouses, cost_centers |
| Workforce | workers, tasks, task_assignments |
| Harvest | harvest_records, reception_batches |
| Inventory | items, stock_entries |
| Sales | customers, quotes, sales_orders, invoices |
| Purchasing | suppliers, purchase_orders |
| Accounting | accounts, journal_entries, costs, revenues, payments |

## Data Bundle Import

Users export their organization data from the web app as an encrypted bundle and import it into the desktop app:

1. The web app exports farms, parcels, workers, tasks, harvests, inventory, and more
2. The bundle is encrypted with a user-provided passphrase (AES-GCM)
3. The desktop app validates and imports the bundle
4. The user can work offline with full data access

## Rust Dependencies

| Crate | Purpose |
|-------|---------|
| `tauri` v1 | Desktop application framework |
| `rusqlite` | SQLite database access |
| `bcrypt` | Password hashing for local auth |
| `aes-gcm` | Encryption for data bundles |
| `uuid` | ID generation |
| `chrono` | Date and time handling |

## Commands

```bash
# Development (from project/ directory)
pnpm tauri:dev     # Run desktop app with hot-reload

# Production build
pnpm tauri:build   # Build for current platform
```
