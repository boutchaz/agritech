import { apiClient } from '../lib/api-client';
import { useOrganizationStore } from '../stores/organizationStore';
import { OrganizationRequiredError, ErrorHandlers } from '../lib/errors';

export interface Subscription {
  id: string;
  organization_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  plan_id: string | null;
  plan_type: 'essential' | 'professional' | 'enterprise' | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current organization ID from Zustand store
 * This uses the same store as api-client.ts to ensure consistency
 */
function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization = useOrganizationStore.getState().currentOrganization;
    const orgId = currentOrganization?.id || null;

    // Also check localStorage as fallback for backwards compatibility
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
  /**
   * Get subscription for an organization
   * @param organizationId - Organization ID from React context (preferred) or localStorage fallback
   */
  async getSubscription(organizationId?: string): Promise<Subscription | null> {
    // Get organization ID from parameter (from React context) or localStorage fallback
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    // Pass organization ID from React context to apiClient
    // This ensures the header is always included, even if localStorage is not set
    try {
      // Pass organizationId as 3rd parameter to apiClient.get()
      return await apiClient.get<Subscription | null>('/api/v1/subscriptions', {}, orgId);
    } catch (error) {
      ErrorHandlers.log(error, '[SubscriptionsService] Error fetching subscription');
      // Handle 404 as null (no subscription found is expected)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }
}

export const subscriptionsService = new SubscriptionsService();

