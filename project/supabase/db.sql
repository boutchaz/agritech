-- Adminer 4.8.1 PostgreSQL 15.8 dump

\connect "postgres";

DROP TABLE IF EXISTS "crop_categories";
CREATE TABLE "public"."crop_categories" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "type_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "crop_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crop_categories_type_id_name_key" UNIQUE ("type_id", "name")
) WITH (oids = false);


DROP TABLE IF EXISTS "crop_types";
CREATE TABLE "public"."crop_types" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "crop_types_name_key" UNIQUE ("name"),
    CONSTRAINT "crop_types_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "crop_varieties";
CREATE TABLE "public"."crop_varieties" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "category_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "days_to_maturity" integer,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "crop_varieties_category_id_name_key" UNIQUE ("category_id", "name"),
    CONSTRAINT "crop_varieties_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "crops";
CREATE TABLE "public"."crops" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "parcel_id" uuid,
    "variety_id" uuid NOT NULL,
    "name" text NOT NULL,
    "planting_date" date,
    "expected_harvest_date" date,
    "actual_harvest_date" date,
    "planted_area" numeric(10,2),
    "expected_yield" numeric(10,2),
    "actual_yield" numeric(10,2),
    "yield_unit" text DEFAULT 'kg',
    "status" text DEFAULT 'planned',
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_crops_farm_id" ON "public"."crops" USING btree ("farm_id");

CREATE INDEX "idx_crops_parcel_id" ON "public"."crops" USING btree ("parcel_id");


DROP TABLE IF EXISTS "day_laborers";
CREATE TABLE "public"."day_laborers" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "first_name" text NOT NULL,
    "last_name" text NOT NULL,
    "phone" text,
    "daily_rate" numeric(8,2),
    "specialties" text[],
    "availability" text,
    "rating" integer,
    "notes" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "day_laborers_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_day_laborers_farm_id" ON "public"."day_laborers" USING btree ("farm_id");


DROP TABLE IF EXISTS "employees";
CREATE TABLE "public"."employees" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "employee_id" text,
    "first_name" text NOT NULL,
    "last_name" text NOT NULL,
    "email" text,
    "phone" text,
    "position" text,
    "department" text,
    "hire_date" date,
    "salary" numeric(10,2),
    "status" text DEFAULT 'active',
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "employees_employee_id_key" UNIQUE ("employee_id"),
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_employees_farm_id" ON "public"."employees" USING btree ("farm_id");


DROP TABLE IF EXISTS "farms";
CREATE TABLE "public"."farms" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid,
    "name" text NOT NULL,
    "description" text,
    "location" text,
    "address" text,
    "city" text,
    "state" text,
    "country" text,
    "postal_code" text,
    "coordinates" jsonb,
    "size" numeric(10,2),
    "size_unit" text DEFAULT 'hectares',
    "manager_name" text,
    "manager_phone" text,
    "manager_email" text,
    "soil_type" text,
    "climate_zone" text,
    "irrigation_type" text,
    "certification_status" text,
    "status" text DEFAULT 'active',
    "established_date" date,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_farms_organization_id" ON "public"."farms" USING btree ("organization_id");


DELIMITER ;;

CREATE TRIGGER "update_farms_updated_at" BEFORE UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "financial_transactions";
CREATE TABLE "public"."financial_transactions" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "type" text NOT NULL,
    "category" text NOT NULL,
    "subcategory" text,
    "amount" numeric(12,2) NOT NULL,
    "currency" text DEFAULT 'USD',
    "description" text,
    "transaction_date" date NOT NULL,
    "payment_method" text,
    "reference_number" text,
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_financial_transactions_date" ON "public"."financial_transactions" USING btree ("transaction_date");

CREATE INDEX "idx_financial_transactions_farm_id" ON "public"."financial_transactions" USING btree ("farm_id");


DROP TABLE IF EXISTS "inventory";
CREATE TABLE "public"."inventory" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "category_id" uuid NOT NULL,
    "subcategory_id" uuid,
    "name" text NOT NULL,
    "description" text,
    "sku" text,
    "unit" text DEFAULT 'units' NOT NULL,
    "quantity" numeric(10,2) DEFAULT '0',
    "min_stock_level" numeric(10,2) DEFAULT '0',
    "max_stock_level" numeric(10,2),
    "unit_cost" numeric(10,2),
    "supplier" text,
    "expiry_date" date,
    "location" text,
    "notes" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "organization_id" uuid,
    "item_name" text,
    "item_type" text,
    "category" text,
    "brand" text,
    "cost_per_unit" numeric(10,2),
    "batch_number" text,
    "storage_location" text,
    "minimum_quantity" numeric(10,2) DEFAULT '10',
    "last_purchase_date" date,
    "status" text DEFAULT 'available',
    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_inventory_farm_id" ON "public"."inventory" USING btree ("farm_id");


DROP TABLE IF EXISTS "livestock";
CREATE TABLE "public"."livestock" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "type" text NOT NULL,
    "breed" text,
    "count" integer DEFAULT '1' NOT NULL,
    "age_months" integer,
    "health_status" text DEFAULT 'healthy',
    "notes" text,
    "acquired_date" date,
    "location" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "livestock_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_livestock_farm_id" ON "public"."livestock" USING btree ("farm_id");


DROP TABLE IF EXISTS "organization_users";
CREATE TABLE "public"."organization_users" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid,
    "user_id" uuid,
    "role" text DEFAULT 'member',
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "organization_users_organization_id_user_id_key" UNIQUE ("organization_id", "user_id"),
    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DELIMITER ;;

CREATE TRIGGER "update_organization_users_updated_at" BEFORE UPDATE ON "public"."organization_users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "organizations";
CREATE TABLE "public"."organizations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "logo_url" text,
    "website" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "email" text,
    "phone" text,
    "address" text,
    "city" text,
    "state" text,
    "country" text,
    "postal_code" text,
    "contact_person" text,
    "status" text DEFAULT 'active',
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organizations_slug_key" UNIQUE ("slug")
) WITH (oids = false);

COMMENT ON COLUMN "public"."organizations"."email" IS 'Primary contact email for the organization';

COMMENT ON COLUMN "public"."organizations"."phone" IS 'Primary contact phone number';

COMMENT ON COLUMN "public"."organizations"."address" IS 'Street address';

COMMENT ON COLUMN "public"."organizations"."city" IS 'City';

COMMENT ON COLUMN "public"."organizations"."state" IS 'State/Province';

COMMENT ON COLUMN "public"."organizations"."country" IS 'Country';

COMMENT ON COLUMN "public"."organizations"."postal_code" IS 'Postal/ZIP code';

COMMENT ON COLUMN "public"."organizations"."contact_person" IS 'Primary contact person name';

COMMENT ON COLUMN "public"."organizations"."status" IS 'Organization status (active, inactive, suspended)';


DELIMITER ;;

CREATE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "parcels";
CREATE TABLE "public"."parcels" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "farm_id" uuid,
    "name" text NOT NULL,
    "description" text,
    "area" numeric(10,2),
    "area_unit" text DEFAULT 'hectares',
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_parcels_farm_id" ON "public"."parcels" USING btree ("farm_id");


DROP TABLE IF EXISTS "product_categories";
CREATE TABLE "public"."product_categories" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "product_categories_name_key" UNIQUE ("name"),
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "product_subcategories";
CREATE TABLE "public"."product_subcategories" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "category_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "product_subcategories_category_id_name_key" UNIQUE ("category_id", "name"),
    CONSTRAINT "product_subcategories_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "soil_analyses";
CREATE TABLE "public"."soil_analyses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "parcel_id" uuid,
    "test_type_id" uuid,
    "analysis_date" timestamptz DEFAULT now() NOT NULL,
    "physical" jsonb,
    "chemical" jsonb,
    "biological" jsonb,
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "soil_analyses_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_soil_analyses_analysis_date" ON "public"."soil_analyses" USING btree ("analysis_date");

CREATE INDEX "idx_soil_analyses_parcel_id" ON "public"."soil_analyses" USING btree ("parcel_id");


DROP TABLE IF EXISTS "task_categories";
CREATE TABLE "public"."task_categories" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "color" text DEFAULT '#3B82F6',
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "task_categories_name_key" UNIQUE ("name"),
    CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "task_templates";
CREATE TABLE "public"."task_templates" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "category_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "estimated_duration" integer,
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "tasks";
CREATE TABLE "public"."tasks" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "parcel_id" uuid,
    "crop_id" uuid,
    "category_id" uuid NOT NULL,
    "template_id" uuid,
    "title" text NOT NULL,
    "description" text,
    "priority" text DEFAULT 'medium',
    "status" text DEFAULT 'pending',
    "assigned_to" text,
    "due_date" date,
    "completed_date" date,
    "estimated_duration" integer,
    "actual_duration" integer,
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING btree ("due_date");

CREATE INDEX "idx_tasks_farm_id" ON "public"."tasks" USING btree ("farm_id");

CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING btree ("status");


DROP TABLE IF EXISTS "test_types";
CREATE TABLE "public"."test_types" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "parameters" jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "test_types_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "user_profiles";
CREATE TABLE "public"."user_profiles" (
    "id" uuid NOT NULL,
    "email" text,
    "full_name" text,
    "first_name" text,
    "last_name" text,
    "avatar_url" text,
    "phone" text,
    "timezone" text DEFAULT 'UTC',
    "language" text DEFAULT 'en',
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DELIMITER ;;

CREATE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "utilities";
CREATE TABLE "public"."utilities" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "type" text NOT NULL,
    "provider" text,
    "account_number" text,
    "amount" numeric(10,2) NOT NULL,
    "billing_date" date NOT NULL,
    "due_date" date,
    "payment_status" text DEFAULT 'pending',
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "utilities_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_utilities_farm_id" ON "public"."utilities" USING btree ("farm_id");


DROP TABLE IF EXISTS "work_records";
CREATE TABLE "public"."work_records" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "farm_id" uuid NOT NULL,
    "worker_id" uuid,
    "worker_type" text NOT NULL,
    "work_date" date NOT NULL,
    "hours_worked" numeric(4,2),
    "task_description" text NOT NULL,
    "hourly_rate" numeric(8,2),
    "total_payment" numeric(10,2),
    "payment_status" text DEFAULT 'pending',
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "work_records_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_work_records_date" ON "public"."work_records" USING btree ("work_date");

CREATE INDEX "idx_work_records_farm_id" ON "public"."work_records" USING btree ("farm_id");


ALTER TABLE ONLY "public"."crop_categories" ADD CONSTRAINT "crop_categories_type_id_fkey" FOREIGN KEY (type_id) REFERENCES crop_types(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."crop_varieties" ADD CONSTRAINT "crop_varieties_category_id_fkey" FOREIGN KEY (category_id) REFERENCES crop_categories(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."crops" ADD CONSTRAINT "crops_variety_id_fkey" FOREIGN KEY (variety_id) REFERENCES crop_varieties(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."farms" ADD CONSTRAINT "farms_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."inventory" ADD CONSTRAINT "inventory_category_id_fkey" FOREIGN KEY (category_id) REFERENCES product_categories(id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."inventory" ADD CONSTRAINT "inventory_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES product_subcategories(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."organization_users" ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."product_subcategories" ADD CONSTRAINT "product_subcategories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."soil_analyses" ADD CONSTRAINT "soil_analyses_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."task_templates" ADD CONSTRAINT "task_templates_category_id_fkey" FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY (category_id) REFERENCES task_categories(id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_crop_id_fkey" FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_profiles" ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT DEFERRABLE;

-- 2025-09-21 23:07:30.585761+00-- Fix area calculation for EPSG:3857 coordinates
-- Replace the existing area calculation function to handle Web Mercator coordinates

CREATE OR REPLACE FUNCTION calculate_parcel_area_from_boundary()
RETURNS trigger AS $$
DECLARE
  i integer;
  area_sum numeric := 0;
  x1 numeric;
  y1 numeric;
  x2 numeric;
  y2 numeric;
  points_count integer;
  first_coord_x numeric;
  first_coord_y numeric;
BEGIN
  -- Only calculate if boundary exists
  IF NEW.boundary IS NOT NULL THEN
    points_count := jsonb_array_length(NEW.boundary);

    -- Get first coordinate to detect coordinate system
    first_coord_x := (NEW.boundary->0->0)::numeric;
    first_coord_y := (NEW.boundary->0->1)::numeric;

    -- Use Shoelace formula to calculate area
    FOR i IN 0..(points_count - 2) LOOP
      x1 := (NEW.boundary->i->0)::numeric;
      y1 := (NEW.boundary->i->1)::numeric;
      x2 := (NEW.boundary->(i+1)->0)::numeric;
      y2 := (NEW.boundary->(i+1)->1)::numeric;

      area_sum := area_sum + (x1 * y2 - x2 * y1);
    END LOOP;

    -- Check if coordinates are in EPSG:3857 (Web Mercator) or geographic
    IF ABS(first_coord_x) > 20000 OR ABS(first_coord_y) > 20000 THEN
      -- Coordinates are in EPSG:3857 (meters), convert directly to hectares
      NEW.calculated_area := ABS(area_sum / 2) / 10000;
    ELSE
      -- Coordinates are geographic (degrees), use the old conversion
      NEW.calculated_area := ABS(area_sum / 2) * 111.32 * 111.32 / 10000;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update any existing parcels with boundaries to recalculate their areas
UPDATE parcels
SET calculated_area = NULL
WHERE boundary IS NOT NULL;

-- Trigger an update to recalculate all areas
UPDATE parcels
SET boundary = boundary
WHERE boundary IS NOT NULL;-- Create suppliers table
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