-- AgriTech Desktop SQLite Schema
-- Mirrors Supabase tables for offline usage

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    currency_code TEXT DEFAULT 'MAD',
    timezone TEXT DEFAULT 'Africa/Casablanca',
    language TEXT DEFAULT 'en',
    is_active INTEGER DEFAULT 1,
    onboarding_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL,
    permissions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'Africa/Casablanca',
    language TEXT DEFAULT 'en',
    password_set INTEGER DEFAULT 0,
    onboarding_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organization_users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES user_profiles(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    size REAL,
    size_unit TEXT DEFAULT 'hectares',
    manager_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS parcels (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    organization_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    area REAL,
    area_unit TEXT DEFAULT 'hectares',
    boundary TEXT,
    calculated_area REAL,
    perimeter REAL,
    soil_type TEXT,
    irrigation_type TEXT,
    crop_category TEXT,
    crop_type TEXT,
    variety TEXT,
    planting_system TEXT,
    spacing TEXT,
    density_per_hectare REAL,
    plant_count INTEGER,
    planting_date TEXT,
    planting_year INTEGER,
    rootstock TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    national_id TEXT,
    date_of_birth TEXT,
    hire_date TEXT,
    employment_type TEXT,
    daily_rate REAL,
    hourly_rate REAL,
    monthly_salary REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT,
    parcel_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    completed_at TEXT,
    assigned_to TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

CREATE TABLE IF NOT EXISTS harvests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    parcel_id TEXT,
    harvest_date TEXT NOT NULL,
    quantity REAL NOT NULL,
    quantity_unit TEXT DEFAULT 'kg',
    quality_grade TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    parent_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (parent_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    reference TEXT,
    description TEXT,
    status TEXT DEFAULT 'draft',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    customer_id TEXT,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    supplier_id TEXT,
    po_number TEXT NOT NULL,
    order_date TEXT NOT NULL,
    expected_date TEXT,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    customer_id TEXT,
    order_number TEXT NOT NULL,
    order_date TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    category TEXT,
    unit TEXT DEFAULT 'unit',
    unit_price REAL DEFAULT 0,
    reorder_level REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS stock_entries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    warehouse_id TEXT,
    quantity REAL NOT NULL,
    entry_type TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    entry_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
);

CREATE TABLE IF NOT EXISTS local_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS import_metadata (
    id TEXT PRIMARY KEY,
    export_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    source_org_id TEXT NOT NULL,
    imported_at TEXT DEFAULT (datetime('now')),
    passphrase_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_parcels_farm ON parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_parcels_org ON parcels(organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_org ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_farm ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_harvests_org ON harvests(organization_id);
CREATE INDEX IF NOT EXISTS idx_harvests_farm ON harvests(farm_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user ON organization_users(user_id);
