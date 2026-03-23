/**
 * Centralized Query Keys Factory
 * Single source of truth for React Query query keys
 * Ensures consistency and enables easy cache invalidation
 */

/**
 * Base query keys
 */
export const queryKeys = {
  /**
   * Authentication & User
   */
  auth: {
    base: ['auth'] as const,
    user: (userId: string) => ['auth', 'user', userId] as const,
    profile: () => ['auth', 'profile'] as const,
    organizations: (userId?: string) => ['auth', 'organizations', userId] as const,
  },

  /**
   * Organization
   */
  organizations: {
    all: () => ['organizations'] as const,
    detail: (id: string) => ['organizations', id] as const,
    current: () => ['organizations', 'current'] as const,
  },

  /**
   * Subscription
   */
  subscription: (organizationId: string | undefined) =>
    ['subscription', organizationId ?? 'none'] as const,
  subscriptionUsage: (organizationId: string | undefined) =>
    ['subscription-usage', organizationId ?? 'none'] as const,
  usageCounts: (organizationId: string | undefined) =>
    ['usage-counts', organizationId ?? 'none'] as const,

  /**
   * Module Configuration
   */
  moduleConfig: (locale = 'en') => ['moduleConfig', locale] as const,
  modules: (organizationId: string | undefined) =>
    ['modules', organizationId ?? 'none'] as const,

  /**
   * Farms
   */
  farms: {
    all: (organizationId: string | undefined) => ['farms', organizationId ?? 'none'] as const,
    detail: (farmId: string) => ['farms', farmId] as const,
    hierarchy: (organizationId: string | undefined) => ['farm-hierarchy', organizationId ?? 'none'] as const,
    relatedData: (organizationId: string | undefined) => ['farms-related', organizationId ?? 'none'] as const,
  },

  /**
   * Parcels
   */
  parcels: {
    all: (organizationId: string | undefined, farmId?: string) =>
      ['parcels', organizationId ?? 'none', farmId] as const,
    detail: (parcelId: string) => ['parcels', parcelId] as const,
    performance: (organizationId: string | undefined) =>
      ['parcels-performance', organizationId ?? 'none'] as const,
  },

  /**
   * Dashboard
   */
  dashboard: {
    settings: (organizationId: string | undefined) => ['dashboard-settings', organizationId ?? 'none'] as const,
    metrics: (organizationId: string | undefined) => ['dashboard-metrics', organizationId ?? 'none'] as const,
    summary: (organizationId: string | undefined) => ['dashboard-summary', organizationId ?? 'none'] as const,
    activityHeatmap: (organizationId: string | undefined) => ['activity-heatmap', organizationId ?? 'none'] as const,
    liveMetrics: (organizationId: string | undefined) => ['live-metrics', organizationId ?? 'none'] as const,
  },

  /**
   * Inventory & Stock
   */
  inventory: {
    items: (organizationId: string | undefined) => ['items', organizationId ?? 'none'] as const,
    warehouses: (organizationId: string | undefined) => ['warehouses', organizationId ?? 'none'] as const,
    stockLevels: (organizationId: string | undefined) => ['stock-levels', organizationId ?? 'none'] as const,
    workUnits: (organizationId: string | undefined) => ['work-units', organizationId ?? 'none'] as const,
    categories: () => ['marketplace-categories'] as const,
  },

  /**
   * Sales & Marketplace
   */
  sales: {
    quoteRequests: {
      sent: (organizationId: string | undefined, status?: string) =>
        ['quote-requests', 'sent', status, organizationId ?? 'none'] as const,
      received: (organizationId: string | undefined) =>
        ['quote-requests', 'received', organizationId ?? 'none'] as const,
    },
  },

  /**
   * Accounting
   */
  accounting: {
    accounts: (organizationId: string | undefined) => ['accounts', organizationId ?? 'none'] as const,
    chartOfAccounts: (organizationId: string | undefined) => ['chart-of-accounts', organizationId ?? 'none'] as const,
    journalEntries: (organizationId: string | undefined) => ['journal-entries', organizationId ?? 'none'] as const,
    financialReports: (organizationId: string | undefined) => ['financial-reports', organizationId ?? 'none'] as const,
  },

  /**
   * Files
   */
  files: {
    all: (organizationId: string | undefined, bucket?: string, orphansOnly = false) =>
      ['files', organizationId ?? 'none', bucket, orphansOnly] as const,
    stats: (organizationId: string | undefined) => ['file-stats', organizationId ?? 'none'] as const,
    orphans: (organizationId: string | undefined) => ['orphaned-files', organizationId ?? 'none'] as const,
  },

  /**
   * Tree Management (Farm Management)
   */
  treeManagement: {
    categories: (organizationId: string | undefined) => ['tree-categories', organizationId ?? 'none'] as const,
    trees: (organizationId: string | undefined) => ['trees', organizationId ?? 'none'] as const,
    plantationTypes: (organizationId: string | undefined) => ['plantation-types', organizationId ?? 'none'] as const,
  },

  /**
   * Satellite & Analytics
   */
  satellite: {
    indices: {
      availableDates: (organizationId: string | undefined) => ['satellite-dates', organizationId ?? 'none'] as const,
      generated: (organizationId: string | undefined) => ['satellite-images', organizationId ?? 'none'] as const,
    },
  },

  calibrationV2: {
    status: (parcelId: string, organizationId?: string) =>
      ['calibration-v2', organizationId ?? 'none', parcelId, 'status'] as const,
    report: (parcelId: string, organizationId?: string) =>
      ['calibration-v2', organizationId ?? 'none', parcelId, 'report'] as const,
    nutritionSuggestion: (parcelId: string, organizationId?: string) =>
      ['calibration-v2', organizationId ?? 'none', parcelId, 'nutrition-suggestion'] as const,
    phase: (parcelId: string, organizationId?: string) =>
      ['calibration-v2', organizationId ?? 'none', parcelId, 'phase'] as const,
    history: (parcelId: string, organizationId?: string) =>
      ['calibration-v2', organizationId ?? 'none', parcelId, 'history'] as const,
    draft: (parcelId: string, organizationId?: string) =>
      ['calibration-v2', organizationId ?? 'none', parcelId, 'draft'] as const,
  },

  annual: {
    eligibility: (parcelId: string, organizationId?: string) =>
      ['annual', 'eligibility', parcelId, organizationId ?? 'none'] as const,
    missingTasks: (parcelId: string, organizationId?: string) =>
      ['annual', 'missing-tasks', parcelId, organizationId ?? 'none'] as const,
    newAnalyses: (parcelId: string, organizationId?: string) =>
      ['annual', 'new-analyses', parcelId, organizationId ?? 'none'] as const,
    campaignBilan: (parcelId: string, organizationId?: string) =>
      ['annual', 'campaign-bilan', parcelId, organizationId ?? 'none'] as const,
  },

  /**
   * Profitability
   */
  profitability: {
    costs: (organizationId: string | undefined, parcelId?: string) =>
      ['costs', organizationId ?? 'none', parcelId] as const,
    revenues: (organizationId: string | undefined, parcelId?: string) =>
      ['revenues', organizationId ?? 'none', parcelId] as const,
  },

  /**
   * CASL Abilities
   */
  abilities: (organizationId: string | undefined) => ['abilities', organizationId ?? 'none'] as const,

  /**
   * Blog
   */
  blog: {
    posts: {
      all: () => ['blog-posts'] as const,
      featured: () => ['blog-posts', 'featured'] as const,
      popular: () => ['blog-posts', 'popular'] as const,
      detail: (slug: string) => ['blog-posts', slug] as const,
      related: (slug: string) => ['blog-posts', slug, 'related'] as const,
    },
    categories: () => ['blog-categories'] as const,
  },

  /**
   * Onboarding
   */
  onboarding: {
    state: () => ['onboarding-state'] as const,
  },

  /**
   * Live Dashboard
   */
  liveDashboard: {
    concurrentUsers: () => ['live-concurrent-users'] as const,
  },
} as const;

/**
 * Helper to invalidate all queries for an organization
 */
export function invalidateOrganizationQueries(organizationId: string) {
  return [
    queryKeys.subscription(organizationId),
    queryKeys.modules(organizationId),
    queryKeys.farms.all(organizationId),
    queryKeys.parcels.all(organizationId),
    queryKeys.dashboard.settings(organizationId),
    queryKeys.abilities(organizationId),
    queryKeys.usageCounts(organizationId),
    queryKeys.treeManagement.categories(organizationId),
    queryKeys.treeManagement.trees(organizationId),
    queryKeys.treeManagement.plantationTypes(organizationId),
  ];
}

/**
 * Helper to invalidate auth queries
 */
export function invalidateAuthQueries(userId?: string) {
  return [
    queryKeys.auth.profile(),
    queryKeys.auth.organizations(userId),
  ];
}
