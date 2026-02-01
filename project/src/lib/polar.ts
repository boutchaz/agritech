import { Polar } from '@polar-sh/sdk';
import { SUBSCRIPTION_CONFIG } from '../config/subscription';

// Initialize Polar SDK with sandbox support
const polarAccessToken = import.meta.env?.VITE_POLAR_ACCESS_TOKEN;
const polarServer = import.meta.env?.VITE_POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production';

export const polar = polarAccessToken
  ? new Polar({
      accessToken: polarAccessToken,
      server: polarServer,
    })
  : null;

export type PlanType = 'essential' | 'professional' | 'enterprise';

// Backend may return 'starter' which maps to 'essential'
type BackendPlanType = PlanType | 'starter';

/**
 * Normalize backend plan type to frontend plan type
 */
export function normalizePlanType(planType: BackendPlanType | null | undefined): PlanType | null {
  if (!planType) return null;
  // Map 'starter' to 'essential' for backward compatibility
  return planType === 'starter' ? 'essential' : planType as PlanType;
}

/**
 * Plan hierarchy for determining feature/module access
 * Higher number = higher tier plan
 */
export const PLAN_HIERARCHY: Record<PlanType, number> = {
  essential: 1,
  professional: 2,
  enterprise: 3,
} as const;

/**
 * Module category labels for display
 * Matches database module categories
 */
export const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  operations: 'Operations',
  finance: 'Finance',
  analytics: 'Analytics',
  compliance: 'Compliance',
  marketplace: 'Marketplace',
  // Legacy labels for backwards compatibility
  production: 'Production',
  hr: 'HR & Personnel',
  inventory: 'Inventory',
  sales: 'Sales',
  purchasing: 'Purchasing',
  accounting: 'Accounting & Finance',
  general: 'General',
} as const;

export interface PlanDetails {
  id: PlanType;
  name: string;
  price: string;
  priceAmount: number;
  description: string;
  features: string[];
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
  availableModules: string[]; // Module slugs from database (farm_management, inventory, etc.)
  highlighted?: boolean;
}

/**
 * Module slugs that match the database modules table
 * These are the canonical module identifiers used throughout the system
 */
export const MODULE_SLUGS = {
  FARM_MANAGEMENT: 'farm_management',
  INVENTORY: 'inventory',
  SALES: 'sales',
  PROCUREMENT: 'procurement',
  ACCOUNTING: 'accounting',
  HR: 'hr',
  ANALYTICS: 'analytics',
  COMPLIANCE: 'compliance',
  MARKETPLACE: 'marketplace',
} as const;

export const SUBSCRIPTION_PLANS: Record<PlanType, PlanDetails> = {
  essential: {
    id: 'essential',
    name: 'Essential Plan',
    price: '$25',
    priceAmount: 25,
    description: 'Perfect for small commercial farms digitizing their operations',
    features: [
      'Core Farm Management Module',
      '2 Farms, 25 Parcels',
      '5 User Accounts',
      'Full Dashboard & Parcel Management',
      'Employee & Day Laborer Management',
      'Product Application Tracking',
      'Weather Forecast',
      'Unlimited Manual Analyses (Soil, Plant, Water)',
    ],
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
    availableModules: [
      MODULE_SLUGS.FARM_MANAGEMENT,
      MODULE_SLUGS.HR,
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional Plan',
    price: '$75',
    priceAmount: 75,
    description: 'For data-driven farms leveraging analytics and precision agriculture',
    features: [
      'All Essential Modules Plus: Inventory, Sales, Procurement',
      '10 Farms, 200 Parcels',
      '25 User Accounts',
      'Satellite Indices Analysis (10/month)',
      'Sensor Chart Integration',
      'AI Recommendations Engine',
      'Advanced Reporting Module',
      'Task Management & Scheduling',
    ],
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
    availableModules: [
      MODULE_SLUGS.FARM_MANAGEMENT,
      MODULE_SLUGS.INVENTORY,
      MODULE_SLUGS.SALES,
      MODULE_SLUGS.PROCUREMENT,
      MODULE_SLUGS.HR,
      MODULE_SLUGS.ANALYTICS,
    ],
    highlighted: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Agri-Business Plan',
    price: 'Contact Us',
    priceAmount: 0,
    description: 'For large enterprises with complex agricultural operations',
    features: [
      'All Modules Unlocked',
      'Unlimited Farms, Parcels & Users',
      'Unlimited Satellite Reports',
      'Full Financial Suite (Accounting)',
      'Compliance & Certifications Management',
      'Online Marketplace Integration',
      'Predictive Analytics',
      'Yield & Disease Forecasting',
      'Equipment Management',
      'API Access for Integrations',
      'Priority Support & Onboarding',
    ],
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
    availableModules: ['*'], // All modules available
  },
};

export function getPlanDetails(planType: BackendPlanType): PlanDetails {
  const normalized = normalizePlanType(planType);
  if (!normalized) {
    // Return a default/empty plan if planType is invalid
    return SUBSCRIPTION_PLANS.professional; // Default to professional
  }
  return SUBSCRIPTION_PLANS[normalized];
}

export function canAccessFeature(
  subscription: { plan_type: BackendPlanType | null } | null,
  feature: keyof PlanDetails['capabilities']
): boolean {
  if (!subscription || !subscription.plan_type) return false;
  const plan = getPlanDetails(subscription.plan_type);
  return plan.capabilities[feature];
}

export function hasReachedLimit(
  subscription: { plan_type: BackendPlanType | null } | null,
  usage: number,
  limitType: keyof PlanDetails['limits']
): boolean {
  if (!subscription || !subscription.plan_type) return true;
  const plan = getPlanDetails(subscription.plan_type);
  return usage >= plan.limits[limitType];
}

export function isModuleAvailable(
  subscription: { plan_type: BackendPlanType | null } | null,
  moduleId: string
): boolean {
  if (!subscription || !subscription.plan_type) return false;
  const plan = getPlanDetails(subscription.plan_type);

  // Check if plan has all modules
  if (plan.availableModules.includes('*')) return true;

  // Check if module is in the available modules list
  return plan.availableModules.includes(moduleId);
}

/**
 * Check if a module is available for a given plan based on required_plan field.
 * This is used for modules from the database API that have a required_plan property.
 *
 * @param module - Module object with optional required_plan property
 * @param subscription - Current subscription with plan_type
 * @returns true if module is available (no required_plan OR current plan meets requirement)
 */
export function isModuleAvailableForPlan(
  module: { required_plan?: BackendPlanType | null },
  subscription: { plan_type: BackendPlanType | null } | null
): boolean {
  // If no required_plan, module is available to everyone
  if (!module.required_plan) return true;

  // If no subscription, module is not available
  if (!subscription || !subscription.plan_type) return false;

  // Normalize plan types
  const normalizedCurrent = normalizePlanType(subscription.plan_type);
  const normalizedRequired = normalizePlanType(module.required_plan);

  if (!normalizedCurrent || !normalizedRequired) return false;

  // Enterprise plan has access to everything
  if (normalizedCurrent === 'enterprise') return true;

  // Check plan hierarchy
  const requiredLevel = PLAN_HIERARCHY[normalizedRequired] || 0;
  const currentLevel = PLAN_HIERARCHY[normalizedCurrent] || 0;

  return currentLevel >= requiredLevel;
}

/**
 * Check if a plan tier is higher than another
 */
export function isPlanHigherTier(currentPlan: BackendPlanType, requiredPlan: BackendPlanType): boolean {
  const normalizedCurrent = normalizePlanType(currentPlan);
  const normalizedRequired = normalizePlanType(requiredPlan);

  if (!normalizedCurrent || !normalizedRequired) return false;

  return PLAN_HIERARCHY[normalizedCurrent] >= PLAN_HIERARCHY[normalizedRequired];
}

export function getCheckoutUrl(planType: PlanType, organizationId?: string): string {
  return getProductCheckoutUrl(getPlanProductId(planType), organizationId, planType);
}

function getEnvValue(key: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined> | undefined;
  return env?.[key];
}

function getPlanProductId(planType: PlanType): string | undefined {
  const productIds: Record<PlanType, string | undefined> = {
    essential: getEnvValue('VITE_POLAR_ESSENTIAL_PRODUCT_ID') || '3b03769f-9a47-47bc-8f07-bd1f3a580dee',
    professional: getEnvValue('VITE_POLAR_PROFESSIONAL_PRODUCT_ID') || 'db925c1e-d64d-4d95-9907-dc90da5bcbe6',
    enterprise: getEnvValue('VITE_POLAR_ENTERPRISE_PRODUCT_ID') || 'd53c78fb-5833-43da-a4f0-2a0bd2ff32c9',
  };

  return productIds[planType];
}

function slugToEnvKey(slug: string) {
  return slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

export function getCoreCheckoutUrl(organizationId?: string): string {
  const productId = getEnvValue('VITE_POLAR_BASE_PRODUCT_ID');
  return getProductCheckoutUrl(productId, organizationId, 'core');
}

export function getAddonCheckoutUrl(moduleSlug: string, organizationId?: string): string {
  const key = `VITE_POLAR_ADDON_${slugToEnvKey(moduleSlug)}_PRODUCT_ID`;
  const productId = getEnvValue(key);
  return getProductCheckoutUrl(productId, organizationId, moduleSlug);
}

function getProductCheckoutUrl(
  productId: string | undefined,
  organizationId?: string,
  planOrModule?: string,
): string {
  // Use the configured checkout URL from environment
  const checkoutUrl = getEnvValue('VITE_POLAR_CHECKOUT_URL');

  if (!checkoutUrl) {
    throw new Error('VITE_POLAR_CHECKOUT_URL is not configured');
  }

  if (!productId) {
    throw new Error('Polar product ID is not configured');
  }

  // Construct checkout URL with parameters
  const url = new URL(checkoutUrl);

  // Add product ID if available
  if (productId) {
    url.searchParams.set('product_id', productId);
  }

  // Add success redirect URL
  const successUrl = `${window.location.origin}/checkout-success`;
  url.searchParams.set('success_url', successUrl);

  // Add organization ID to metadata if provided
  if (organizationId) {
    url.searchParams.set('metadata[organization_id]', organizationId);
    if (planOrModule) {
      url.searchParams.set('metadata[plan_type]', planOrModule);
    }
  }

  return url.toString();
}

export function isSubscriptionValid(
  subscription: {
    status: string;
    current_period_end: string | null;
    created_at?: string;
  } | null | undefined
): boolean {
  // IMPORTANT: ALL organizations require a valid subscription
  // No grandfathering - both old and new organizations must have active subscriptions
  if (!subscription) {
    return false; // No subscription = blocked
  }

  // Check if subscription status is active or trialing
  if (!['active', 'trialing'].includes(subscription.status)) {
    return false;
  }

  // Check if subscription hasn't expired (with grace period)
  if (subscription.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();

    // Add grace period days
    const endDateWithGrace = new Date(endDate);
    endDateWithGrace.setDate(endDateWithGrace.getDate() + SUBSCRIPTION_CONFIG.GRACE_PERIOD_DAYS);

    if (endDateWithGrace < now) {
      return false;
    }
  }

  return true;
}
