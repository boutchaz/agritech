-- AGROGINA workflow: langue on parcels, mode_calibrage on calibrations,
-- evenements_parcelle table, suivis_saison table

-- 1. Add langue to parcels (report generation language: fr, ar, ber)
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS langue TEXT DEFAULT 'fr';
COMMENT ON COLUMN parcels.langue IS 'Report language key: fr, ar, ber';

-- 2. Add mode_calibrage to calibrations (F1 = initial, F2 = partial, F3 = end-of-season)
ALTER TABLE IF EXISTS calibrations ADD COLUMN IF NOT EXISTS mode_calibrage TEXT DEFAULT 'F1';
COMMENT ON COLUMN calibrations.mode_calibrage IS 'Calibration mode: F1 (initial), F2 (partial recalibration), F3 (end-of-season full recalibration)';

-- 3. Add localized report columns to calibrations
ALTER TABLE IF EXISTS calibrations ADD COLUMN IF NOT EXISTS rapport_fr TEXT;
ALTER TABLE IF EXISTS calibrations ADD COLUMN IF NOT EXISTS rapport_ar TEXT;

-- 4. evenements_parcelle — parcel events that may trigger F2 recalibration
CREATE TABLE IF NOT EXISTS evenements_parcelle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date_evenement DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  donnees JSONB DEFAULT '{}'::jsonb,
  recalibrage_requis BOOLEAN DEFAULT FALSE,
  recalibrage_id UUID REFERENCES calibrations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE evenements_parcelle IS 'Parcel events that may trigger F2 partial recalibration';
COMMENT ON COLUMN evenements_parcelle.type IS 'Event type key: new_water_source, soil_analysis, water_analysis, severe_pruning, removal, disease, frost, drought, other';

CREATE INDEX IF NOT EXISTS idx_evenements_parcelle_parcel ON evenements_parcelle(parcel_id);
CREATE INDEX IF NOT EXISTS idx_evenements_parcelle_org ON evenements_parcelle(organization_id);

ALTER TABLE evenements_parcelle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view events in their organization" ON evenements_parcelle
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Users can insert events in their organization" ON evenements_parcelle
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 5. suivis_saison — season tracking for F3 recalibration and future ML
CREATE TABLE IF NOT EXISTS suivis_saison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  saison TEXT NOT NULL,
  rendement_reel_t_ha DECIMAL,
  rendement_reel_kg_arbre DECIMAL,
  qualite_recolte TEXT,
  regularite_percue TEXT,
  applications JSONB DEFAULT '[]'::jsonb,
  evenements JSONB DEFAULT '[]'::jsonb,
  bilan_campagne TEXT,
  recalibrage_f3_id UUID REFERENCES calibrations(id) ON DELETE SET NULL,
  cloture_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE suivis_saison IS 'Season tracking for F3 end-of-season recalibration and future ML training data';
COMMENT ON COLUMN suivis_saison.saison IS 'Season identifier, e.g. 2025-2026';
COMMENT ON COLUMN suivis_saison.regularite_percue IS 'Perceived regularity key: stable, marked_alternance, very_irregular';

CREATE INDEX IF NOT EXISTS idx_suivis_saison_parcel ON suivis_saison(parcel_id);
CREATE INDEX IF NOT EXISTS idx_suivis_saison_org ON suivis_saison(organization_id);

ALTER TABLE suivis_saison ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view seasons in their organization" ON suivis_saison
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Users can manage seasons in their organization" ON suivis_saison
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );
