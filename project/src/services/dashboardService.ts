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

class DashboardService {
    async getDashboardSummary(farmId?: string): Promise<DashboardSummary> {
        let endpoint = '/api/v1/dashboard/summary';
        
        if (farmId) {
            const url = new URL(endpoint, 'http://dummy');
            url.searchParams.append('farmId', farmId);
            endpoint = url.pathname + url.search;
        }

        return apiClient.get<DashboardSummary>(endpoint);
    }

    async getWidgetData(widgetType: string): Promise<WidgetData> {
        return apiClient.get<WidgetData>(`/api/v1/dashboard/widgets/${widgetType}`);
    }
}

export const dashboardService = new DashboardService();
