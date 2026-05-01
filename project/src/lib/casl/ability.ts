import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { Subscription } from '../../hooks/useSubscription';
import { isSubscriptionValid } from '../polar';

// Define all possible actions
export type Action =
  | 'create' | 'read' | 'update' | 'delete' | 'manage'
  | 'invite' | 'remove' | 'activate' | 'deactivate'
  | 'export' | 'import' | 'view_analytics' | 'access_api'
  | 'approve' | 'post' | 'close'; // Accounting-specific actions

// Define all possible subjects (resources)
export type Subject =
  | 'Farm' | 'Parcel' | 'Analysis' | 'Employee' | 'DayLaborer' | 'Worker'
  | 'User' | 'Organization' | 'Subscription' | 'Role'
  | 'Cost' | 'Revenue' | 'Utility' | 'Structure' | 'Tree'
  | 'SatelliteReport' | 'Sensor' | 'Analytics' | 'API'
  | 'Stock' | 'Infrastructure' | 'FarmHierarchy' | 'Task' | 'Report' | 'Settings'
  | 'Dashboard' | 'Chat'
  // Stock management subjects
  | 'Customer' | 'Supplier' | 'Warehouse' | 'Item'
  // Accounting subjects
  | 'Account' | 'JournalEntry' | 'Invoice' | 'Payment' | 'CostCenter'
  | 'Tax' | 'BankAccount' | 'Period' | 'AccountingReport' | 'AccountMapping'
  // Agricultural Accounting subjects
  | 'FiscalYear' | 'Campaign' | 'CropCycle' | 'BiologicalAsset'
  // Work units (piece-work payment)
  | 'WorkUnit' | 'PieceWork'
  // Harvest & Reception subjects
  | 'Harvest' | 'ReceptionBatch' | 'QualityControl'
  // Compliance subjects
  | 'Certification' | 'ComplianceCheck'
  // HR subjects
  | 'HrCompliance' | 'LeaveType' | 'LeaveAllocation' | 'LeaveApplication' | 'Holiday'
  | 'SalaryStructure' | 'SalarySlip' | 'PayrollRun' | 'WorkerDocument'
  | 'Shift' | 'ShiftAssignment' | 'ShiftRequest' | 'Onboarding' | 'Separation'
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
    can('read', 'Chat');
    can('invite', 'User');
    can('remove', 'User');
    can('read', 'Organization');
    can('update', 'Organization');
    can('read', 'Subscription');
    can('update', 'Subscription');

    // Stock management - Full access for organization admins
    can('manage', 'Customer');
    can('manage', 'Supplier');
    can('manage', 'Warehouse');
    can('manage', 'Item');

    // Accounting - Full access for organization admins
    can('manage', 'Account');
    can('manage', 'JournalEntry');
    can('manage', 'Invoice');
    can('manage', 'Payment');
    can('manage', 'CostCenter');
    can('manage', 'AccountMapping');
    can('manage', 'Tax');
    can('manage', 'BankAccount');
    can('post', 'JournalEntry'); // Can post journals to GL
    can('approve', 'JournalEntry'); // Can approve journals
    can('close', 'Period'); // Can close accounting periods
    can('read', 'AccountingReport');
    can('export', 'AccountingReport');

    // Work Units & Piece-Work - Full access for organization admins
    can('manage', 'WorkUnit'); // Can manage work units (Arbre, Caisse, Kg, Litre, etc.)
    can('manage', 'PieceWork'); // Can manage piece-work records

    // Harvest & Reception - Full access for organization admins
    can('manage', 'Harvest');
    can('manage', 'ReceptionBatch');
    can('manage', 'QualityControl');

    // Agricultural Accounting - Full access for organization admins
    can('manage', 'FiscalYear');
    can('manage', 'Campaign');
    can('manage', 'CropCycle');
    can('manage', 'BiologicalAsset');

    // Compliance
    can('manage', 'Certification');
    can('manage', 'ComplianceCheck');
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
    can('read', 'Chat');
    can('read', 'Farm');
    can('update', 'Farm');
    can('read', 'User');
    can('read', 'Settings');
    can('update', 'Settings'); // Allow updating their profile

    // Stock management - Farm managers can read and manage stock entities
    can('read', 'Customer');
    can('read', 'Supplier');
    can('read', 'Warehouse');
    can('read', 'Item');
    can('manage', 'Item');

    // Accounting - Farm managers can manage invoices, payments, and view reports
    can('read', 'Account');
    can('manage', 'Invoice');
    can('manage', 'Payment');
    can('create', 'JournalEntry');
    can('read', 'JournalEntry');
    can('update', 'JournalEntry'); // Only draft entries
    can('read', 'CostCenter');
    can('read', 'AccountMapping');
    can('read', 'Tax');
    can('read', 'BankAccount');
    can('read', 'AccountingReport');

    // Work Units & Piece-Work - Farm managers can record piece-work but not manage units
    can('read', 'WorkUnit'); // Can view work units
    can('manage', 'PieceWork'); // Can manage piece-work records for their farm

    // Harvest & Reception - Farm managers have full access
    can('manage', 'Harvest');
    can('manage', 'ReceptionBatch');
    can('manage', 'QualityControl');

    // Agricultural Accounting - Farm managers can view fiscal years/campaigns and manage crop cycles
    can('read', 'FiscalYear');
    can('read', 'Campaign');
    can('manage', 'CropCycle'); // Can manage crop cycles for their farms
    can('read', 'BiologicalAsset');
    can('create', 'BiologicalAsset');
    can('update', 'BiologicalAsset');

    // Compliance
    can('manage', 'Certification');
    can('manage', 'ComplianceCheck');
  }

  // Farm Worker - Basic operations (no accounting/sales access)
  if (role.name === 'farm_worker') {
    // Core access
    can('read', 'Dashboard');
    can('read', 'Farm');
    can('read', 'Parcel');
    can('read', 'Chat');
    can('read', 'Settings');
    can('update', 'Settings'); // Can update their profile

    // Field work
    can('create', 'Analysis');
    can('read', 'Analysis');
    can('update', 'Analysis');
    can('create', 'Cost');
    can('read', 'Cost');

    // Personnel - view only
    can('read', 'Employee');
    can('read', 'DayLaborer');
    can('read', 'Worker');
    can('read', 'Task');
    can('update', 'Task'); // Can update their assigned tasks

    // Work Units & Piece-Work - view their own piece-work
    can('read', 'WorkUnit');
    can('read', 'PieceWork');

    // Harvest & Reception - can view and create
    can('read', 'Harvest');
    can('create', 'Harvest');
    can('read', 'ReceptionBatch');
    can('create', 'ReceptionBatch');
    can('read', 'QualityControl');

    // Production tracking - view only
    can('read', 'FiscalYear');
    can('read', 'Campaign');
    can('read', 'CropCycle');
    can('read', 'BiologicalAsset');

    // NOTE: Farm workers do NOT have access to:
    // - Accounting (Account, Invoice, Payment, JournalEntry, AccountingReport)
    // - Sales & Purchasing (uses Invoice permission)
  }

  // Day Laborer - Very limited access (only tasks and profile)
  if (role.name === 'day_laborer') {
    can('read', 'Task'); // Can only view their assigned tasks
    can('update', 'Task'); // Can update their assigned tasks (clock in/out, progress)
    can('read', 'Settings'); // Can view their profile settings
    can('update', 'Settings'); // Can update their profile

    // Work Units & Piece-Work - Day laborers can view their own piece-work
    can('read', 'PieceWork'); // Can view their own piece-work records only
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
    can('read', 'Chat');
    can('read', 'FarmHierarchy');
    can('read', 'Task');
    can('read', 'Report');
    can('read', 'Settings');

    // Stock management - Viewers can read
    can('read', 'Customer');
    can('read', 'Supplier');
    can('read', 'Warehouse');
    can('read', 'Item');

    // Accounting - Viewers can only read accounting data
    can('read', 'Account');
    can('read', 'Invoice');
    can('read', 'Payment');
    can('read', 'JournalEntry');
    can('read', 'CostCenter');
    can('read', 'AccountMapping');
    can('read', 'Tax');
    can('read', 'BankAccount');
    can('read', 'AccountingReport');

    // Work Units & Piece-Work - Viewers can only read
    can('read', 'WorkUnit'); // Can view work units
    can('read', 'PieceWork'); // Can view piece-work records

    // Harvest & Reception - Viewers can only read
    can('read', 'Harvest');
    can('read', 'ReceptionBatch');
    can('read', 'QualityControl');

    // Agricultural Accounting - Viewers can only read
    can('read', 'FiscalYear');
    can('read', 'Campaign');
    can('read', 'CropCycle');
    can('read', 'BiologicalAsset');

    // Compliance
    can('read', 'Certification');
    can('read', 'ComplianceCheck');
  }

  // ============================================
  // SUBSCRIPTION-BASED PERMISSIONS
  // ============================================

  // Must match AbilityContext + polar billing (e.g. pending_renewal, grace period)
  if (!isSubscriptionValid(subscription)) {
    cannot('create', 'all');
    cannot('update', 'all');
    cannot('delete', 'all');
    can('read', 'Subscription');

    // Re-apply admin management abilities after the blanket block.
    // CASL's cannot('update','all') overrides earlier can('manage','User'),
    // so we must re-grant User/Org/Settings management for admins.
    if (role.name === 'system_admin') {
      can('manage', 'all');
    } else if (role.name === 'organization_admin') {
      can('manage', 'User');
      can('invite', 'User');
      can('remove', 'User');
      can('read', 'Organization');
      can('update', 'Organization');
      can('read', 'Subscription');
      can('update', 'Subscription');
      can('read', 'Settings');
      can('update', 'Settings');
      can('manage', 'Role');
    }

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
