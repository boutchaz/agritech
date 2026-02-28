/**
 * Consolidated Subscription Configuration
 *
 * SINGLE SOURCE OF TRUTH for:
 * - Plan bundles with pricing aligned to Polar products
 * - Module mappings between database and Polar metadata
 * - Polar product IDs (hardcoded from API)
 *
 * Integration points:
 * - Database (modules table) → source of truth for available modules
 * - Polar.sh products → payment processing
 * - Frontend (useModuleConfig hook) → consumes this config
 *
 * To add/update modules:
 * 1. Update in database via module-config API
 * 2. Update mapping here if needed for Polar integration
 * 3. No need to modify frontend components
 */

import type { PlanType } from './polar';

// ============================================================================
// POLAR PRODUCT IDS (from API - hardcoded to avoid env var issues)
// ============================================================================
const POLAR_PRODUCT_IDS = {
  essential: '3b03769f-9a47-47bc-8f07-bd1f3a580dee',
  professional: 'db925c1e-d64d-4d95-9907-dc90da5bcbe6',
  enterprise: 'd53c78fb-5833-43da-a4f0-2a0bd2ff32c9',
  // Yearly product IDs — replace with production IDs from Polar dashboard
  essentialYearly: '',
  professionalYearly: '',
  enterpriseYearly: '',
} as const;

// ============================================================================
// MODULE MAPPINGS
// Maps database module names/slugs to Polar metadata keys
// ============================================================================
const MODULE_POLAR_MAP: Record<string, string> = {
  // Core farming modules (from Polar metadata)
  'fruit-trees': 'fruit-trees',
  'cereals': 'cereals',
  'vegetables': 'vegetables',

  // Additional modules (from database)
  'mushrooms': 'mushrooms',
  'livestock': 'livestock',
  'farm_management': 'farm_management',
  'inventory': 'inventory',
  'sales': 'sales',
  'procurement': 'procurement',
  'accounting': 'accounting',
  'hr': 'hr',
  'analytics': 'analytics',
  'satellite': 'satellite',
  'marketplace': 'marketplace',
} as const;

/**
 * Maps database module display names to slugs
 * Used when API returns modules with names but no slugs
 */
const MODULE_NAME_TO_SLUG_MAP: Record<string, string> = {
  // =====================================================
  // POLAR-ALIGNED CROP MODULES (Essential + Professional)
  // =====================================================
  'Fruit Trees': 'fruit-trees',
  'Cereals': 'cereals',
  'Vegetables': 'vegetables',
  'Mushrooms': 'mushrooms',
  'Livestock': 'livestock',

  // =====================================================
  // FUNCTIONAL MODULES (from database)
  // =====================================================
  'Farm Management': 'farm_management',
  'Inventory': 'inventory',
  'Sales': 'sales',
  'Procurement': 'procurement',
  'Accounting': 'accounting',
  'Human Resources': 'hr',
  'HR': 'hr',
  'Analytics': 'analytics',
  'Analytics & Satellite': 'analytics',
  'Satellite': 'satellite',
  'Marketplace': 'marketplace',
  'Compliance': 'compliance',
};

// ============================================================================
// TYPES
// ============================================================================
export type BillingInterval = 'month' | 'year';

export interface ModuleSubscriptionConfig {
  slug: string;
  name: string;
  icon: string;
  category: string;
  priceMonthly: number;
  isRequired: boolean;
  isRecommended: boolean;
  isAddonEligible: boolean;
  requiredPlan?: PlanType;
  features: string[];
}

export interface PlanBundle {
  id: PlanType;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  priceMonthly: number;
  priceYearly: number;
  price: string;
  priceAmount: number;
  includedModules: string[];
  limits: {
    farms: number;
    parcels: number;
    users: number;
    satelliteReports: number;
  };
  capabilities: {
    analytics: boolean;
    sensorIntegration: boolean;
    aiRecommendations: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  highlighted?: boolean;
  includedAddonSlots: number;
  addonSlotPrice: number;
  polarProductId: string;
  polarProductIdYearly: string;
  features: string[];
}

// ============================================================================
// PLAN BUNDLES
// Aligned with Polar products from API
// ============================================================================
export const PLAN_BUNDLES: Record<PlanType, PlanBundle> = {
  essential: {
    id: 'essential',
    name: 'Essential Plan',
    nameKey: 'subscription.plans.essential.name',
    description: 'Perfect for small farms getting started with digital management',
    descriptionKey: 'subscription.plans.essential.description',
    // Price aligned with Polar ($25/month, $250/year — 2 months free)
    priceMonthly: 25,
    priceYearly: 250,
    price: '$25',
    priceAmount: 25,
    // Core farming modules from Polar metadata
    includedModules: ['fruit-trees', 'cereals', 'vegetables'],
    limits: {
      farms: 2,
      parcels: 25,
      users: 5,
      satelliteReports: 0,
    },
    capabilities: {
      analytics: false,
      sensorIntegration: false,
      aiRecommendations: false,
      advancedReporting: false,
      apiAccess: false,
      prioritySupport: false,
    },
    highlighted: false,
    includedAddonSlots: 0,
    addonSlotPrice: 5,
    polarProductId: POLAR_PRODUCT_IDS.essential,
    polarProductIdYearly: POLAR_PRODUCT_IDS.essentialYearly,
    features: [
      'Fruit Trees Management',
      'Cereals Tracking',
      'Vegetables Management',
      '2 farms',
      '25 parcels',
      '5 users',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional Plan',
    nameKey: 'subscription.plans.professional.name',
    description: 'For data-driven farms leveraging analytics and precision agriculture',
    descriptionKey: 'subscription.plans.professional.description',
    // Price aligned with Polar ($75/month, $750/year — 2 months free)
    priceMonthly: 75,
    priceYearly: 750,
    price: '$75',
    priceAmount: 75,
    // Includes Essential + Mushrooms + Livestock (from Polar metadata)
    includedModules: ['fruit-trees', 'cereals', 'vegetables', 'mushrooms', 'livestock'],
    limits: {
      farms: 10,
      parcels: 200,
      users: 25,
      satelliteReports: 10,
    },
    capabilities: {
      analytics: true,
      sensorIntegration: true,
      aiRecommendations: true,
      advancedReporting: true,
      apiAccess: false,
      prioritySupport: false,
    },
    highlighted: true,
    includedAddonSlots: 2,
    addonSlotPrice: 4,
    polarProductId: POLAR_PRODUCT_IDS.professional,
    polarProductIdYearly: POLAR_PRODUCT_IDS.professionalYearly,
    features: [
      'All Essential modules',
      'Mushrooms Management',
      'Livestock Management',
      'Satellite Analysis (10 reports)',
      'AI Recommendations',
      'Sensor Integration',
      '10 farms',
      '200 parcels',
      '25 users',
      '2 addon slots',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    nameKey: 'subscription.plans.enterprise.name',
    description: 'Complete solution for large agricultural operations',
    descriptionKey: 'subscription.plans.enterprise.description',
    // Custom pricing from Polar (minimum $50)
    priceMonthly: 50,
    priceYearly: 500,
    price: 'Custom',
    priceAmount: 50,
    // All modules included
    includedModules: ['*'],
    limits: {
      farms: 999999,
      parcels: 999999,
      users: 999999,
      satelliteReports: 999999,
    },
    capabilities: {
      analytics: true,
      sensorIntegration: true,
      aiRecommendations: true,
      advancedReporting: true,
      apiAccess: true,
      prioritySupport: true,
    },
    highlighted: false,
    includedAddonSlots: 999,
    addonSlotPrice: 0,
    polarProductId: POLAR_PRODUCT_IDS.enterprise,
    polarProductIdYearly: POLAR_PRODUCT_IDS.enterpriseYearly,
    features: [
      'All modules included',
      'Unlimited farms & parcels',
      'Unlimited users',
      'Advanced analytics & AI',
      'API access',
      'Priority support',
      'Custom pricing',
    ],
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get plan bundle details
 */
export function getPlanBundle(planType: PlanType): PlanBundle {
  return PLAN_BUNDLES[planType];
}

/**
 * Get Polar product ID for a plan
 */
export function getPolarProductId(planType: PlanType): string {
  return PLAN_BUNDLES[planType].polarProductId;
}

/**
 * Map module slug to Polar metadata key
 */
export function mapToPolarModule(moduleSlug: string): string {
  return MODULE_POLAR_MAP[moduleSlug] || moduleSlug;
}

/**
 * Map module display name to slug
 * Used when API returns modules with names but no slugs
 * Falls back to lowercase-with-underscores conversion if not in map
 */
export function mapModuleNameToSlug(moduleName: string): string {
  // Try exact match first
  if (MODULE_NAME_TO_SLUG_MAP[moduleName]) {
    return MODULE_NAME_TO_SLUG_MAP[moduleName];
  }

  // Try case-insensitive match
  const lowerCaseName = moduleName.toLowerCase();
  for (const [name, slug] of Object.entries(MODULE_NAME_TO_SLUG_MAP)) {
    if (name.toLowerCase() === lowerCaseName) {
      return slug;
    }
  }

  // Fallback: convert to slug format (lowercase with hyphens)
  return moduleName.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Check if a module is included in a plan
 */
export function isModuleIncludedInPlan(moduleSlug: string, planType: PlanType): boolean {
  const plan = PLAN_BUNDLES[planType];

  // Enterprise includes everything
  if (plan.includedModules[0] === '*') {
    return true;
  }

  return plan.includedModules.includes(moduleSlug);
}

/**
 * Get available modules for a plan
 */
export function getAvailableModulesForPlan(
  planType: PlanType,
  allModules: ModuleSubscriptionConfig[]
): ModuleSubscriptionConfig[] {
  const plan = PLAN_BUNDLES[planType];

  // Enterprise = all modules
  if (plan.includedModules[0] === '*') {
    return allModules;
  }

  // Get modules included in plan or available as addons
  return allModules.filter(m => {
    if (plan.includedModules.includes(m.slug)) return true;
    if (!m.requiredPlan) return true;

    // Check plan hierarchy for modules with required plans
    const planHierarchy: Record<PlanType, number> = {
      essential: 1,
      professional: 2,
      enterprise: 3,
    };

    const requiredLevel = planHierarchy[m.requiredPlan] || 0;
    const currentLevel = planHierarchy[planType] || 0;

    return currentLevel >= requiredLevel;
  });
}

/**
 * Calculate subscription price based on selected modules
 * Uses plan bundle pricing or calculates module-only pricing
 */
export function calculateSubscriptionPrice(
  selectedModules: string[],
  planType?: PlanType,
  allModules?: ModuleSubscriptionConfig[]
): {
  basePrice: number;
  modulesPrice: number;
  totalPrice: number;
  breakdown: Array<{ slug: string; name: string; price: number }>;
} {
  // If using a plan bundle, use bundle pricing
  if (planType && planType !== 'enterprise') {
    const plan = PLAN_BUNDLES[planType];
    const includedModules = plan.includedModules;

    // Calculate additional modules beyond the plan
    const additionalModules = selectedModules.filter(
      m => !includedModules.includes(m) && (includedModules[0] !== '*')
    );

    // Price additional modules from config or use default
    let additionalPrice = 0;
    const breakdown: Array<{ slug: string; name: string; price: number }> = [
      { slug: 'plan', name: plan.name, price: plan.priceMonthly }
    ];

    if (allModules && additionalModules.length > 0) {
      for (const slug of additionalModules) {
        const module = allModules.find(m => m.slug === slug);
        if (module && module.priceMonthly > 0) {
          additionalPrice += module.priceMonthly;
          breakdown.push({ slug, name: module.name, price: module.priceMonthly });
        }
      }
    }

    return {
      basePrice: plan.priceMonthly,
      modulesPrice: additionalPrice,
      totalPrice: plan.priceMonthly + additionalPrice,
      breakdown,
    };
  }

  // Enterprise = custom pricing (contact sales)
  if (planType === 'enterprise') {
    return {
      basePrice: 0,
      modulesPrice: 0,
      totalPrice: 0,
      breakdown: [],
    };
  }

  // Module-only pricing (calculated from module config)
  let modulesPrice = 0;
  const breakdown: Array<{ slug: string; name: string; price: number }> = [];

  if (allModules) {
    for (const slug of selectedModules) {
      const module = allModules.find(m => m.slug === slug);
      if (module && module.priceMonthly > 0) {
        modulesPrice += module.priceMonthly;
        breakdown.push({ slug, name: module.name, price: module.priceMonthly });
      }
    }
  }

  const basePrice = 15; // Base platform fee

  return {
    basePrice,
    modulesPrice,
    totalPrice: basePrice + modulesPrice,
    breakdown,
  };
}

/**
 * Get plan type from Polar product ID
 */
export function getPlanTypeFromPolarId(polarProductId: string): PlanType | null {
  for (const [planType, plan] of Object.entries(PLAN_BUNDLES)) {
    if (plan.polarProductId === polarProductId) {
      return planType as PlanType;
    }
    // Also check yearly product IDs
    if (plan.polarProductIdYearly && plan.polarProductIdYearly === polarProductId) {
      return planType as PlanType;
    }
  }
  return null;
}

/**
 * Get Polar checkout URL for a plan
 */
export function getPolarCheckoutUrl(
  planType: PlanType,
  organizationId?: string,
  successUrl?: string,
  billingInterval: BillingInterval = 'month',
): string {
  const plan = PLAN_BUNDLES[planType];
  const checkoutUrl = import.meta.env.VITE_POLAR_CHECKOUT_URL || 'https://polar.sh/checkout';
  const productId = billingInterval === 'year' && plan.polarProductIdYearly
    ? plan.polarProductIdYearly
    : plan.polarProductId;

  const url = new URL(checkoutUrl);
  url.searchParams.set('product_id', productId);

  if (successUrl) {
    url.searchParams.set('success_url', successUrl);
  }

  if (organizationId) {
    url.searchParams.set('metadata[organization_id]', organizationId);
    url.searchParams.set('metadata[plan_type]', planType);
    url.searchParams.set('metadata[billing_interval]', billingInterval);
  }

  return url.toString();
}
