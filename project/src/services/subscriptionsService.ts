import { apiClient } from '../lib/api-client';

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
 * Get the current organization ID from localStorage
 */
function getCurrentOrganizationId(): string | null {
  try {
    const orgStr = localStorage.getItem('currentOrganization');
    if (orgStr) {
      const org = JSON.parse(orgStr);
      return org.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading organization from localStorage:', error);
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
      throw new Error('Organization ID is required. Please select an organization first.');
    }

    // Pass organization ID from React context to apiClient
    // This ensures the header is always included, even if localStorage is not set
    try {
      // Pass organizationId as 3rd parameter to apiClient.get()
      return await apiClient.get<Subscription | null>('/api/v1/subscriptions', {}, orgId);
    } catch (error) {
      // Handle 404 as null (no subscription found is expected)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }
}

export const subscriptionsService = new SubscriptionsService();

