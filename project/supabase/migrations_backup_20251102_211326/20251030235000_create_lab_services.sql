-- Lab Services Integration
-- Enables scheduling soil/leaf analyses, tracking samples, and integrating lab results

-- ============================================================================
-- 1. Lab Service Providers Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  accreditations JSONB DEFAULT '[]'::jsonb, -- List of certifications
  turnaround_days INTEGER DEFAULT 7, -- Average turnaround time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Lab Service Types Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES lab_service_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('soil', 'leaf', 'water', 'tissue', 'other')),
  description TEXT,
  sample_requirements TEXT, -- How to collect samples
  parameters_tested JSONB DEFAULT '[]'::jsonb, -- List of parameters measured
  price NUMERIC(10,2),
  currency TEXT DEFAULT 'MAD',
  turnaround_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Lab Service Orders Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  service_type_id UUID NOT NULL REFERENCES lab_service_types(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES lab_service_providers(id) ON DELETE RESTRICT,

  -- Order details
  order_number TEXT UNIQUE,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',          -- Order created, awaiting sample collection
    'sample_collected', -- Sample collected, ready to send
    'sent_to_lab',     -- Sample sent to lab
    'in_progress',     -- Lab is analyzing
    'completed',       -- Results received
    'cancelled'        -- Order cancelled
  )),

  -- Sample collection details
  sample_collected_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  sample_collection_date TIMESTAMPTZ,
  sample_collection_notes TEXT,
  sample_location_coordinates JSONB, -- GeoJSON point where sample was taken
  sample_depth_cm NUMERIC(5,2), -- For soil samples
  sample_photos TEXT[], -- URLs to sample photos

  -- Lab tracking
  lab_reference_number TEXT, -- Lab's internal reference
  sent_to_lab_date TIMESTAMPTZ,
  expected_completion_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,

  -- Results
  results_received_date TIMESTAMPTZ,
  results_document_url TEXT, -- URL to PDF report
  results_data JSONB, -- Structured results data

  -- Pricing
  quoted_price NUMERIC(10,2),
  actual_price NUMERIC(10,2),
  currency TEXT DEFAULT 'MAD',
  paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Lab Results Parameters Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_result_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES lab_service_orders(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL, -- e.g., "pH", "Nitrogen", "Phosphorus"
  parameter_code TEXT, -- Standardized code
  value NUMERIC,
  unit TEXT, -- e.g., "ppm", "mg/kg", "%"
  interpretation TEXT, -- e.g., "Low", "Optimal", "High"
  recommendation TEXT, -- Specific recommendation for this parameter
  reference_range_min NUMERIC,
  reference_range_max NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Lab Service Recommendations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_service_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES lab_service_orders(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Recommendation details
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'fertilization', 'irrigation', 'ph_correction', 'amendment', 'pest_control', 'general'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Action items
  suggested_products JSONB, -- List of products to use
  suggested_quantities JSONB, -- Quantities and application rates
  application_method TEXT,
  timing TEXT, -- When to apply

  -- Tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  implemented_date TIMESTAMPTZ,
  implemented_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. Sample Collection Schedules Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sample_collection_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,

  -- Schedule details
  service_type_id UUID NOT NULL REFERENCES lab_service_types(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'biannual', 'annual', 'custom')),
  custom_interval_days INTEGER, -- For custom frequency

  -- Next collection
  next_collection_date DATE NOT NULL,
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_collection_date DATE,

  -- Notifications
  notify_days_before INTEGER DEFAULT 3,
  notification_emails TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. Indexes for Performance
-- ============================================================================
CREATE INDEX idx_lab_orders_org ON lab_service_orders(organization_id);
CREATE INDEX idx_lab_orders_farm ON lab_service_orders(farm_id);
CREATE INDEX idx_lab_orders_parcel ON lab_service_orders(parcel_id);
CREATE INDEX idx_lab_orders_status ON lab_service_orders(status);
CREATE INDEX idx_lab_orders_date ON lab_service_orders(order_date);
CREATE INDEX idx_lab_results_order ON lab_result_parameters(order_id);
CREATE INDEX idx_lab_recommendations_order ON lab_service_recommendations(order_id);
CREATE INDEX idx_lab_recommendations_parcel ON lab_service_recommendations(parcel_id);
CREATE INDEX idx_sample_schedules_org ON sample_collection_schedules(organization_id);
CREATE INDEX idx_sample_schedules_next_date ON sample_collection_schedules(next_collection_date);

-- ============================================================================
-- 8. Row Level Security (RLS)
-- ============================================================================

-- Lab Service Providers (public read, admin write)
ALTER TABLE lab_service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active lab providers"
  ON lab_service_providers FOR SELECT
  USING (is_active = true);

-- Lab Service Types (public read, admin write)
ALTER TABLE lab_service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active lab service types"
  ON lab_service_types FOR SELECT
  USING (is_active = true);

-- Lab Service Orders (organization-scoped)
ALTER TABLE lab_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's lab orders"
  ON lab_service_orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lab orders for their organization"
  ON lab_service_orders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's lab orders"
  ON lab_service_orders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Lab Result Parameters
ALTER TABLE lab_result_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results for their organization's orders"
  ON lab_result_parameters FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM lab_service_orders
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Lab Service Recommendations
ALTER TABLE lab_service_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations for their organization's orders"
  ON lab_service_recommendations FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM lab_service_orders
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update recommendations for their organization"
  ON lab_service_recommendations FOR UPDATE
  USING (
    order_id IN (
      SELECT id FROM lab_service_orders
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Sample Collection Schedules
ALTER TABLE sample_collection_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's schedules"
  ON sample_collection_schedules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's schedules"
  ON sample_collection_schedules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. Functions
-- ============================================================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_lab_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_part TEXT;
  sequence_part INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_part
  FROM lab_service_orders
  WHERE order_number LIKE 'LAB-' || year_part || '-%';

  new_number := 'LAB-' || year_part || '-' || LPAD(sequence_part::TEXT, 6, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_lab_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_lab_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_lab_order_number
  BEFORE INSERT ON lab_service_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_lab_order_number();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_lab_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lab_orders_timestamp
  BEFORE UPDATE ON lab_service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_timestamp();

CREATE TRIGGER trigger_update_lab_recommendations_timestamp
  BEFORE UPDATE ON lab_service_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_timestamp();

-- ============================================================================
-- 10. Seed Data - UM6P Lab Services
-- ============================================================================

-- Insert UM6P as a lab provider
INSERT INTO lab_service_providers (name, description, contact_email, website, accreditations, is_active)
VALUES (
  'UM6P - Laboratoire d''Analyses',
  'Université Mohammed VI Polytechnique - Services d''analyses agricoles de pointe avec expertise scientifique reconnue',
  'lab@um6p.ma',
  'https://www.um6p.ma',
  '["ISO 17025", "Accréditation COFRAC", "Centre de Recherche Agronomique"]'::jsonb,
  true
);

-- Get the provider ID
DO $$
DECLARE
  provider_id UUID;
BEGIN
  SELECT id INTO provider_id FROM lab_service_providers WHERE name = 'UM6P - Laboratoire d''Analyses';

  -- Insert soil analysis services
  INSERT INTO lab_service_types (provider_id, name, category, description, sample_requirements, parameters_tested, price, turnaround_days, is_active)
  VALUES
  (
    provider_id,
    'Analyse Complète du Sol',
    'soil',
    'Analyse physico-chimique complète : pH, matière organique, NPK, CEC, texture, oligo-éléments',
    'Prélever 500g de sol à 20cm de profondeur, dans 5 points différents de la parcelle, mélanger et prélever un échantillon composite',
    '["pH", "Matière Organique (%)", "Azote Total (N)", "Phosphore (P2O5)", "Potassium (K2O)", "CEC", "Calcium (Ca)", "Magnésium (Mg)", "Soufre (S)", "Fer (Fe)", "Zinc (Zn)", "Cuivre (Cu)", "Manganèse (Mn)", "Bore (B)", "Texture (Argile/Limon/Sable)", "Conductivité Électrique"]'::jsonb,
    1200.00,
    10,
    true
  ),
  (
    provider_id,
    'Analyse Basique du Sol (NPK)',
    'soil',
    'Analyse des macro-éléments principaux : pH, matière organique, N, P, K',
    'Prélever 500g de sol à 20cm de profondeur, dans 5 points différents de la parcelle',
    '["pH", "Matière Organique (%)", "Azote Total (N)", "Phosphore (P2O5)", "Potassium (K2O)"]'::jsonb,
    600.00,
    7,
    true
  ),
  (
    provider_id,
    'Analyse Foliaire Complète',
    'leaf',
    'Diagnostic nutritionnel via analyse foliaire : macro et micro-éléments',
    'Prélever 50 feuilles récentes et saines, laver à l''eau distillée, sécher à l''ombre',
    '["Azote (N)", "Phosphore (P)", "Potassium (K)", "Calcium (Ca)", "Magnésium (Mg)", "Soufre (S)", "Fer (Fe)", "Zinc (Zn)", "Cuivre (Cu)", "Manganèse (Mn)", "Bore (B)", "Molybdène (Mo)"]'::jsonb,
    800.00,
    8,
    true
  ),
  (
    provider_id,
    'Analyse de l''Eau d''Irrigation',
    'water',
    'Qualité physico-chimique de l''eau : salinité, pH, ions majeurs',
    'Prélever 1L d''eau dans une bouteille propre, conserver au frais',
    '["pH", "Conductivité Électrique", "TDS", "Calcium (Ca)", "Magnésium (Mg)", "Sodium (Na)", "Potassium (K)", "Chlorures (Cl)", "Sulfates (SO4)", "Bicarbonates (HCO3)", "SAR", "Bore (B)"]'::jsonb,
    500.00,
    5,
    true
  ),
  (
    provider_id,
    'Analyse Microbiologique du Sol',
    'soil',
    'Activité biologique du sol : biomasse microbienne, respiration, enzymes',
    'Prélever 1kg de sol frais, conserver à 4°C, livrer sous 24h',
    '["Biomasse Microbienne", "Respiration du Sol", "Activité Enzymatique (Phosphatases)", "Activité Enzymatique (Ureases)", "Mycorhizes", "Nématodes"]'::jsonb,
    1500.00,
    14,
    true
  );
END $$;

-- ============================================================================
-- 11. Comments
-- ============================================================================
COMMENT ON TABLE lab_service_providers IS 'Laboratory service providers offering soil/leaf/water analyses';
COMMENT ON TABLE lab_service_types IS 'Types of analyses offered by labs';
COMMENT ON TABLE lab_service_orders IS 'Orders for lab analysis services';
COMMENT ON TABLE lab_result_parameters IS 'Individual parameter results from lab analyses';
COMMENT ON TABLE lab_service_recommendations IS 'Recommendations generated from lab results';
COMMENT ON TABLE sample_collection_schedules IS 'Recurring schedules for sample collection';
