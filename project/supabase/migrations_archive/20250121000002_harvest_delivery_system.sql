-- =====================================================
-- HARVEST AND DELIVERY MANAGEMENT SYSTEM
-- Migration: Complete harvest tracking and delivery management
-- with quality control, worker involvement, and logistics
-- =====================================================

-- =====================================================
-- HARVEST RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS harvest_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
  
  -- Harvest Details
  harvest_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'tons', 'units', 'boxes', 'crates', 'liters')),
  quality_grade TEXT CHECK (quality_grade IN ('A', 'B', 'C', 'Extra', 'First', 'Second', 'Third')),
  quality_notes TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  
  -- Task Relation
  harvest_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Workers Involved (JSONB array of worker details)
  workers JSONB NOT NULL DEFAULT '[]'::jsonb, 
  -- Format: [{"worker_id": "uuid", "hours_worked": 8, "quantity_picked": 100}]
  supervisor_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  
  -- Storage & Destination
  storage_location TEXT,
  temperature DECIMAL(4, 1),
  humidity DECIMAL(4, 1),
  
  -- Market/Delivery Intent
  intended_for TEXT CHECK (
    intended_for IN ('market', 'storage', 'processing', 'export', 'direct_client')
  ),
  expected_price_per_unit DECIMAL(10, 2),
  estimated_revenue DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * expected_price_per_unit) STORED,
  
  -- Photos & Documentation
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'stored' CHECK (
    status IN ('stored', 'in_delivery', 'delivered', 'sold', 'spoiled')
  ),
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_harvest_records_organization_id ON harvest_records(organization_id);
CREATE INDEX idx_harvest_records_farm_id ON harvest_records(farm_id);
CREATE INDEX idx_harvest_records_parcel_id ON harvest_records(parcel_id);
CREATE INDEX idx_harvest_records_harvest_date ON harvest_records(harvest_date DESC);
CREATE INDEX idx_harvest_records_status ON harvest_records(status);
CREATE INDEX idx_harvest_records_workers_gin ON harvest_records USING gin(workers);

COMMENT ON TABLE harvest_records IS 'Detailed harvest tracking with quality, workers, and storage conditions';

-- =====================================================
-- DELIVERIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  
  -- Delivery Details
  delivery_date DATE NOT NULL,
  delivery_type TEXT NOT NULL CHECK (
    delivery_type IN ('market_sale', 'export', 'processor', 'direct_client', 'wholesale')
  ),
  
  -- Customer/Destination
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  customer_email TEXT,
  delivery_address TEXT,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  
  -- Products Summary (calculated from items)
  total_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'MAD',
  
  -- Logistics
  driver_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  vehicle_info TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  distance_km DECIMAL(6, 2),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'prepared', 'in_transit', 'delivered', 'cancelled', 'returned')
  ),
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'partial', 'paid')
  ),
  payment_method TEXT CHECK (
    payment_method IN ('cash', 'bank_transfer', 'check', 'credit', 'mobile_money')
  ),
  payment_terms TEXT, -- e.g., "COD", "NET 30", "50% upfront"
  payment_received DECIMAL(12, 2) DEFAULT 0,
  payment_date DATE,
  
  -- Documentation
  delivery_note_number TEXT UNIQUE,
  invoice_number TEXT,
  signature_image TEXT, -- base64 or storage URL
  signature_name TEXT,
  signature_date TIMESTAMPTZ,
  
  -- Photos
  photos JSONB DEFAULT '[]'::jsonb,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deliveries_organization_id ON deliveries(organization_id);
CREATE INDEX idx_deliveries_farm_id ON deliveries(farm_id);
CREATE INDEX idx_deliveries_delivery_date ON deliveries(delivery_date DESC);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_payment_status ON deliveries(payment_status);
CREATE INDEX idx_deliveries_customer_name ON deliveries(customer_name);

COMMENT ON TABLE deliveries IS 'Delivery management with customer, logistics, and payment tracking';

-- =====================================================
-- DELIVERY ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  harvest_record_id UUID NOT NULL REFERENCES harvest_records(id) ON DELETE RESTRICT,
  
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  
  -- Quality at delivery
  quality_grade TEXT,
  quality_notes TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX idx_delivery_items_harvest_record_id ON delivery_items(harvest_record_id);

COMMENT ON TABLE delivery_items IS 'Individual items/products in a delivery linked to harvest records';

-- =====================================================
-- DELIVERY TRACKING TABLE (for real-time updates)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT,
  
  notes TEXT,
  photo_url TEXT,
  
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_tracking_delivery_id ON delivery_tracking(delivery_id);
CREATE INDEX idx_delivery_tracking_recorded_at ON delivery_tracking(recorded_at DESC);

COMMENT ON TABLE delivery_tracking IS 'Real-time tracking updates for deliveries';

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_harvest_records_updated_at ON harvest_records;
CREATE TRIGGER update_harvest_records_updated_at 
  BEFORE UPDATE ON harvest_records 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at 
  BEFORE UPDATE ON deliveries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-GENERATE DELIVERY NOTE NUMBER
-- =====================================================
CREATE OR REPLACE FUNCTION generate_delivery_note_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_sequence INTEGER;
  v_note_number TEXT;
BEGIN
  -- Get current year and month
  v_year := TO_CHAR(NEW.delivery_date, 'YYYY');
  v_month := TO_CHAR(NEW.delivery_date, 'MM');
  
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(delivery_note_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM deliveries
  WHERE delivery_note_number LIKE 'DN-' || v_year || v_month || '-%'
    AND organization_id = NEW.organization_id;
  
  -- Generate note number: DN-YYYYMM-0001
  v_note_number := 'DN-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  NEW.delivery_note_number := v_note_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_delivery_note_number_trigger ON deliveries;
CREATE TRIGGER generate_delivery_note_number_trigger
  BEFORE INSERT ON deliveries
  FOR EACH ROW
  WHEN (NEW.delivery_note_number IS NULL)
  EXECUTE FUNCTION generate_delivery_note_number();

-- =====================================================
-- UPDATE HARVEST STATUS WHEN ADDED TO DELIVERY
-- =====================================================
CREATE OR REPLACE FUNCTION update_harvest_status_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Update harvest record status when added to delivery
  UPDATE harvest_records
  SET 
    status = 'in_delivery',
    updated_at = NOW()
  WHERE id = NEW.harvest_record_id
    AND status = 'stored';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_harvest_on_delivery_item ON delivery_items;
CREATE TRIGGER update_harvest_on_delivery_item
  AFTER INSERT ON delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_harvest_status_on_delivery();

-- =====================================================
-- UPDATE HARVEST STATUS WHEN DELIVERY COMPLETED
-- =====================================================
CREATE OR REPLACE FUNCTION update_harvest_status_on_delivery_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update all harvest records in this delivery to delivered
    UPDATE harvest_records hr
    SET 
      status = 'delivered',
      updated_at = NOW()
    FROM delivery_items di
    WHERE di.delivery_id = NEW.id
      AND di.harvest_record_id = hr.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_harvest_on_delivery_status ON deliveries;
CREATE TRIGGER update_harvest_on_delivery_status
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered'))
  EXECUTE FUNCTION update_harvest_status_on_delivery_complete();

-- =====================================================
-- CALCULATE DELIVERY TOTALS FROM ITEMS
-- =====================================================
CREATE OR REPLACE FUNCTION update_delivery_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_total_quantity DECIMAL;
  v_total_amount DECIMAL;
BEGIN
  -- Calculate totals from delivery items
  SELECT 
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(total_amount), 0)
  INTO v_total_quantity, v_total_amount
  FROM delivery_items
  WHERE delivery_id = COALESCE(NEW.delivery_id, OLD.delivery_id);
  
  -- Update delivery record
  UPDATE deliveries
  SET 
    total_quantity = v_total_quantity,
    total_amount = v_total_amount,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_delivery_totals_on_items_change ON delivery_items;
CREATE TRIGGER update_delivery_totals_on_items_change
  AFTER INSERT OR UPDATE OR DELETE ON delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_totals();

-- =====================================================
-- CREATE METAYAGE SETTLEMENT FROM HARVEST
-- =====================================================
CREATE OR REPLACE FUNCTION create_metayage_settlement_from_harvest()
RETURNS TRIGGER AS $$
DECLARE
  v_worker RECORD;
  v_worker_data JSONB;
  v_metayage_worker_ids UUID[];
BEGIN
  -- Only proceed if harvest is sold/delivered
  IF NEW.status = 'delivered' OR NEW.status = 'sold' THEN
    -- Extract metayage worker IDs from workers JSONB
    SELECT ARRAY_AGG(DISTINCT (worker->>'worker_id')::UUID)
    INTO v_metayage_worker_ids
    FROM harvest_records hr,
         LATERAL jsonb_array_elements(hr.workers) AS worker
    WHERE hr.id = NEW.id
      AND (worker->>'worker_id')::UUID IN (
        SELECT id FROM workers WHERE worker_type = 'metayage'
      );
    
    -- Create settlement for each metayage worker
    IF v_metayage_worker_ids IS NOT NULL THEN
      FOR v_worker IN 
        SELECT 
          w.*,
          (SELECT worker->>'hours_worked' 
           FROM jsonb_array_elements(NEW.workers) AS worker 
           WHERE (worker->>'worker_id')::UUID = w.id
          )::DECIMAL AS hours_worked
        FROM workers w
        WHERE w.id = ANY(v_metayage_worker_ids)
      LOOP
        -- Get actual revenue from delivery
        DECLARE
          v_actual_revenue DECIMAL;
        BEGIN
          SELECT SUM(di.total_amount)
          INTO v_actual_revenue
          FROM delivery_items di
          WHERE di.harvest_record_id = NEW.id;
          
          -- Create settlement if revenue exists
          IF v_actual_revenue IS NOT NULL AND v_actual_revenue > 0 THEN
            INSERT INTO metayage_settlements (
              worker_id,
              farm_id,
              parcel_id,
              period_start,
              period_end,
              harvest_date,
              gross_revenue,
              worker_percentage,
              worker_share_amount,
              calculation_basis,
              notes
            ) VALUES (
              v_worker.id,
              NEW.farm_id,
              NEW.parcel_id,
              NEW.harvest_date,
              NEW.harvest_date,
              NEW.harvest_date,
              v_actual_revenue,
              v_worker.metayage_percentage,
              v_actual_revenue * (v_worker.metayage_percentage / 100),
              v_worker.calculation_basis,
              'Auto-generated from harvest: ' || NEW.id
            )
            ON CONFLICT DO NOTHING;
          END IF;
        END;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_metayage_settlement_trigger ON harvest_records;
CREATE TRIGGER create_metayage_settlement_trigger
  AFTER UPDATE ON harvest_records
  FOR EACH ROW
  WHEN (NEW.status IN ('delivered', 'sold') AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'sold')))
  EXECUTE FUNCTION create_metayage_settlement_from_harvest();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Harvest Records Policies
CREATE POLICY "Users can view harvests in their organization" 
  ON harvest_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create harvests in their organization" 
  ON harvest_records FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update harvests in their organization" 
  ON harvest_records FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Deliveries Policies
CREATE POLICY "Users can view deliveries in their organization" 
  ON deliveries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Managers can create deliveries" 
  ON deliveries FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Managers and drivers can update deliveries" 
  ON deliveries FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      -- Managers can update
      organization_id IN (
        SELECT ou.organization_id FROM organization_users ou
        JOIN roles r ON r.id = ou.role_id
        WHERE ou.user_id = auth.uid() 
          AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
      )
      -- Or assigned driver can update
      OR driver_id IN (
        SELECT id FROM workers w
        WHERE w.organization_id IN (
          SELECT organization_id FROM organization_users 
          WHERE user_id = auth.uid() AND is_active = true
        )
      )
    )
  );

-- Delivery Items Policies
CREATE POLICY "Users can view delivery items in their organization" 
  ON delivery_items FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM deliveries d
      WHERE d.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Managers can manage delivery items" 
  ON delivery_items FOR ALL
  USING (
    delivery_id IN (
      SELECT d.id FROM deliveries d
      WHERE d.organization_id IN (
        SELECT ou.organization_id FROM organization_users ou
        JOIN roles r ON r.id = ou.role_id
        WHERE ou.user_id = auth.uid() 
          AND ou.is_active = true
          AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
      )
    )
  );

-- Delivery Tracking Policies
CREATE POLICY "Users can view tracking in their organization" 
  ON delivery_tracking FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM deliveries d
      WHERE d.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can create tracking updates" 
  ON delivery_tracking FOR INSERT
  WITH CHECK (
    delivery_id IN (
      SELECT id FROM deliveries d
      WHERE d.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- Harvest summary view
CREATE OR REPLACE VIEW harvest_summary AS
SELECT 
  hr.*,
  f.name AS farm_name,
  p.name AS parcel_name,
  c.name AS crop_name,
  w.first_name || ' ' || w.last_name AS supervisor_name,
  jsonb_array_length(hr.workers) AS worker_count,
  (SELECT COUNT(*) FROM delivery_items WHERE harvest_record_id = hr.id) AS delivery_count,
  (SELECT SUM(quantity) FROM delivery_items WHERE harvest_record_id = hr.id) AS quantity_delivered
FROM harvest_records hr
LEFT JOIN farms f ON f.id = hr.farm_id
LEFT JOIN parcels p ON p.id = hr.parcel_id
LEFT JOIN crops c ON c.id = hr.crop_id
LEFT JOIN workers w ON w.id = hr.supervisor_id;

COMMENT ON VIEW harvest_summary IS 'Comprehensive harvest view with related information';

-- Delivery summary view
CREATE OR REPLACE VIEW delivery_summary AS
SELECT 
  d.*,
  f.name AS farm_name,
  o.name AS organization_name,
  driver.first_name || ' ' || driver.last_name AS driver_name,
  (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id) AS item_count,
  (SELECT COUNT(*) FROM delivery_tracking WHERE delivery_id = d.id) AS tracking_update_count
FROM deliveries d
LEFT JOIN farms f ON f.id = d.farm_id
LEFT JOIN organizations o ON o.id = d.organization_id
LEFT JOIN workers driver ON driver.id = d.driver_id;

COMMENT ON VIEW delivery_summary IS 'Comprehensive delivery view with related information';

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Get harvest statistics for a period
CREATE OR REPLACE FUNCTION get_harvest_statistics(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_harvests INTEGER,
  total_quantity DECIMAL,
  total_revenue DECIMAL,
  average_quality_score DECIMAL,
  top_parcel_name TEXT,
  top_parcel_quantity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH harvest_stats AS (
    SELECT 
      COUNT(*) AS total_harvests,
      SUM(hr.quantity) AS total_quantity,
      SUM(hr.estimated_revenue) AS total_revenue,
      AVG(hr.quality_score) AS avg_quality_score
    FROM harvest_records hr
    WHERE hr.organization_id = p_organization_id
      AND hr.harvest_date BETWEEN p_start_date AND p_end_date
  ),
  top_parcel AS (
    SELECT 
      p.name AS parcel_name,
      SUM(hr.quantity) AS parcel_quantity
    FROM harvest_records hr
    JOIN parcels p ON p.id = hr.parcel_id
    WHERE hr.organization_id = p_organization_id
      AND hr.harvest_date BETWEEN p_start_date AND p_end_date
    GROUP BY p.id, p.name
    ORDER BY parcel_quantity DESC
    LIMIT 1
  )
  SELECT 
    hs.total_harvests::INTEGER,
    hs.total_quantity,
    hs.total_revenue,
    hs.avg_quality_score,
    tp.parcel_name,
    tp.parcel_quantity
  FROM harvest_stats hs
  CROSS JOIN top_parcel tp;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_harvest_statistics IS 'Get comprehensive harvest statistics for a period';

