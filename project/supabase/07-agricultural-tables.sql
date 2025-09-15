-- Agricultural Tables for Multi-tenant System
-- Run this after the core multi-tenant setup (steps 01-05)

-- Crop Types and Categories
CREATE TABLE IF NOT EXISTS crop_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crop_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID NOT NULL REFERENCES crop_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(type_id, name)
);

CREATE TABLE IF NOT EXISTS crop_varieties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES crop_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    days_to_maturity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Parcels (fields/plots within farms)
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    area_unit TEXT DEFAULT 'hectares',
    location JSONB, -- GeoJSON polygon
    soil_type TEXT,
    irrigation_system TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crops planted in parcels
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    variety_id UUID NOT NULL REFERENCES crop_varieties(id),
    name TEXT NOT NULL,
    planting_date DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    planted_area DECIMAL(10,2),
    expected_yield DECIMAL(10,2),
    actual_yield DECIMAL(10,2),
    yield_unit TEXT DEFAULT 'kg',
    status TEXT CHECK (status IN ('planned', 'planted', 'growing', 'harvested', 'failed')) DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Categories and Templates
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES task_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    estimated_duration INTEGER, -- in minutes
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT, -- cron-like pattern
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES task_categories(id),
    template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    assigned_to TEXT, -- Can be employee name or ID later
    due_date DATE,
    completed_date DATE,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Management
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id),
    subcategory_id UUID REFERENCES product_subcategories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    unit TEXT NOT NULL DEFAULT 'units',
    quantity DECIMAL(10,2) DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    max_stock_level DECIMAL(10,2),
    unit_cost DECIMAL(10,2),
    supplier TEXT,
    expiry_date DATE,
    location TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    description TEXT,
    transaction_date DATE NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic Livestock (simplified)
CREATE TABLE IF NOT EXISTS livestock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- cattle, poultry, etc.
    breed TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    age_months INTEGER,
    health_status TEXT DEFAULT 'healthy',
    notes TEXT,
    acquired_date DATE,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE, -- Custom employee ID
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    department TEXT,
    hire_date DATE,
    salary DECIMAL(10,2),
    status TEXT CHECK (status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day Laborers
CREATE TABLE IF NOT EXISTS day_laborers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    daily_rate DECIMAL(8,2),
    specialties TEXT[],
    availability TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Records
CREATE TABLE IF NOT EXISTS work_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    worker_id UUID, -- References employees or day_laborers
    worker_type TEXT CHECK (worker_type IN ('employee', 'day_laborer')) NOT NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2),
    task_description TEXT NOT NULL,
    hourly_rate DECIMAL(8,2),
    total_payment DECIMAL(10,2),
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Utilities
CREATE TABLE IF NOT EXISTS utilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('electricity', 'water', 'diesel', 'gas', 'internet', 'phone', 'other')) NOT NULL,
    provider TEXT,
    account_number TEXT,
    amount DECIMAL(10,2) NOT NULL,
    billing_date DATE NOT NULL,
    due_date DATE,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert basic data
INSERT INTO crop_types (name, description) VALUES
('Fruits', 'Fruit trees and bushes'),
('Vegetables', 'Vegetable crops'),
('Grains', 'Cereal and grain crops'),
('Legumes', 'Bean and pea family'),
('Herbs', 'Herbs and spices')
ON CONFLICT (name) DO NOTHING;

INSERT INTO task_categories (name, description, color) VALUES
('Planting', 'Planting and seeding tasks', '#10B981'),
('Maintenance', 'General maintenance tasks', '#3B82F6'),
('Harvesting', 'Harvesting and collection', '#F59E0B'),
('Irrigation', 'Watering and irrigation', '#06B6D4'),
('Pest Control', 'Pest and disease management', '#EF4444'),
('Fertilization', 'Fertilizing and soil improvement', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name, description) VALUES
('Seeds', 'Seeds and planting materials'),
('Fertilizers', 'Fertilizers and soil amendments'),
('Pesticides', 'Pest control products'),
('Tools', 'Farm tools and equipment'),
('Fuel', 'Fuel and energy sources'),
('Packaging', 'Packaging and storage materials')
ON CONFLICT (name) DO NOTHING;