import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { Subscription } from '../../hooks/useSubscription';

// Define all possible actions
export type Action =
  | 'create' | 'read' | 'update' | 'delete' | 'manage'
  | 'invite' | 'remove' | 'activate' | 'deactivate'
  | 'export' | 'import' | 'view_analytics' | 'access_api';

// Define all possible subjects (resources)
export type Subject =
  | 'Farm' | 'Parcel' | 'Analysis' | 'Employee' | 'DayLaborer' | 'Worker'
  | 'User' | 'Organization' | 'Subscription' | 'Role'
  | 'Cost' | 'Revenue' | 'Utility' | 'Structure' | 'Tree'
  | 'SatelliteReport' | 'Sensor' | 'Analytics' | 'API'
  | 'Stock' | 'Infrastructure' | 'FarmHierarchy' | 'Task' | 'Report' | 'Settings'
  | 'Dashboard'
  | 'all';

// Define ability type
export type AppAbility = MongoAbility<[Action, Subject]>;

// Define user context for ability
interface UserContext {
  userId: string;
  organizationId: string;
  role: {
    name: string;
    level: number;
  };
  subscription: Subscription | null;
  currentCounts: {
    farms: number;
    parcels: number;
    users: number;
    satelliteReports: number;
  };
}

/**
 * Define abilities based on user role and subscription
 */
export function defineAbilitiesFor(context: UserContext): AppAbility {
  const { role, subscription, currentCounts } = context;
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // ============================================
  // ROLE-BASED PERMISSIONS
  // ============================================

  // System Admin - Full access to everything
  if (role.name === 'system_admin') {
    can('manage', 'all');
    return build();
  }

  // Organization Admin - Manage organization resources
  if (role.name === 'organization_admin') {
    can('manage', 'Farm');
    can('manage', 'Parcel');
    can('manage', 'Analysis');
    can('manage', 'Employee');
    can('manage', 'DayLaborer');
    can('manage', 'Worker');
    can('manage', 'Cost');
    can('manage', 'Revenue');
    can('manage', 'Utility');
    can('manage', 'Structure');
    can('manage', 'Tree');
    can('manage', 'User');
    can('manage', 'Stock');
    can('manage', 'Infrastructure');
    can('manage', 'FarmHierarchy');
    can('manage', 'Task');
    can('manage', 'Report');
    can('manage', 'Settings');
    can('read', 'Dashboard');
    can('invite', 'User');
    can('remove', 'User');
    can('read', 'Organization');
    can('update', 'Organization');
    can('read', 'Subscription');
    can('update', 'Subscription');
  }

  // Farm Manager - Manage assigned farms
  if (role.name === 'farm_manager') {
    can('manage', 'Parcel');
    can('manage', 'Analysis');
    can('manage', 'Employee');
    can('manage', 'DayLaborer');
    can('manage', 'Worker');
    can('manage', 'Cost');
    can('manage', 'Revenue');
    can('manage', 'Utility');
    can('manage', 'Structure');
    can('manage', 'Tree');
    can('manage', 'Stock');
    can('manage', 'Infrastructure');
    can('manage', 'FarmHierarchy');
    can('manage', 'Task');
    can('read', 'Report');
    can('read', 'Dashboard');
    can('read', 'Farm');
    can('update', 'Farm');
    can('read', 'User');
    can('read', 'Settings');
    can('update', 'Settings'); // Allow updating their profile
  }

  // Farm Worker - Basic operations
  if (role.name === 'farm_worker') {
    can('create', 'Analysis');
    can('read', 'Analysis');
    can('update', 'Analysis');
    can('read', 'Parcel');
    can('read', 'Farm');
    can('create', 'Cost');
    can('read', 'Cost');
    can('read', 'Employee');
    can('read', 'DayLaborer');
    can('read', 'Worker');
    can('read', 'Dashboard');
    can('read', 'Task');
    can('update', 'Task'); // Can update their assigned tasks
    can('read', 'Settings');
    can('update', 'Settings'); // Can update their profile
  }

  // Day Laborer - Very limited access (only tasks and profile)
  if (role.name === 'day_laborer') {
    can('read', 'Task'); // Can only view their assigned tasks
    can('update', 'Task'); // Can update their assigned tasks (clock in/out, progress)
    can('read', 'Settings'); // Can view their profile settings
    can('update', 'Settings'); // Can update their profile
  }

  // Viewer - Read-only access
  if (role.name === 'viewer') {
    can('read', 'Farm');
    can('read', 'Parcel');
    can('read', 'Analysis');
    can('read', 'Cost');
    can('read', 'Revenue');
    can('read', 'Worker');
    can('read', 'Dashboard');
    can('read', 'FarmHierarchy');
    can('read', 'Task');
    can('read', 'Report');
    can('read', 'Settings');
  }

  // ============================================
  // SUBSCRIPTION-BASED PERMISSIONS
  // ============================================

  if (!subscription) {
    // No subscription - block everything except viewing subscription page
    cannot('create', 'all');
    cannot('update', 'all');
    cannot('delete', 'all');
    can('read', 'Subscription');
    return build();
  }

  // Check subscription status
  const isActive = ['active', 'trialing'].includes(subscription.status);
  if (!isActive) {
    // Inactive subscription - block everything
    cannot('create', 'all');
    cannot('update', 'all');
    cannot('delete', 'all');
    can('read', 'Subscription');
    return build();
  }

  // ============================================
  // SUBSCRIPTION LIMITS
  // ============================================

  // Farm creation limit
  if (currentCounts.farms >= subscription.max_farms) {
    cannot('create', 'Farm');
  }

  // Parcel creation limit
  if (currentCounts.parcels >= subscription.max_parcels) {
    cannot('create', 'Parcel');
  }

  // User invitation limit
  if (currentCounts.users >= subscription.max_users) {
    cannot('invite', 'User');
    cannot('create', 'User');
  }

  // Satellite reports limit
  if (currentCounts.satelliteReports >= subscription.max_satellite_reports) {
    cannot('create', 'SatelliteReport');
  }

  // ============================================
  // SUBSCRIPTION FEATURES
  // ============================================

  // Analytics (Professional+)
  if (subscription.has_analytics) {
    can('view_analytics', 'Analytics');
  } else {
    cannot('view_analytics', 'Analytics');
  }

  // Sensor integration (Professional+)
  if (subscription.has_sensor_integration) {
    can('read', 'Sensor');
    can('create', 'Sensor');
  } else {
    cannot('read', 'Sensor');
    cannot('create', 'Sensor');
  }

  // Advanced reporting (Professional+)
  if (subscription.has_advanced_reporting) {
    can('export', 'all');
  } else {
    cannot('export', 'all');
  }

  // API Access (Enterprise)
  if (subscription.has_api_access) {
    can('access_api', 'API');
  } else {
    cannot('access_api', 'API');
  }

  return build();
}

/**
 * Helper to check if a limit has been reached
 */
export function isLimitReached(
  subscription: Subscription | null,
  currentCount: number,
  limitType: 'farms' | 'parcels' | 'users' | 'satelliteReports'
): boolean {
  if (!subscription) return true;

  const limits = {
    farms: subscription.max_farms,
    parcels: subscription.max_parcels,
    users: subscription.max_users,
    satelliteReports: subscription.max_satellite_reports,
  };

  return currentCount >= limits[limitType];
}

/**
 * Helper to get remaining count for a resource
 */
export function getRemainingCount(
  subscription: Subscription | null,
  currentCount: number,
  limitType: 'farms' | 'parcels' | 'users' | 'satelliteReports'
): number | null {
  if (!subscription) return 0;

  const limits = {
    farms: subscription.max_farms,
    parcels: subscription.max_parcels,
    users: subscription.max_users,
    satelliteReports: subscription.max_satellite_reports,
  };

  const limit = limits[limitType];

  // Unlimited (Enterprise)
  if (limit >= 999999) return null;

  return Math.max(0, limit - currentCount);
}
