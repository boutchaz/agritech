import { apiClient } from '../lib/api-client';
import { useOrganizationStore } from '../stores/organizationStore';

export interface DashboardSummary {
    parcels: {
        total: number;
        totalArea: number;
        byCrop: Record<string, number>;
    };
    tasks: {
        total: number;
        inProgress: number;
        completed: number;
        upcoming: number;
    };
    workers: {
        total: number;
        active: number;
        workingToday: number;
    };
    harvests: {
        thisMonth: number;
        thisMonthQuantity: number;
        total: number;
    };
    inventory: {
        total: number;
        lowStock: number;
    };
}

export interface WidgetData {
    type: string;
    data: unknown;
}

/**
 * Get the current organization ID from Zustand store
 * This matches the approach used in api-client.ts for consistency
 */
function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization = useOrganizationStore.getState().currentOrganization;
    return currentOrganization?.id || null;
  } catch (error) {
    console.error('[DashboardService] Error reading organization from store:', error);
    return null;
  }
}

class DashboardService {
    async getDashboardSummary(farmId?: string): Promise<DashboardSummary> {
        const organizationId = getCurrentOrganizationId();

        if (!organizationId) {
            throw new Error('Organization ID is required. Please select an organization first.');
        }

        const url = new URL('/api/v1/dashboard/summary', 'http://dummy');
        url.searchParams.append('organization_id', organizationId);

        if (farmId) {
            url.searchParams.append('farmId', farmId);
        }

        // Pass organizationId in header as well
        return apiClient.get<DashboardSummary>(
            url.pathname + url.search,
            {},
            organizationId
        );
    }

    async getWidgetData(widgetType: string): Promise<WidgetData> {
        const organizationId = getCurrentOrganizationId();

        if (!organizationId) {
            throw new Error('Organization ID is required. Please select an organization first.');
        }

        const url = new URL(`/api/v1/dashboard/widgets/${widgetType}`, 'http://dummy');
        url.searchParams.append('organization_id', organizationId);

        // Pass organizationId in header as well
        return apiClient.get<WidgetData>(
            url.pathname + url.search,
            {},
            organizationId
        );
    }
}

export const dashboardService = new DashboardService();
