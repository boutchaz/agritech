-- Row Level Security for Agricultural Tables
-- Run this after 07-agricultural-tables.sql

-- Enable RLS on all agricultural tables
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;

-- Global reference tables (viewable by all authenticated users)
CREATE POLICY "Anyone can view crop types" ON crop_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view crop categories" ON crop_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view crop varieties" ON crop_varieties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view task categories" ON task_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view task templates" ON task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view product categories" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view product subcategories" ON product_subcategories FOR SELECT TO authenticated USING (true);

-- Farm-specific data policies (users can only access data from their organization's farms)
CREATE POLICY "Users can view parcels in their organization" ON parcels FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage parcels in their organization" ON parcels FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view crops in their organization" ON crops FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage crops in their organization" ON crops FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view tasks in their organization" ON tasks FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage tasks in their organization" ON tasks FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view inventory in their organization" ON inventory FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage inventory in their organization" ON inventory FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view transactions in their organization" ON financial_transactions FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage transactions in their organization" ON financial_transactions FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view livestock in their organization" ON livestock FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage livestock in their organization" ON livestock FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view employees in their organization" ON employees FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage employees in their organization" ON employees FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view day laborers in their organization" ON day_laborers FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage day laborers in their organization" ON day_laborers FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view work records in their organization" ON work_records FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage work records in their organization" ON work_records FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

CREATE POLICY "Users can view utilities in their organization" ON utilities FOR SELECT TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
);

CREATE POLICY "Users can manage utilities in their organization" ON utilities FOR ALL TO authenticated USING (
    farm_id IN (
        SELECT f.id FROM farms f
        JOIN organization_users ou ON f.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid() AND ou.role IN ('owner', 'admin', 'manager') AND ou.is_active = true
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parcels_farm_id ON parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_crops_farm_id ON crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_crops_parcel_id ON crops(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_farm_id ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_inventory_farm_id ON inventory(farm_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_farm_id ON financial_transactions(farm_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_livestock_farm_id ON livestock(farm_id);
CREATE INDEX IF NOT EXISTS idx_employees_farm_id ON employees(farm_id);
CREATE INDEX IF NOT EXISTS idx_day_laborers_farm_id ON day_laborers(farm_id);
CREATE INDEX IF NOT EXISTS idx_work_records_farm_id ON work_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_work_records_date ON work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_utilities_farm_id ON utilities(farm_id);