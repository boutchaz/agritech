-- Drop broken phone constraint - validation moved to NestJS API
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_phone_format;
