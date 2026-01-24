import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { Subscription } from '../../hooks/useSubscription';

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
  // Accounting subjects
  | 'Account' | 'JournalEntry' | 'Invoice' | 'Payment' | 'CostCenter'
  | 'Tax' | 'BankAccount' | 'Period' | 'AccountingReport' | 'AccountMapping'
  // Agricultural Accounting subjects
  | 'FiscalYear' | 'Campaign' | 'CropCycle' | 'BiologicalAsset'
  // Work units (piece-work payment)
  | 'WorkUnit' | 'PieceWork'
  // Harvest & Reception subjects
  | 'Harvest' | 'ReceptionBatch' | 'QualityControl'
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
  }

  // Farm Worker - Daily operational access
  if (role.name === 'farm_worker') {
    // Core navigation - workers need to see farm structure and resources
    can('read', 'Dashboard');
    can('read', 'Farm');
    can('read', 'FarmHierarchy'); // Need to understand farm structure
    can('read', 'Parcel');
    can('read', 'Stock'); // Need to see available materials/inventory
    can('read', 'Infrastructure'); // Need to know where warehouses/buildings are
    can('read', 'Chat');
    can('read', 'Settings');
    can('update', 'Settings'); // Can update their profile

    // Personnel - can view workers and manage their own tasks
    can('read', 'Employee');
    can('read', 'DayLaborer');
    can('read', 'Worker');
    can('read', 'Task');
    can('update', 'Task'); // Can update their assigned tasks
    can('create', 'Task'); // Can create tasks (e.g., report issues)

    // Field work - analysis and costs
    can('create', 'Analysis');
    can('read', 'Analysis');
    can('update', 'Analysis');
    can('create', 'Cost');
    can('read', 'Cost');
    can('read', 'Utility'); // Can view utilities/expenses

    // Production - core daily work
    can('read', 'Harvest');
    can('create', 'Harvest');
    can('update', 'Harvest'); // Can update harvest records
    can('read', 'ReceptionBatch');
    can('create', 'ReceptionBatch');
    can('read', 'QualityControl');
    can('read', 'Campaign');
    can('read', 'CropCycle');
    can('read', 'BiologicalAsset');
    can('read', 'FiscalYear');

    // Work Units & Piece-Work - workers can view their own piece-work
    can('read', 'WorkUnit');
    can('read', 'PieceWork');

    // Reports - basic reporting access
    can('read', 'Report'); // Can view reports relevant to their work

    // Limited accounting - only view, no create/edit
    can('read', 'Account');
    can('read', 'Invoice');
    can('read', 'Payment');
    can('read', 'JournalEntry');
    can('read', 'AccountingReport');
  }

  // Day Laborer - Minimal access focused on their daily tasks
  if (role.name === 'day_laborer') {
    // Basic navigation - need a dashboard to see their work
    can('read', 'Dashboard'); // Simple dashboard with their tasks
    can('read', 'Settings'); // Can view their profile settings
    can('update', 'Settings'); // Can update their profile

    // Tasks - core functionality for day laborers
    can('read', 'Task'); // Can only view their assigned tasks
    can('update', 'Task'); // Can update their assigned tasks (clock in/out, progress)

    // Basic context - need to understand where they're working
    can('read', 'Farm'); // Know which farm they're at
    can('read', 'Parcel'); // Know which parcel they're working on

    // Work Units & Piece-Work - Day laborers can view their own piece-work
    can('read', 'WorkUnit'); // Can see work unit types
    can('read', 'PieceWork'); // Can view their own piece-work records only

    // Harvest - day laborers often help with harvesting
    can('read', 'Harvest');
    can('create', 'Harvest'); // Can record harvest work
  }

  // Viewer - Read-only access for stakeholders, consultants, observers
  // Focused on production overview, NOT sensitive financial data
  if (role.name === 'viewer') {
    // Core navigation - overview access
    can('read', 'Dashboard');
    can('read', 'Farm');
    can('read', 'FarmHierarchy');
    can('read', 'Parcel');
    can('read', 'Infrastructure');
    can('read', 'Stock');
    can('read', 'Chat');
    can('read', 'Settings'); // Own profile only

    // Production data - main focus for viewers
    can('read', 'Analysis');
    can('read', 'Harvest');
    can('read', 'ReceptionBatch');
    can('read', 'QualityControl');
    can('read', 'Campaign');
    can('read', 'CropCycle');
    can('read', 'BiologicalAsset');
    can('read', 'FiscalYear');

    // Personnel - can see team but no details
    can('read', 'Worker');
    can('read', 'Task');

    // Reports - summary reports only
    can('read', 'Report');
    can('read', 'AccountingReport'); // Summary financial reports

    // Work tracking
    can('read', 'WorkUnit');
    can('read', 'PieceWork');

    // NOTE: Viewers intentionally do NOT have access to:
    // - Invoice, Payment, JournalEntry (sensitive financial transactions)
    // - Account, CostCenter, AccountMapping, Tax, BankAccount (financial configuration)
    // - Cost, Revenue, Utility (detailed expense/revenue data)
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
