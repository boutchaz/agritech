import { SUBSCRIPTION_CONFIG } from '../config/subscription';

export type PlanType = 'starter' | 'standard' | 'premium' | 'enterprise';
export type LegacyPlanType = 'core' | 'essential' | 'professional' | 'enterprise';
export type BillingInterval = 'monthly' | 'semiannual' | 'annual';

export type BackendPlanType = PlanType | LegacyPlanType;
export type BackendBillingInterval =
  | BillingInterval
  | 'month'
  | 'year'
  | 'yearly'
  | 'semestrial';

export const PLAN_HIERARCHY: Record<PlanType, number> = {
  starter: 1,
  standard: 2,
  premium: 3,
  enterprise: 4,
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  operations: 'Operations',
  finance: 'Finance',
  analytics: 'Analytics',
  compliance: 'Compliance',
  marketplace: 'Marketplace',
  production: 'Production',
  hr: 'HR & Personnel',
  inventory: 'Inventory',
  sales: 'Sales',
  purchasing: 'Purchasing',
  accounting: 'Accounting & Finance',
  general: 'General',
  agriculture: 'Agriculture',
  elevage: 'Élevage',
} as const;

export interface PlanDetails {
  id: PlanType;
  name: string;
  description: string;
  pricePerHaYearHt: number;
  features: string[];
  limits: {
    minHectaresExclusive: number | null;
    maxHectaresInclusive: number | null;
    includedUsers: number | null;
  };
  capabilities: {
    analytics: boolean;
    sensorIntegration: boolean;
    aiRecommendations: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  supportLevel: string;
  marketplaceMode: string;
  slaAvailable: boolean;
  agromindIaLevel: string;
  availableModules: string[];
  highlighted?: boolean;
}

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
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For small farms beginning digital management.',
    pricePerHaYearHt: 110,
    features: [
      'Up to 50 hectares',
      '3 included users',
      'Core operations module set',
      'Email support',
      'AgromindIA basic insights',
    ],
    limits: {
      minHectaresExclusive: null,
      maxHectaresInclusive: 50,
      includedUsers: 3,
    },
    capabilities: {
      analytics: false,
      sensorIntegration: false,
      aiRecommendations: false,
      advancedReporting: false,
      apiAccess: false,
      prioritySupport: false,
    },
    supportLevel: 'Email support',
    marketplaceMode: 'Read-only',
    slaAvailable: false,
    agromindIaLevel: 'Basic',
    availableModules: [MODULE_SLUGS.FARM_MANAGEMENT, MODULE_SLUGS.HR],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'For growing organizations operating at scale.',
    pricePerHaYearHt: 95,
    features: [
      '50 to 200 hectares',
      '10 included users',
      'Operations + inventory + sales',
      'Priority email support',
      'AgromindIA advanced insights',
    ],
    limits: {
      minHectaresExclusive: 50,
      maxHectaresInclusive: 200,
      includedUsers: 10,
    },
    capabilities: {
      analytics: true,
      sensorIntegration: true,
      aiRecommendations: true,
      advancedReporting: false,
      apiAccess: false,
      prioritySupport: false,
    },
    supportLevel: 'Priority email support',
    marketplaceMode: 'Buyer + seller access',
    slaAvailable: false,
    agromindIaLevel: 'Advanced',
    availableModules: [
      MODULE_SLUGS.FARM_MANAGEMENT,
      MODULE_SLUGS.HR,
      MODULE_SLUGS.INVENTORY,
      MODULE_SLUGS.SALES,
      MODULE_SLUGS.PROCUREMENT,
    ],
    highlighted: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For advanced operators requiring SLA-backed service.',
    pricePerHaYearHt: 80,
    features: [
      '200 to 500 hectares',
      '25 included users',
      'Full production + analytics stack',
      'Phone priority support',
      'SLA-backed service',
    ],
    limits: {
      minHectaresExclusive: 200,
      maxHectaresInclusive: 500,
      includedUsers: 25,
    },
    capabilities: {
      analytics: true,
      sensorIntegration: true,
      aiRecommendations: true,
      advancedReporting: true,
      apiAccess: false,
      prioritySupport: true,
    },
    supportLevel: 'Phone priority support',
    marketplaceMode: 'Full mode',
    slaAvailable: true,
    agromindIaLevel: 'Expert',
    availableModules: [
      MODULE_SLUGS.FARM_MANAGEMENT,
      MODULE_SLUGS.HR,
      MODULE_SLUGS.INVENTORY,
      MODULE_SLUGS.SALES,
      MODULE_SLUGS.PROCUREMENT,
      MODULE_SLUGS.ANALYTICS,
      MODULE_SLUGS.COMPLIANCE,
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large agri-businesses with custom governance and support.',
    pricePerHaYearHt: 65,
    features: [
      'More than 500 hectares',
      'Unlimited users',
      'All modules unlocked',
      'Dedicated customer success manager',
      'Enterprise SLA',
    ],
    limits: {
      minHectaresExclusive: 500,
      maxHectaresInclusive: null,
      includedUsers: null,
    },
    capabilities: {
      analytics: true,
      sensorIntegration: true,
      aiRecommendations: true,
      advancedReporting: true,
      apiAccess: true,
      prioritySupport: true,
    },
    supportLevel: 'Dedicated CSM',
    marketplaceMode: 'Full mode',
    slaAvailable: true,
    agromindIaLevel: 'Enterprise',
    availableModules: ['*'],
  },
};

export function normalizePlanType(
  planType: BackendPlanType | null | undefined,
): PlanType | null {
  if (!planType) {
    return null;
  }

  if (['starter', 'standard', 'premium', 'enterprise'].includes(planType)) {
    return planType as PlanType;
  }

  if (planType === 'core' || planType === 'essential') {
    return 'starter';
  }

  if (planType === 'professional') {
    return 'standard';
  }

  return null;
}

export function normalizeBillingInterval(
  billingInterval: BackendBillingInterval | null | undefined,
): BillingInterval {
  if (!billingInterval) {
    return 'monthly';
  }

  if (billingInterval === 'monthly' || billingInterval === 'month') {
    return 'monthly';
  }

  if (
    billingInterval === 'annual' ||
    billingInterval === 'year' ||
    billingInterval === 'yearly'
  ) {
    return 'annual';
  }

  if (billingInterval === 'semiannual' || billingInterval === 'semestrial') {
    return 'semiannual';
  }

  return 'monthly';
}

export function getPlanDetails(planType: BackendPlanType): PlanDetails {
  const normalized = normalizePlanType(planType);
  if (!normalized) {
    return SUBSCRIPTION_PLANS.standard;
  }
  return SUBSCRIPTION_PLANS[normalized];
}

export function getDefaultHectaresForPlan(planType: PlanType): number {
  if (planType === 'starter') return 50;
  if (planType === 'standard') return 200;
  if (planType === 'premium') return 500;
  return 501;
}

function getCycleDivisor(billingInterval: BillingInterval): number {
  if (billingInterval === 'monthly') {
    return 12;
  }

  if (billingInterval === 'semiannual') {
    return 2;
  }

  return 1;
}

export function getEstimatedPricing(
  planType: PlanType,
  contractedHectares: number,
  billingInterval: BillingInterval,
  vatRate = 0.2,
) {
  const plan = SUBSCRIPTION_PLANS[planType];
  const annualHt = contractedHectares * plan.pricePerHaYearHt;
  const cycleHt = annualHt / getCycleDivisor(billingInterval);
  const cycleTva = cycleHt * vatRate;
  const cycleTtc = cycleHt + cycleTva;

  return {
    annualHt: Math.round(annualHt * 100) / 100,
    cycleHt: Math.round(cycleHt * 100) / 100,
    cycleTva: Math.round(cycleTva * 100) / 100,
    cycleTtc: Math.round(cycleTtc * 100) / 100,
  };
}

export function canAccessFeature(
  subscription: { formula?: BackendPlanType | null; plan_type?: BackendPlanType | null } | null,
  feature: keyof PlanDetails['capabilities'],
): boolean {
  const formula = normalizePlanType(
    subscription?.formula || subscription?.plan_type || null,
  );

  if (!formula) return false;
  return SUBSCRIPTION_PLANS[formula].capabilities[feature];
}

export function isModuleAvailable(
  subscription: { formula?: BackendPlanType | null; plan_type?: BackendPlanType | null } | null,
  moduleId: string,
): boolean {
  const formula = normalizePlanType(
    subscription?.formula || subscription?.plan_type || null,
  );

  if (!formula) return false;
  const plan = SUBSCRIPTION_PLANS[formula];

  if (plan.availableModules.includes('*')) {
    return true;
  }

  return plan.availableModules.includes(moduleId);
}

export function isModuleAvailableForPlan(
  module: { required_plan?: BackendPlanType | null },
  subscription: { plan_type?: BackendPlanType | null; formula?: BackendPlanType | null },
): boolean {
  if (!module.required_plan) return true;

  const currentPlan = normalizePlanType(
    subscription.formula || subscription.plan_type || null,
  );
  const requiredPlan = normalizePlanType(module.required_plan);

  if (!currentPlan || !requiredPlan) return false;

  if (currentPlan === 'enterprise') return true;

  return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
}

export function isPlanHigherTier(
  currentPlan: BackendPlanType,
  requiredPlan: BackendPlanType,
): boolean {
  const normalizedCurrent = normalizePlanType(currentPlan);
  const normalizedRequired = normalizePlanType(requiredPlan);

  if (!normalizedCurrent || !normalizedRequired) return false;

  return PLAN_HIERARCHY[normalizedCurrent] >= PLAN_HIERARCHY[normalizedRequired];
}

export function isSubscriptionValid(
  subscription: {
    status: string;
    current_period_end: string | null;
    grace_period_ends_at?: string | null;
  } | null | undefined,
): boolean {
  if (!subscription) {
    return false;
  }

  if (!['active', 'trialing', 'pending_renewal'].includes(subscription.status)) {
    return false;
  }

  if (subscription.grace_period_ends_at) {
    return new Date(subscription.grace_period_ends_at) >= new Date();
  }

  if (subscription.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    const endDateWithGrace = new Date(endDate);
    endDateWithGrace.setDate(
      endDateWithGrace.getDate() + SUBSCRIPTION_CONFIG.GRACE_PERIOD_DAYS,
    );

    if (endDateWithGrace < new Date()) {
      return false;
    }
  }

  return true;
}
