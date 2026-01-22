-- AgriTech Desktop SQLite Schema
-- Mirrors Supabase tables for offline usage and data import
-- Version: 2.0 - Extended to support full organization data export/import

-- ============================================
-- CORE TABLES
-- ============================================

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

-- ============================================
-- FARM & PARCEL TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    parent_farm_id TEXT,
    name TEXT NOT NULL,
    location TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    size REAL,
    size_unit TEXT DEFAULT 'hectares',
    description TEXT,
    manager_name TEXT,
    manager_email TEXT,
    status TEXT DEFAULT 'active',
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (parent_farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS parcels (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    organization_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    area REAL,
    area_unit TEXT DEFAULT 'hectares',
    boundary TEXT, -- JSON array of coordinates
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

-- ============================================
-- INFRASTRUCTURE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS structures (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- well, basin, technical_room, stable, etc.
    location TEXT, -- JSON {lat, lng}
    installation_date TEXT,
    condition TEXT, -- excellent, good, fair, poor
    usage TEXT,
    structure_details TEXT, -- JSON for type-specific details
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    capacity REAL,
    capacity_unit TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS cost_centers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parcel_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

-- ============================================
-- WORKER & TASK TABLES
-- ============================================

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
    worker_type TEXT, -- fixed_salary, daily_worker
    position TEXT,
    employment_type TEXT,
    daily_rate REAL,
    hourly_rate REAL,
    monthly_salary REAL,
    payment_method TEXT,
    is_cnss_declared INTEGER DEFAULT 0,
    specialties TEXT, -- JSON array
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
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
    task_type TEXT, -- irrigation, pruning, harvesting, planting, fertilization, pest_control, maintenance
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    assigned_to TEXT,
    scheduled_start TEXT,
    scheduled_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    due_date TEXT,
    completed_date TEXT,
    completion_percentage INTEGER DEFAULT 0,
    estimated_duration REAL,
    actual_duration REAL,
    weather_dependency INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id),
    FOREIGN KEY (assigned_to) REFERENCES workers(id)
);

CREATE TABLE IF NOT EXISTS task_assignments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    assigned_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'assigned',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- ============================================
-- HARVEST & RECEPTION TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS harvest_records (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    parcel_id TEXT,
    harvest_date TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'kg',
    quality_grade TEXT,
    quality_score INTEGER,
    quality_notes TEXT,
    harvest_task_id TEXT,
    workers TEXT, -- JSON array of {worker_id, hours_worked, quantity_picked}
    status TEXT DEFAULT 'harvested', -- harvested, stored, sold, in_delivery
    intended_for TEXT, -- market, processing, storage
    expected_price_per_unit REAL,
    warehouse_id TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id),
    FOREIGN KEY (harvest_task_id) REFERENCES tasks(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS reception_batches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    harvest_id TEXT,
    parcel_id TEXT,
    batch_code TEXT NOT NULL,
    reception_date TEXT NOT NULL,
    reception_time TEXT,
    weight REAL,
    weight_unit TEXT DEFAULT 'kg',
    quantity REAL,
    quantity_unit TEXT DEFAULT 'kg',
    quality_grade TEXT,
    quality_score INTEGER,
    quality_notes TEXT,
    humidity_percentage REAL,
    maturity_level TEXT,
    temperature REAL,
    moisture_content REAL,
    received_by TEXT,
    quality_checked_by TEXT,
    decision TEXT DEFAULT 'pending', -- pending, direct_sale, storage, transformation
    destination_warehouse_id TEXT,
    status TEXT DEFAULT 'received', -- received, quality_checked, decision_made, processed
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (harvest_id) REFERENCES harvest_records(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id),
    FOREIGN KEY (received_by) REFERENCES workers(id),
    FOREIGN KEY (quality_checked_by) REFERENCES workers(id),
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id)
);

-- ============================================
-- INVENTORY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS item_groups (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    default_expense_account_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    item_code TEXT,
    item_name TEXT NOT NULL,
    description TEXT,
    item_group_id TEXT,
    is_stock_item INTEGER DEFAULT 1,
    is_purchase_item INTEGER DEFAULT 1,
    is_sales_item INTEGER DEFAULT 0,
    maintain_stock INTEGER DEFAULT 1,
    default_unit TEXT,
    stock_uom TEXT,
    standard_rate REAL,
    minimum_stock_level REAL,
    has_expiry_date INTEGER DEFAULT 0,
    valuation_method TEXT DEFAULT 'Moving Average',
    default_warehouse_id TEXT,
    default_expense_account_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (item_group_id) REFERENCES item_groups(id),
    FOREIGN KEY (default_warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS stock_entries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    entry_type TEXT NOT NULL, -- purchase, sale, transfer, adjustment
    from_warehouse_id TEXT,
    to_warehouse_id TEXT,
    reference TEXT,
    entry_date TEXT DEFAULT (datetime('now')),
    notes TEXT,
    status TEXT DEFAULT 'draft',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS stock_entry_items (
    id TEXT PRIMARY KEY,
    stock_entry_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL,
    total_amount REAL,
    source_warehouse_id TEXT,
    target_warehouse_id TEXT,
    batch_number TEXT,
    expiry_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id)
);

-- ============================================
-- CUSTOMER & SUPPLIER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    customer_code TEXT,
    name TEXT NOT NULL,
    customer_type TEXT, -- individual, business, government, other
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_id TEXT,
    payment_terms TEXT,
    credit_limit REAL,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    supplier_code TEXT,
    name TEXT NOT NULL,
    supplier_type TEXT, -- wholesaler, manufacturer, distributor
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_id TEXT,
    payment_terms TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ============================================
-- QUOTE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    quote_number TEXT NOT NULL,
    quote_date TEXT NOT NULL,
    valid_until TEXT,
    customer_id TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    payment_terms TEXT,
    delivery_terms TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL,
    line_number INTEGER,
    item_id TEXT,
    item_name TEXT,
    description TEXT,
    quantity REAL NOT NULL,
    unit_of_measure TEXT,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    amount REAL,
    tax_amount REAL,
    line_total REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (quote_id) REFERENCES quotes(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================
-- SALES ORDER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_address TEXT,
    status TEXT DEFAULT 'draft', -- draft, confirmed, shipped, delivered, cancelled
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    stock_issued INTEGER DEFAULT 0,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id TEXT PRIMARY KEY,
    sales_order_id TEXT NOT NULL,
    line_number INTEGER,
    item_id TEXT,
    item_name TEXT,
    description TEXT,
    quantity REAL NOT NULL,
    unit_of_measure TEXT,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    amount REAL,
    tax_amount REAL,
    line_total REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================
-- PURCHASE ORDER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    supplier_contact TEXT,
    status TEXT DEFAULT 'draft', -- draft, confirmed, shipped, received, cancelled
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    stock_received INTEGER DEFAULT 0,
    stock_received_date TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL,
    line_number INTEGER,
    inventory_item_id TEXT,
    item_name TEXT,
    description TEXT,
    quantity REAL NOT NULL,
    unit_of_measure TEXT,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    amount REAL,
    tax_amount REAL,
    line_total REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (inventory_item_id) REFERENCES items(id)
);

-- ============================================
-- INVOICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    invoice_type TEXT NOT NULL, -- sales, purchase
    party_id TEXT,
    party_name TEXT,
    party_type TEXT, -- customer, supplier
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    outstanding_amount REAL DEFAULT 0,
    currency_code TEXT DEFAULT 'MAD',
    status TEXT DEFAULT 'draft', -- draft, submitted, paid, cancelled
    due_date TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    line_number INTEGER,
    item_id TEXT,
    item_name TEXT,
    description TEXT,
    quantity REAL NOT NULL,
    unit_of_measure TEXT,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    amount REAL,
    tax_amount REAL,
    line_total REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================
-- ACCOUNTING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- Asset, Liability, Equity, Income, Expense
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
    entry_number TEXT,
    entry_date TEXT NOT NULL,
    entry_type TEXT, -- revenue, expense, transfer
    description TEXT,
    total_debit REAL DEFAULT 0,
    total_credit REAL DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, posted
    reference TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS journal_items (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    description TEXT,
    parcel_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

-- ============================================
-- FINANCIAL TABLES (Costs & Revenues)
-- ============================================

CREATE TABLE IF NOT EXISTS costs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    parcel_id TEXT,
    cost_type TEXT NOT NULL, -- materials, labor, utilities, equipment, other
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'MAD',
    date TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

CREATE TABLE IF NOT EXISTS revenues (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    parcel_id TEXT,
    revenue_type TEXT NOT NULL, -- harvest, other
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'MAD',
    date TEXT NOT NULL,
    crop_type TEXT,
    quantity REAL,
    unit TEXT,
    price_per_unit REAL,
    description TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

CREATE TABLE IF NOT EXISTS utilities (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    farm_id TEXT,
    parcel_id TEXT,
    type TEXT NOT NULL, -- electricity, water, diesel, gas, internet, phone, other
    provider TEXT,
    account_number TEXT,
    amount REAL NOT NULL,
    consumption_value REAL,
    consumption_unit TEXT,
    billing_date TEXT NOT NULL,
    due_date TEXT,
    payment_status TEXT DEFAULT 'pending', -- pending, paid, overdue
    is_recurring INTEGER DEFAULT 0,
    recurring_frequency TEXT, -- monthly, quarterly, yearly
    notes TEXT,
    cost_per_parcel REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

-- ============================================
-- PAYMENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    payment_number TEXT,
    payment_type TEXT NOT NULL, -- receive, pay
    payment_method TEXT, -- cash, bank_transfer, check
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    party_id TEXT,
    party_name TEXT,
    party_type TEXT, -- customer, supplier
    reference_number TEXT,
    currency_code TEXT DEFAULT 'MAD',
    status TEXT DEFAULT 'draft', -- draft, submitted, reconciled
    remarks TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- ============================================
-- LOCAL SESSION & IMPORT METADATA
-- ============================================

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
    source_org_name TEXT,
    exported_at TEXT,
    imported_at TEXT DEFAULT (datetime('now')),
    passphrase_hash TEXT,
    tables_imported TEXT, -- JSON array of table names
    records_count INTEGER DEFAULT 0
);

-- ============================================
-- INDEXES
-- ============================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_parcels_farm ON parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_parcels_org ON parcels(organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_org ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_farm ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_harvests_org ON harvest_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_harvests_farm ON harvest_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user ON organization_users(user_id);

-- Infrastructure indexes
CREATE INDEX IF NOT EXISTS idx_structures_org ON structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm ON structures(farm_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_items_org ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_item_groups_org ON item_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_org ON stock_entries(organization_id);

-- Customer/Supplier indexes
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_quotes_org ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_org ON sales_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_costs_org ON costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenues_org ON revenues(organization_id);
CREATE INDEX IF NOT EXISTS idx_utilities_org ON utilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);

-- Accounting indexes
CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON journal_entries(organization_id);
