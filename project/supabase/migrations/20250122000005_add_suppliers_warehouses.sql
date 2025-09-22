-- Create suppliers table
CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid NOT NULL,
    "name" text NOT NULL,
    "contact_person" text,
    "email" text,
    "phone" text,
    "address" text,
    "city" text,
    "postal_code" text,
    "country" text DEFAULT 'Morocco',
    "website" text,
    "tax_id" text,
    "payment_terms" text,
    "notes" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX "idx_suppliers_organization_id" ON "public"."suppliers" USING btree ("organization_id");

-- Create warehouses table
CREATE TABLE IF NOT EXISTS "public"."warehouses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid NOT NULL,
    "farm_id" uuid,
    "name" text NOT NULL,
    "description" text,
    "location" text,
    "address" text,
    "city" text,
    "postal_code" text,
    "capacity" numeric(10,2),
    "capacity_unit" text DEFAULT 'm3',
    "temperature_controlled" boolean DEFAULT false,
    "humidity_controlled" boolean DEFAULT false,
    "security_level" text DEFAULT 'standard',
    "manager_name" text,
    "manager_phone" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT "warehouses_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX "idx_warehouses_organization_id" ON "public"."warehouses" USING btree ("organization_id");
CREATE INDEX "idx_warehouses_farm_id" ON "public"."warehouses" USING btree ("farm_id");

-- Add supplier_id and warehouse_id columns to inventory table
ALTER TABLE "public"."inventory"
ADD COLUMN IF NOT EXISTS "supplier_id" uuid,
ADD COLUMN IF NOT EXISTS "warehouse_id" uuid;

-- Add foreign key constraints
ALTER TABLE "public"."inventory"
ADD CONSTRAINT "inventory_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_inventory_supplier_id" ON "public"."inventory" USING btree ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_warehouse_id" ON "public"."inventory" USING btree ("warehouse_id");

-- Add RLS policies for suppliers
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers in their organization" ON "public"."suppliers"
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert suppliers in their organization" ON "public"."suppliers"
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update suppliers in their organization" ON "public"."suppliers"
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete suppliers in their organization" ON "public"."suppliers"
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Add RLS policies for warehouses
ALTER TABLE "public"."warehouses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouses in their organization" ON "public"."warehouses"
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert warehouses in their organization" ON "public"."warehouses"
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update warehouses in their organization" ON "public"."warehouses"
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete warehouses in their organization" ON "public"."warehouses"
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Add comments for documentation
COMMENT ON TABLE "public"."suppliers" IS 'Suppliers for inventory management';
COMMENT ON TABLE "public"."warehouses" IS 'Warehouses and storage locations';
COMMENT ON COLUMN "public"."suppliers"."payment_terms" IS 'Payment terms like "Net 30", "COD", etc.';
COMMENT ON COLUMN "public"."warehouses"."security_level" IS 'Security level: basic, standard, high, maximum';
COMMENT ON COLUMN "public"."warehouses"."capacity" IS 'Storage capacity in the specified unit';