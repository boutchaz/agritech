import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    data: any;
}

class DashboardService {
    private async getAuthHeaders(): Promise<HeadersInit> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('No active session');
        }

        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        };
    }

    async getDashboardSummary(farmId?: string): Promise<DashboardSummary> {
        const headers = await this.getAuthHeaders();
        const url = new URL(`${API_URL}/dashboard/summary`);

        if (farmId) {
            url.searchParams.append('farmId', farmId);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || 'Failed to fetch dashboard summary');
        }

        return response.json();
    }

    async getWidgetData(widgetType: string): Promise<WidgetData> {
        const headers = await this.getAuthHeaders();
        const url = `${API_URL}/dashboard/widgets/${widgetType}`;

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `Failed to fetch ${widgetType} widget data`);
        }

        return response.json();
    }
}

export const dashboardService = new DashboardService();
