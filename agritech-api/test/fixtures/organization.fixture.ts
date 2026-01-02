/**
 * Test fixtures for organization-related entities
 * Includes organizations, users, roles, and subscriptions
 */

import { TEST_IDS } from '../helpers/test-utils';

/**
 * Mock roles
 */
export const mockRoles = {
  systemAdmin: {
    id: 'role-sys-admin',
    name: 'system_admin',
    display_name: 'System Administrator',
    level: 1,
  },
  organizationAdmin: {
    id: 'role-org-admin',
    name: 'organization_admin',
    display_name: 'Organization Administrator',
    level: 2,
  },
  farmManager: {
    id: 'role-farm-manager',
    name: 'farm_manager',
    display_name: 'Farm Manager',
    level: 3,
  },
  farmWorker: {
    id: 'role-farm-worker',
    name: 'farm_worker',
    display_name: 'Farm Worker',
    level: 4,
  },
  dayLaborer: {
    id: 'role-day-laborer',
    name: 'day_laborer',
    display_name: 'Day Laborer',
    level: 5,
  },
  viewer: {
    id: 'role-viewer',
    name: 'viewer',
    display_name: 'Viewer',
    level: 6,
  },
};

/**
 * Mock organizations
 */
export const mockOrganizations = {
  default: {
    id: TEST_IDS.organization,
    name: 'Test Organization',
    slug: 'test-organization',
    description: 'A test organization',
    currency_code: 'MAD',
    timezone: 'Africa/Casablanca',
    subscription_plan: 'basic',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  freePlan: {
    id: 'org-free-001',
    name: 'Free Plan Organization',
    slug: 'free-plan-org',
    currency_code: 'MAD',
    timezone: 'Africa/Casablanca',
    subscription_plan: 'free',
    is_active: true,
  },
  proPlan: {
    id: 'org-pro-001',
    name: 'Pro Plan Organization',
    slug: 'pro-plan-org',
    currency_code: 'MAD',
    timezone: 'Africa/Casablanca',
    subscription_plan: 'pro',
    is_active: true,
  },
  enterprise: {
    id: 'org-enterprise-001',
    name: 'Enterprise Organization',
    slug: 'enterprise-org',
    currency_code: 'MAD',
    timezone: 'Africa/Casablanca',
    subscription_plan: 'enterprise',
    is_active: true,
  },
  inactive: {
    id: 'org-inactive-001',
    name: 'Inactive Organization',
    slug: 'inactive-org',
    currency_code: 'MAD',
    timezone: 'Africa/Casablanca',
    subscription_plan: 'basic',
    is_active: false,
  },
};

/**
 * Mock user profiles
 */
export const mockUserProfiles = {
  admin: {
    id: TEST_IDS.user,
    email: 'admin@test.com',
    first_name: 'Admin',
    last_name: 'User',
    full_name: 'Admin User',
    phone: '+212600000001',
    language: 'fr',
    timezone: 'Africa/Casablanca',
    onboarding_completed: true,
    password_set: true,
  },
  farmManager: {
    id: 'user-fm-001',
    email: 'manager@test.com',
    first_name: 'Farm',
    last_name: 'Manager',
    full_name: 'Farm Manager',
    phone: '+212600000002',
    language: 'fr',
    timezone: 'Africa/Casablanca',
    onboarding_completed: true,
    password_set: true,
  },
  worker: {
    id: 'user-worker-001',
    email: 'worker@test.com',
    first_name: 'Farm',
    last_name: 'Worker',
    full_name: 'Farm Worker',
    phone: '+212600000003',
    language: 'ar',
    timezone: 'Africa/Casablanca',
    onboarding_completed: true,
    password_set: true,
  },
  viewer: {
    id: 'user-viewer-001',
    email: 'viewer@test.com',
    first_name: 'View',
    last_name: 'Only',
    full_name: 'View Only',
    language: 'en',
    timezone: 'Africa/Casablanca',
    onboarding_completed: true,
    password_set: true,
  },
};

/**
 * Mock organization users (memberships)
 */
export const mockOrganizationUsers = {
  adminMembership: {
    user_id: mockUserProfiles.admin.id,
    organization_id: mockOrganizations.default.id,
    role_id: mockRoles.organizationAdmin.id,
    is_active: true,
    roles: mockRoles.organizationAdmin,
  },
  managerMembership: {
    user_id: mockUserProfiles.farmManager.id,
    organization_id: mockOrganizations.default.id,
    role_id: mockRoles.farmManager.id,
    is_active: true,
    roles: mockRoles.farmManager,
  },
  workerMembership: {
    user_id: mockUserProfiles.worker.id,
    organization_id: mockOrganizations.default.id,
    role_id: mockRoles.farmWorker.id,
    is_active: true,
    roles: mockRoles.farmWorker,
  },
  viewerMembership: {
    user_id: mockUserProfiles.viewer.id,
    organization_id: mockOrganizations.default.id,
    role_id: mockRoles.viewer.id,
    is_active: true,
    roles: mockRoles.viewer,
  },
};

/**
 * Mock subscriptions
 */
export const mockSubscriptions = {
  free: {
    id: 'sub-free-001',
    organization_id: mockOrganizations.freePlan.id,
    plan: 'free',
    status: 'active',
    limits: {
      max_farms: 1,
      max_parcels: 5,
      max_users: 2,
      max_satellite_reports: 10,
    },
    usage: {
      farms: 1,
      parcels: 3,
      users: 2,
      satellite_reports: 5,
    },
  },
  basic: {
    id: 'sub-basic-001',
    organization_id: mockOrganizations.default.id,
    plan: 'basic',
    status: 'active',
    limits: {
      max_farms: 3,
      max_parcels: 25,
      max_users: 5,
      max_satellite_reports: 50,
    },
    usage: {
      farms: 2,
      parcels: 10,
      users: 3,
      satellite_reports: 20,
    },
  },
  pro: {
    id: 'sub-pro-001',
    organization_id: mockOrganizations.proPlan.id,
    plan: 'pro',
    status: 'active',
    limits: {
      max_farms: 10,
      max_parcels: 100,
      max_users: 20,
      max_satellite_reports: 200,
    },
    usage: {
      farms: 5,
      parcels: 40,
      users: 10,
      satellite_reports: 80,
    },
  },
  enterprise: {
    id: 'sub-enterprise-001',
    organization_id: mockOrganizations.enterprise.id,
    plan: 'enterprise',
    status: 'active',
    limits: {
      max_farms: -1, // unlimited
      max_parcels: -1,
      max_users: -1,
      max_satellite_reports: -1,
    },
    usage: {
      farms: 50,
      parcels: 500,
      users: 100,
      satellite_reports: 1000,
    },
  },
  trialing: {
    id: 'sub-trial-001',
    organization_id: 'org-trial-001',
    plan: 'pro',
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    limits: {
      max_farms: 10,
      max_parcels: 100,
      max_users: 20,
      max_satellite_reports: 200,
    },
    usage: {
      farms: 1,
      parcels: 5,
      users: 2,
      satellite_reports: 10,
    },
  },
  expired: {
    id: 'sub-expired-001',
    organization_id: 'org-expired-001',
    plan: 'basic',
    status: 'past_due',
    limits: {
      max_farms: 3,
      max_parcels: 25,
      max_users: 5,
      max_satellite_reports: 50,
    },
    usage: {
      farms: 3,
      parcels: 25,
      users: 5,
      satellite_reports: 50,
    },
  },
};

/**
 * Mock auth user (Supabase Auth)
 */
export const mockAuthUser = (overrides: Partial<any> = {}) => ({
  id: TEST_IDS.user,
  email: 'admin@test.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone: '+212600000001',
  user_metadata: {
    full_name: 'Admin User',
    first_name: 'Admin',
    last_name: 'User',
  },
  app_metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Helper to create a signup DTO
 */
export const createSignupDto = (overrides: Partial<any> = {}) => ({
  email: 'newuser@test.com',
  password: 'SecurePassword123!',
  firstName: 'New',
  lastName: 'User',
  phone: '+212600000099',
  organizationName: 'New Organization',
  includeDemoData: false,
  ...overrides,
});

/**
 * Helper to create organization user with role
 */
export const createOrgUserWithRole = (
  userId: string,
  orgId: string,
  roleName: string,
) => {
  const role = Object.values(mockRoles).find((r) => r.name === roleName);
  return {
    user_id: userId,
    organization_id: orgId,
    role_id: role?.id || mockRoles.viewer.id,
    is_active: true,
    roles: role || mockRoles.viewer,
  };
};

/**
 * Helper to check if a role has required permission level
 */
export const roleHasPermissionLevel = (
  roleName: string,
  requiredLevel: number,
): boolean => {
  const role = Object.values(mockRoles).find((r) => r.name === roleName);
  return role ? role.level <= requiredLevel : false;
};
