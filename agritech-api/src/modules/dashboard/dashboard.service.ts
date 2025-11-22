import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { FarmsService } from '../farms/farms.service';
import { ParcelsService } from '../parcels/parcels.service';

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

@Injectable()
export class DashboardService {
    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly farmsService: FarmsService,
        private readonly parcelsService: ParcelsService,
    ) { }

    async getDashboardSummary(
        organizationId: string,
        farmId?: string,
    ): Promise<DashboardSummary> {
        const [parcelsData, tasksData, workersData, harvestsData, inventoryData] =
            await Promise.all([
                this.getParcelsSummary(organizationId, farmId),
                this.getTasksSummary(organizationId),
                this.getWorkersSummary(organizationId),
                this.getHarvestsSummary(organizationId),
                this.getInventorySummary(organizationId),
            ]);

        return {
            parcels: parcelsData,
            tasks: tasksData,
            workers: workersData,
            harvests: harvestsData,
            inventory: inventoryData,
        };
    }

    private async getParcelsSummary(
        organizationId: string,
        farmId?: string,
    ): Promise<DashboardSummary['parcels']> {
        if (farmId) {
            // If specific farm requested, query parcels directly
            const { data: parcels, error } = await this.supabase
                .from('parcels')
                .select('id, area, calculated_area, crop_type')
                .eq('farm_id', farmId);

            if (error) throw error;

            const total = parcels?.length || 0;
            const totalArea = parcels?.reduce(
                (sum, p) => sum + (p.calculated_area || p.area || 0),
                0,
            ) || 0;

            const byCrop = parcels?.reduce((acc, p) => {
                const crop = p.crop_type || 'Unspecified';
                acc[crop] = (acc[crop] || 0) + 1;
                return acc;
            }, {} as Record<string, number>) || {};

            return { total, totalArea, byCrop };
        }

        // Get all farms for the organization
        const { data: farms, error: farmsError } = await this.supabase
            .from('farms')
            .select('id')
            .eq('organization_id', organizationId);

        if (farmsError) throw farmsError;

        const farmIds = farms?.map((f) => f.id) || [];

        if (farmIds.length === 0) {
            return { total: 0, totalArea: 0, byCrop: {} };
        }

        const { data: parcels, error } = await this.supabase
            .from('parcels')
            .select('id, area, calculated_area, crop_type')
            .in('farm_id', farmIds);

        if (error) throw error;

        const total = parcels?.length || 0;
        const totalArea = parcels?.reduce(
            (sum, p) => sum + (p.calculated_area || p.area || 0),
            0,
        ) || 0;

        const byCrop = parcels?.reduce((acc, p) => {
            const crop = p.crop_type || 'Unspecified';
            acc[crop] = (acc[crop] || 0) + 1;
            return acc;
        }, {} as Record<string, number>) || {};

        return { total, totalArea, byCrop };
    }

    private async getTasksSummary(
        organizationId: string,
    ): Promise<DashboardSummary['tasks']> {
        const { data: tasks, error } = await this.supabase
            .from('tasks')
            .select('id, status, scheduled_start')
            .eq('organization_id', organizationId);

        if (error) throw error;

        const total = tasks?.length || 0;
        const inProgress = tasks?.filter((t) => t.status === 'in_progress').length || 0;
        const completed = tasks?.filter((t) => t.status === 'completed').length || 0;

        // Upcoming tasks (today and future)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = tasks?.filter((t) => {
            if (!t.scheduled_start) return false;
            const taskDate = new Date(t.scheduled_start);
            return taskDate >= today;
        }).length || 0;

        return { total, inProgress, completed, upcoming };
    }

    private async getWorkersSummary(
        organizationId: string,
    ): Promise<DashboardSummary['workers']> {
        const { data: workers, error } = await this.supabase
            .from('workers')
            .select('id, is_active, user_id')
            .eq('organization_id', organizationId);

        if (error) throw error;

        const total = workers?.length || 0;
        const active = workers?.filter((w) => w.is_active).length || 0;

        // Get tasks for today to determine workers working today
        const today = new Date().toISOString().split('T')[0];
        const { data: todayTasks } = await this.supabase
            .from('tasks')
            .select('assigned_to')
            .eq('organization_id', organizationId)
            .gte('scheduled_start', today)
            .lt('scheduled_start', `${today}T23:59:59`);

        const workingToday = new Set(
            todayTasks?.filter((t) => t.assigned_to).map((t) => t.assigned_to),
        ).size;

        return { total, active, workingToday };
    }

    private async getHarvestsSummary(
        organizationId: string,
    ): Promise<DashboardSummary['harvests']> {
        const { data: harvests, error } = await this.supabase
            .from('harvest_records')
            .select('id, harvest_date, quantity')
            .eq('organization_id', organizationId);

        if (error) throw error;

        const total = harvests?.length || 0;

        // This month's harvests
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const thisMonthHarvests = harvests?.filter((h) => {
            const harvestDate = new Date(h.harvest_date);
            return harvestDate >= monthStart && harvestDate <= monthEnd;
        }) || [];

        const thisMonth = thisMonthHarvests.length;
        const thisMonthQuantity = thisMonthHarvests.reduce(
            (sum, h) => sum + (h.quantity || 0),
            0,
        );

        return { thisMonth, thisMonthQuantity, total };
    }

    private async getInventorySummary(
        organizationId: string,
    ): Promise<DashboardSummary['inventory']> {
        const { data: inventory, error } = await this.supabase
            .from('inventory')
            .select('id, quantity, min_stock_level')
            .eq('organization_id', organizationId)
            .eq('is_active', true);

        if (error) throw error;

        const total = inventory?.length || 0;
        const lowStock = inventory?.filter((item) => {
            if (!item.min_stock_level) return false;
            return (item.quantity || 0) <= item.min_stock_level;
        }).length || 0;

        return { total, lowStock };
    }

    async getWidgetData(
        organizationId: string,
        widgetType: string,
    ): Promise<WidgetData> {
        switch (widgetType) {
            case 'parcels':
                return {
                    type: 'parcels',
                    data: await this.getParcelsSummary(organizationId),
                };
            case 'tasks':
                return {
                    type: 'tasks',
                    data: await this.getTasksSummary(organizationId),
                };
            case 'workers':
                return {
                    type: 'workers',
                    data: await this.getWorkersSummary(organizationId),
                };
            case 'harvests':
                return {
                    type: 'harvests',
                    data: await this.getHarvestsSummary(organizationId),
                };
            case 'inventory':
                return {
                    type: 'inventory',
                    data: await this.getInventorySummary(organizationId),
                };
            default:
                throw new Error(`Unknown widget type: ${widgetType}`);
        }
    }
}
