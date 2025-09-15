-- Step 3: Create RLS Policies
-- Run this after RLS is enabled

-- RLS Policies for organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Organization owners and admins can update their organization" ON organizations;
CREATE POLICY "Organization owners and admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for organization_users
DROP POLICY IF EXISTS "Users can view organization memberships they're part of" ON organization_users;
CREATE POLICY "Users can view organization memberships they're part of"
    ON organization_users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Organization owners and admins can manage users" ON organization_users;
CREATE POLICY "Organization owners and admins can manage users"
    ON organization_users FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- RLS Policies for farms
DROP POLICY IF EXISTS "Users can view farms in their organizations" ON farms;
CREATE POLICY "Users can view farms in their organizations"
    ON farms FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Organization members can manage farms" ON farms;
CREATE POLICY "Organization members can manage farms"
    ON farms FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );