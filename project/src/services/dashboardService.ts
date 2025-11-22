import { apiClient } from '../lib/api-client';

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

        return apiClient.get<DashboardSummary>(url.pathname + url.search);
    }

    async getWidgetData(widgetType: string): Promise<WidgetData> {
        const organizationId = getCurrentOrganizationId();
        
        if (!organizationId) {
            throw new Error('Organization ID is required. Please select an organization first.');
        }

        const url = new URL(`/api/v1/dashboard/widgets/${widgetType}`, 'http://dummy');
        url.searchParams.append('organization_id', organizationId);

        return apiClient.get<WidgetData>(url.pathname + url.search);
    }
}

export const dashboardService = new DashboardService();
