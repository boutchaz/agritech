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
  async getSubscription(organizationId?: string): Promise<Subscription | null> {
    // Get organization ID from parameter or localStorage
    const orgId = organizationId || getCurrentOrganizationId();
    
    if (!orgId) {
      throw new Error('Organization ID is required. Please select an organization first.');
    }

    // Explicitly pass organization ID in headers to ensure it's included
    // apiClient will merge this with its default headers (auth token, etc.)
    try {
      return await apiClient.get<Subscription | null>('/api/v1/subscriptions', {
        headers: {
          'X-Organization-Id': orgId,
        },
      });
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

