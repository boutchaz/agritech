import { apiClient } from '../lib/api-client';
import { useOrganizationStore } from '../stores/organizationStore';
import { OrganizationRequiredError, ErrorHandlers } from '../lib/errors';
import type { BillingInterval, PlanType } from '@/lib/polar';

export interface Subscription {
  id: string;
  organization_id: string;
  status:
    | 'active'
    | 'canceled'
    | 'past_due'
    | 'trialing'
    | 'paused'
    | 'suspended'
    | 'terminated'
    | 'pending_renewal';
  plan_id: string | null;
  plan_type: 'core' | 'essential' | 'professional' | 'enterprise' | null;
  formula: PlanType | null;
  billing_interval: string | null;
  billing_cycle: BillingInterval | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  max_farms: number | null;
  max_parcels: number | null;
  max_users: number | null;
  max_satellite_reports: number | null;
  contracted_hectares: number | null;
  included_users: number | null;
  contract_start_at: string | null;
  contract_end_at: string | null;
  renewal_notice_days: number | null;
  payment_terms_days: number | null;
  next_billing_at: string | null;
  grace_period_ends_at: string | null;
  suspended_at: string | null;
  terminated_at: string | null;
  pending_formula: PlanType | null;
  pending_billing_cycle: BillingInterval | null;
  pending_pricing_snapshot: Record<string, unknown> | null;
  migration_effective_at: string | null;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number | null;
  currency: string | null;
  vat_rate: number | null;
  price_ht_per_ha_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  farms_count: number;
  parcels_count: number;
  users_count: number;
  satellite_reports_count: number;
  hectares_count: number;
}

export interface SubscriptionCatalog {
  billingCycles: BillingInterval[];
  formulas: Array<{
    formula: PlanType;
    minHectaresExclusive: number | null;
    maxHectaresInclusive: number | null;
    includedUsers: number | null;
    supportLevel: string;
    slaAvailable: boolean;
    agromindIaLevel: string;
    marketplaceMode: string;
  }>;
  currency: string;
  vatRate: number;
}

export interface QuoteResponse {
  formula: PlanType;
  contractedHectares: number;
  includedUsers: number | null;
  billingCycle: BillingInterval;
  currency: string;
  vatRate: number;
  priceHtPerHaYear: number;
  annualAmountHt: number;
  cycleAmountHt: number;
  cycleAmountTva: number;
  cycleAmountTtc: number;
  installmentCountPerYear: number;
  discountPercent: number;
}

export type CheckoutPlanType =
  | PlanType
  | 'core'
  | 'essential'
  | 'professional';

function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization =
      useOrganizationStore.getState().currentOrganization;
    const orgId = currentOrganization?.id || null;

    if (!orgId) {
      const orgStr = localStorage.getItem('currentOrganization');
      if (orgStr) {
        const org = JSON.parse(orgStr);
        return org.id || null;
      }
    }

    return orgId;
  } catch (error) {
    ErrorHandlers.log(error, 'Error reading organization from store');
    return null;
  }
}

class SubscriptionsService {
  async getSubscription(organizationId?: string): Promise<Subscription | null> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    try {
      return await apiClient.get<Subscription | null>(
        '/api/v1/subscriptions',
        {},
        orgId,
      );
    } catch (error) {
      ErrorHandlers.log(error, '[SubscriptionsService] Error fetching subscription');
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getCurrentSubscription(
    organizationId?: string,
  ): Promise<Subscription | null> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    return apiClient.get<Subscription | null>(
      '/api/v1/subscriptions/current',
      {},
      orgId,
    );
  }

  async createCheckout(
    formula: CheckoutPlanType,
    contractedHectares: number,
    organizationId?: string,
    billingInterval: BillingInterval = 'monthly',
  ): Promise<{
    checkoutUrl: string;
    formula: PlanType;
    billingCycle: BillingInterval;
    quoteSnapshot: Record<string, unknown>;
  }> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    return apiClient.post(
      '/api/v1/subscriptions/checkout',
      {
        formula,
        planType: formula,
        billingInterval,
        contractedHectares,
      },
      {},
      orgId,
    );
  }

  async createQuote(
    formula: PlanType,
    contractedHectares: number,
    billingCycle: BillingInterval,
    organizationId?: string,
  ): Promise<QuoteResponse> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    return apiClient.post<QuoteResponse>(
      '/api/v1/subscriptions/quote',
      {
        formula,
        contractedHectares,
        billingCycle,
      },
      {},
      orgId,
    );
  }

  async getCatalog(organizationId?: string): Promise<SubscriptionCatalog> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    return apiClient.get<SubscriptionCatalog>(
      '/api/v1/subscriptions/catalog',
      {},
      orgId,
    );
  }

  async registerRenewalNotice(
    organizationId: string,
    note?: string,
  ): Promise<{ success: boolean }> {
    return apiClient.post(
      '/api/v1/subscriptions/renewal/notice',
      {
        organizationId,
        note,
      },
      {},
      organizationId,
    );
  }

  async terminate(
    organizationId: string,
    reason?: string,
  ): Promise<{ success: boolean; terminatedAt: string; exportDeadline: string }> {
    return apiClient.post(
      '/api/v1/subscriptions/terminate',
      {
        organizationId,
        reason,
      },
      {},
      organizationId,
    );
  }

  async getUsage(organizationId?: string): Promise<SubscriptionUsage> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    return apiClient.get<SubscriptionUsage>(
      '/api/v1/subscriptions/usage',
      {},
      orgId,
    );
  }
}

export const subscriptionsService = new SubscriptionsService();
