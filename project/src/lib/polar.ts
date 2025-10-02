import { Polar } from '@polar-sh/sdk';
import { SUBSCRIPTION_CONFIG } from '../config/subscription';

// Initialize Polar SDK with sandbox support
export const polar = new Polar({
  accessToken: import.meta.env.VITE_POLAR_ACCESS_TOKEN,
  server: import.meta.env.VITE_POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
});

export type PlanType = 'essential' | 'professional' | 'enterprise';

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
  availableModules: string[]; // Module IDs that are available in this plan
  highlighted?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<PlanType, PlanDetails> = {
  essential: {
    id: 'essential',
    name: 'Essential Plan',
    price: '$25',
    priceAmount: 25,
    description: 'Perfect for small commercial farms digitizing their operations',
    features: [
      '3 Agriculture Modules: Fruit Trees, Cereals, Vegetables',
      '2 Farms, 25 Parcels',
      '5 User Accounts',
      'Full Dashboard & Parcel Management',
      'Employee & Day Laborer Management',
      'Stock Management',
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
    availableModules: ['fruit-trees', 'cereals', 'vegetables'],
  },
  professional: {
    id: 'professional',
    name: 'Professional Plan',
    price: '$75',
    priceAmount: 75,
    description: 'For data-driven farms leveraging analytics and precision agriculture',
    features: [
      '5 Modules: Essential + Mushrooms, Livestock',
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
    availableModules: ['fruit-trees', 'cereals', 'vegetables', 'mushrooms', 'livestock'],
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
      'Full Financial Suite',
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

export function getPlanDetails(planType: PlanType): PlanDetails {
  return SUBSCRIPTION_PLANS[planType];
}

export function canAccessFeature(
  subscription: { plan_type: PlanType } | null,
  feature: keyof PlanDetails['capabilities']
): boolean {
  if (!subscription) return false;
  const plan = getPlanDetails(subscription.plan_type);
  return plan.capabilities[feature];
}

export function hasReachedLimit(
  subscription: { plan_type: PlanType } | null,
  usage: number,
  limitType: keyof PlanDetails['limits']
): boolean {
  if (!subscription) return true;
  const plan = getPlanDetails(subscription.plan_type);
  return usage >= plan.limits[limitType];
}

export function isModuleAvailable(
  subscription: { plan_type: PlanType } | null,
  moduleId: string
): boolean {
  if (!subscription) return false;
  const plan = getPlanDetails(subscription.plan_type);

  // Check if plan has all modules
  if (plan.availableModules.includes('*')) return true;

  // Check if module is in the available modules list
  return plan.availableModules.includes(moduleId);
}

export function getCheckoutUrl(_planType: PlanType): string {
  // Use the configured checkout URL from environment
  const checkoutUrl = import.meta.env.VITE_POLAR_CHECKOUT_URL;

  if (!checkoutUrl) {
    throw new Error('VITE_POLAR_CHECKOUT_URL is not configured');
  }

  // For now, return the same checkout URL for all plans
  // You can customize this per plan if needed
  return checkoutUrl;
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
