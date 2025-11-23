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
    const orgId = organizationId || getCurrentOrganizationId();
    
    if (!orgId) {
      throw new Error('Organization ID is required. Please select an organization first.');
    }

    const url = new URL('/api/v1/subscriptions', 'http://dummy');
    url.searchParams.append('organization_id', orgId);

    const result = await apiClient.get<Subscription | null>(url.pathname + url.search);
    return result;
  }
}

export const subscriptionsService = new SubscriptionsService();

