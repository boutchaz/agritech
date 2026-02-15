ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_organizations_average_rating ON organizations(average_rating);
