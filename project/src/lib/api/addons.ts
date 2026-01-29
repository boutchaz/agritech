import { apiClient } from '../api-client';
import type { PlanType } from '../polar';

export interface AddonModule {
  id: string;
  name: string;
  icon?: string;
  category?: string;
  description?: string;
  required_plan?: PlanType;
  is_addon_eligible: boolean;
  addon_price_monthly?: number;
  addon_product_id?: string;
}

export interface OrganizationAddon {
  id: string;
  organization_id: string;
  module_id: string;
  module: AddonModule;
  polar_subscription_id?: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'paused';
  price_monthly?: number;
  started_at: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
}

export interface AddonSlots {
  included: number;
  additional: number;
  total: number;
  used: number;
  available: number;
}

export interface AddonsOverview {
  slots: AddonSlots;
  active_addons: OrganizationAddon[];
  available_addons: AddonModule[];
}

export interface PurchaseAddonInput {
  module_id: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CancelAddonInput {
  module_id: string;
  cancel_immediately?: boolean;
}

export interface CheckoutResponse {
  checkout_url: string;
  addon_id?: string;
}

export interface CancelResponse {
  success: boolean;
  message: string;
}

export const addonsApi = {
  async getOverview(organizationId: string): Promise<AddonsOverview> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<AddonsOverview>('/api/v1/addons', {}, organizationId);
  },

  async getActiveAddons(organizationId: string): Promise<OrganizationAddon[]> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<OrganizationAddon[]>('/api/v1/addons/active', {}, organizationId);
  },

  async getAvailableAddons(organizationId: string): Promise<AddonModule[]> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<AddonModule[]>('/api/v1/addons/available', {}, organizationId);
  },

  async getSlots(organizationId: string): Promise<AddonSlots> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<AddonSlots>('/api/v1/addons/slots', {}, organizationId);
  },

  async purchase(
    organizationId: string,
    data: PurchaseAddonInput,
  ): Promise<CheckoutResponse> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.post<CheckoutResponse>(
      '/api/v1/addons/purchase',
      data,
      {},
      organizationId,
    );
  },

  async cancel(
    organizationId: string,
    data: CancelAddonInput,
  ): Promise<CancelResponse> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.post<CancelResponse>(
      '/api/v1/addons/cancel',
      data,
      {},
      organizationId,
    );
  },
};
