-- Move email and phone validations from database to NestJS API
-- This drops all CHECK constraints that use regex for validation

-- Drop email format constraints (email validation moved to NestJS using @IsEmail())
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_email_format;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS chk_user_profiles_email_format;
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_suppliers_email_format;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS chk_customers_email_format;
ALTER TABLE workers DROP CONSTRAINT IF EXISTS chk_workers_email_format;

-- Drop phone format constraint (phone validation moved to NestJS using @Matches())
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_phone_format;
