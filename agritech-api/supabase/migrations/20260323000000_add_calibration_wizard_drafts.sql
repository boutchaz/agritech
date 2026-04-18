-- Calibration wizard draft persistence
-- Stores in-progress wizard form data so users can resume across devices/sessions

CREATE TABLE IF NOT EXISTS calibration_wizard_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 8),
  form_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parcel_id, organization_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_calibration_wizard_drafts_lookup
  ON calibration_wizard_drafts(parcel_id, organization_id, user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_calibration_wizard_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calibration_wizard_drafts_updated_at
  BEFORE UPDATE ON calibration_wizard_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_calibration_wizard_drafts_updated_at();

-- RLS policies
ALTER TABLE calibration_wizard_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own drafts"
  ON calibration_wizard_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON calibration_wizard_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON calibration_wizard_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON calibration_wizard_drafts FOR DELETE
  USING (auth.uid() = user_id);
