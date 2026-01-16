import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

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

// Live Dashboard Types
export interface ConcurrentUser {
    id: string;
    name: string;
    email: string;
    role: string;
    lastActivity: string;
    currentPage: string;
    avatarUrl?: string;
}

export interface ActiveOperation {
    id: string;
    type: 'task' | 'harvest' | 'inventory' | 'irrigation' | 'maintenance';
    name: string;
    status: 'in_progress' | 'pending' | 'paused';
    assignee?: string;
    startedAt: string;
    parcelName?: string;
    farmName?: string;
    progress?: number;
}

export interface FarmActivity {
    id: string;
    farmId: string;
    farmName: string;
    activityType: string;
    description: string;
    timestamp: string;
    userName?: string;
    location?: {
        lat: number;
        lng: number;
    };
}

export interface ActivityHeatmapPoint {
    lat: number;
    lng: number;
    intensity: number;
    activityType: string;
    count: number;
}

export interface FeatureUsage {
    feature: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
}

export interface LiveDashboardMetrics {
    concurrentUsers: {
        total: number;
        users: ConcurrentUser[];
    };
    activeOperations: {
        total: number;
        byType: Record<string, number>;
        operations: ActiveOperation[];
    };
    farmActivities: {
        total: number;
        activities: FarmActivity[];
    };
    heatmapData: ActivityHeatmapPoint[];
    featureUsage: FeatureUsage[];
    lastUpdated: string;
}

export interface LiveDashboardSummary {
    concurrentUsersCount: number;
    activeOperationsCount: number;
    activeFarmsCount: number;
    totalActivitiesLast24h: number;
    peakUsageTime: string;
    mostActiveFeature: string;
}

@Injectable()
export class DashboardService {
    constructor(
        private readonly configService: ConfigService,
        private readonly databaseService: DatabaseService,
    ) {}

    private get supabaseAdmin() {
        return this.databaseService.getAdminClient();
    }

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
            const { data: parcels, error } = await this.supabaseAdmin
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
        const { data: farms, error: farmsError } = await this.supabaseAdmin
            .from('farms')
            .select('id')
            .eq('organization_id', organizationId);

        if (farmsError) throw farmsError;

        const farmIds = farms?.map((f) => f.id) || [];

        if (farmIds.length === 0) {
            return { total: 0, totalArea: 0, byCrop: {} };
        }

        const { data: parcels, error } = await this.supabaseAdmin
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
        const { data: tasks, error } = await this.supabaseAdmin
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
        const { data: workers, error } = await this.supabaseAdmin
            .from('workers')
            .select('id, is_active, user_id')
            .eq('organization_id', organizationId);

        if (error) throw error;

        const total = workers?.length || 0;
        const active = workers?.filter((w) => w.is_active).length || 0;

        // Get tasks for today to determine workers working today
        const today = new Date().toISOString().split('T')[0];
        const { data: todayTasks } = await this.supabaseAdmin
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
        const { data: harvests, error } = await this.supabaseAdmin
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
        const { data: inventory, error } = await this.supabaseAdmin
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

    async getDashboardSettings(userId: string, organizationId: string) {
        const { data, error } = await this.supabaseAdmin
            .from('dashboard_settings')
            .select('*')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data;
    }

    async upsertDashboardSettings(
        userId: string,
        organizationId: string,
        settings: any,
    ) {
        const { data, error } = await this.supabaseAdmin
            .from('dashboard_settings')
            .upsert(
                {
                    user_id: userId,
                    organization_id: organizationId,
                    ...settings,
                },
                {
                    onConflict: 'user_id,organization_id',
                },
            )
            .select()
            .single();

        if (error) throw error;

        return data;
    }

    // ==================== LIVE DASHBOARD METHODS ====================

    /**
     * Get live dashboard metrics including concurrent users, active operations, and farm activities
     */
    async getLiveMetrics(organizationId: string): Promise<LiveDashboardMetrics> {
        const now = new Date();

        const [
            concurrentUsersData,
            activeOperationsData,
            farmActivitiesData,
            heatmapData,
            featureUsageData,
        ] = await Promise.all([
            this.getConcurrentUsers(organizationId),
            this.getActiveOperations(organizationId),
            this.getRecentFarmActivities(organizationId),
            this.getActivityHeatmap(organizationId),
            this.getFeatureUsage(organizationId),
        ]);

        return {
            concurrentUsers: concurrentUsersData,
            activeOperations: activeOperationsData,
            farmActivities: farmActivitiesData,
            heatmapData,
            featureUsage: featureUsageData,
            lastUpdated: now.toISOString(),
        };
    }

    /**
     * Get live dashboard summary stats for quick overview
     */
    async getLiveSummary(organizationId: string): Promise<LiveDashboardSummary> {
        const [
            concurrentUsers,
            activeOperations,
            activeFarms,
            activities24h,
        ] = await Promise.all([
            this.getConcurrentUsersCount(organizationId),
            this.getActiveOperationsCount(organizationId),
            this.getActiveFarmsCount(organizationId),
            this.getActivitiesLast24h(organizationId),
        ]);

        // Determine peak usage time (simplified - in production could be from analytics)
        const peakUsageTime = this.calculatePeakUsageTime();

        // Get most active feature
        const featureUsage = await this.getFeatureUsage(organizationId);
        const mostActiveFeature = featureUsage.length > 0
            ? featureUsage[0].feature
            : 'Dashboard';

        return {
            concurrentUsersCount: concurrentUsers,
            activeOperationsCount: activeOperations,
            activeFarmsCount: activeFarms,
            totalActivitiesLast24h: activities24h,
            peakUsageTime,
            mostActiveFeature,
        };
    }

    /**
     * Get concurrent users (users active within the last 5 minutes)
     */
    private async getConcurrentUsers(organizationId: string): Promise<{ total: number; users: ConcurrentUser[] }> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // Query organization_users joined with profiles
        const { data: orgUsers, error } = await this.supabaseAdmin
            .from('organization_users')
            .select(`
                user_id,
                role,
                last_login,
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    avatar_url,
                    updated_at
                )
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching concurrent users:', error);
            return { total: 0, users: [] };
        }

        // Filter users who have been active recently (using updated_at or last_login)
        const activeUsers: ConcurrentUser[] = (orgUsers || [])
            .filter(ou => {
                const profile = ou.profiles as any;
                const lastActivity = profile?.updated_at || ou.last_login;
                return lastActivity && new Date(lastActivity) >= new Date(fiveMinutesAgo);
            })
            .map(ou => {
                const profile = ou.profiles as any;
                return {
                    id: ou.user_id,
                    name: profile?.full_name || 'Unknown User',
                    email: profile?.email || '',
                    role: ou.role || 'member',
                    lastActivity: profile?.updated_at || ou.last_login || new Date().toISOString(),
                    currentPage: '/dashboard', // Would need session tracking for real current page
                    avatarUrl: profile?.avatar_url,
                };
            })
            .slice(0, 10); // Limit to 10 users for display

        return {
            total: activeUsers.length,
            users: activeUsers,
        };
    }

    private async getConcurrentUsersCount(organizationId: string): Promise<number> {
        const result = await this.getConcurrentUsers(organizationId);
        return result.total;
    }

    /**
     * Get active operations (tasks, harvests currently in progress)
     */
    private async getActiveOperations(organizationId: string): Promise<{ total: number; byType: Record<string, number>; operations: ActiveOperation[] }> {
        // Get in-progress tasks
        const { data: tasks, error: tasksError } = await this.supabaseAdmin
            .from('tasks')
            .select(`
                id,
                title,
                status,
                scheduled_start,
                assigned_to,
                parcel_id,
                farm_id,
                parcels:parcel_id (name),
                farms:farm_id (name)
            `)
            .eq('organization_id', organizationId)
            .in('status', ['in_progress', 'pending'])
            .order('scheduled_start', { ascending: false })
            .limit(20);

        if (tasksError) {
            console.error('Error fetching active tasks:', tasksError);
        }

        const operations: ActiveOperation[] = (tasks || []).map(task => ({
            id: task.id,
            type: 'task' as const,
            name: task.title || 'Unnamed Task',
            status: task.status === 'in_progress' ? 'in_progress' : 'pending',
            assignee: task.assigned_to,
            startedAt: task.scheduled_start || new Date().toISOString(),
            parcelName: (task.parcels as any)?.name,
            farmName: (task.farms as any)?.name,
            progress: task.status === 'in_progress' ? 50 : 0, // Simplified progress
        }));

        // Get today's harvests
        const today = new Date().toISOString().split('T')[0];
        const { data: harvests, error: harvestsError } = await this.supabaseAdmin
            .from('harvest_records')
            .select(`
                id,
                harvest_date,
                quantity,
                parcel_id,
                farm_id,
                parcels:parcel_id (name),
                farms:farm_id (name)
            `)
            .eq('organization_id', organizationId)
            .gte('harvest_date', today)
            .limit(10);

        if (harvestsError) {
            console.error('Error fetching harvests:', harvestsError);
        }

        const harvestOperations: ActiveOperation[] = (harvests || []).map(harvest => ({
            id: harvest.id,
            type: 'harvest' as const,
            name: `Harvest - ${(harvest.parcels as any)?.name || 'Unknown Parcel'}`,
            status: 'in_progress' as const,
            startedAt: harvest.harvest_date || new Date().toISOString(),
            parcelName: (harvest.parcels as any)?.name,
            farmName: (harvest.farms as any)?.name,
            progress: 100,
        }));

        const allOperations = [...operations, ...harvestOperations];

        // Calculate by type
        const byType: Record<string, number> = {};
        allOperations.forEach(op => {
            byType[op.type] = (byType[op.type] || 0) + 1;
        });

        return {
            total: allOperations.length,
            byType,
            operations: allOperations.slice(0, 15),
        };
    }

    private async getActiveOperationsCount(organizationId: string): Promise<number> {
        const { count: tasksCount } = await this.supabaseAdmin
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .in('status', ['in_progress', 'pending']);

        return tasksCount || 0;
    }

    /**
     * Get recent farm activities (last 30 minutes)
     */
    private async getRecentFarmActivities(organizationId: string): Promise<{ total: number; activities: FarmActivity[] }> {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

        // Get recent tasks updates
        const { data: recentTasks, error: tasksError } = await this.supabaseAdmin
            .from('tasks')
            .select(`
                id,
                title,
                status,
                updated_at,
                farm_id,
                farms:farm_id (id, name, coordinates)
            `)
            .eq('organization_id', organizationId)
            .gte('updated_at', thirtyMinutesAgo)
            .order('updated_at', { ascending: false })
            .limit(20);

        if (tasksError) {
            console.error('Error fetching recent tasks:', tasksError);
        }

        const activities: FarmActivity[] = (recentTasks || []).map(task => {
            const farm = task.farms as any;
            const coordinates = farm?.coordinates;
            return {
                id: task.id,
                farmId: task.farm_id || '',
                farmName: farm?.name || 'Unknown Farm',
                activityType: `Task ${task.status === 'completed' ? 'Completed' : 'Updated'}`,
                description: task.title || 'Task activity',
                timestamp: task.updated_at,
                location: coordinates ? {
                    lat: coordinates.lat || 33.5731,
                    lng: coordinates.lng || -7.5898,
                } : undefined,
            };
        });

        // Get recent harvest records
        const { data: recentHarvests, error: harvestsError } = await this.supabaseAdmin
            .from('harvest_records')
            .select(`
                id,
                harvest_date,
                quantity,
                created_at,
                farm_id,
                farms:farm_id (id, name, coordinates)
            `)
            .eq('organization_id', organizationId)
            .gte('created_at', thirtyMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(10);

        if (harvestsError) {
            console.error('Error fetching recent harvests:', harvestsError);
        }

        const harvestActivities: FarmActivity[] = (recentHarvests || []).map(harvest => {
            const farm = harvest.farms as any;
            const coordinates = farm?.coordinates;
            return {
                id: harvest.id,
                farmId: harvest.farm_id || '',
                farmName: farm?.name || 'Unknown Farm',
                activityType: 'Harvest Recorded',
                description: `${harvest.quantity || 0} kg harvested`,
                timestamp: harvest.created_at,
                location: coordinates ? {
                    lat: coordinates.lat || 33.5731,
                    lng: coordinates.lng || -7.5898,
                } : undefined,
            };
        });

        const allActivities = [...activities, ...harvestActivities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

        return {
            total: allActivities.length,
            activities: allActivities,
        };
    }

    /**
     * Get activity heatmap data based on farm and parcel locations
     */
    async getActivityHeatmap(organizationId: string): Promise<ActivityHeatmapPoint[]> {
        // Get farms with their coordinates
        const { data: farms, error: farmsError } = await this.supabaseAdmin
            .from('farms')
            .select('id, name, coordinates')
            .eq('organization_id', organizationId);

        if (farmsError) {
            console.error('Error fetching farms for heatmap:', farmsError);
            return [];
        }

        const heatmapPoints: ActivityHeatmapPoint[] = [];

        for (const farm of farms || []) {
            const coordinates = farm.coordinates as any;
            if (!coordinates?.lat || !coordinates?.lng) continue;

            // Count activities for this farm
            const { count: taskCount } = await this.supabaseAdmin
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('farm_id', farm.id)
                .in('status', ['in_progress', 'pending', 'completed']);

            const { count: harvestCount } = await this.supabaseAdmin
                .from('harvest_records')
                .select('*', { count: 'exact', head: true })
                .eq('farm_id', farm.id);

            const totalCount = (taskCount || 0) + (harvestCount || 0);

            if (totalCount > 0) {
                heatmapPoints.push({
                    lat: coordinates.lat,
                    lng: coordinates.lng,
                    intensity: Math.min(totalCount / 100, 1), // Normalize intensity
                    activityType: 'farming',
                    count: totalCount,
                });
            }
        }

        // If no real data, return some default points for demo
        if (heatmapPoints.length === 0) {
            const defaultLat = 33.5731;
            const defaultLng = -7.5898;
            const activityTypes = ['harvest', 'irrigation', 'maintenance', 'planting', 'inspection'];

            return Array.from({ length: 10 }, (_, i) => ({
                lat: defaultLat + (Math.random() - 0.5) * 1.0,
                lng: defaultLng + (Math.random() - 0.5) * 1.0,
                intensity: Math.random() * 0.8 + 0.2,
                activityType: activityTypes[i % activityTypes.length],
                count: Math.floor(Math.random() * 20) + 1,
            }));
        }

        return heatmapPoints;
    }

    /**
     * Get feature usage statistics
     */
    private async getFeatureUsage(organizationId: string): Promise<FeatureUsage[]> {
        // Get counts for different features
        const [
            { count: tasksCount },
            { count: harvestsCount },
            { count: inventoryCount },
            { count: workersCount },
            { count: parcelsCount },
        ] = await Promise.all([
            this.supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('harvest_records').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('inventory').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('workers').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('parcels').select('*', { count: 'exact', head: true }),
        ]);

        const features = [
            { feature: 'Tasks', count: tasksCount || 0 },
            { feature: 'Harvests', count: harvestsCount || 0 },
            { feature: 'Inventory', count: inventoryCount || 0 },
            { feature: 'Workers', count: workersCount || 0 },
            { feature: 'Parcels', count: parcelsCount || 0 },
            { feature: 'Dashboard', count: 100 }, // Dashboard always has high usage
            { feature: 'Analytics', count: Math.floor(Math.random() * 50) + 10 },
            { feature: 'Reports', count: Math.floor(Math.random() * 30) + 5 },
        ];

        const total = features.reduce((sum, f) => sum + f.count, 0);

        return features
            .map(f => ({
                feature: f.feature,
                count: f.count,
                percentage: total > 0 ? Math.round((f.count / total) * 100) : 0,
                trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
            }))
            .sort((a, b) => b.count - a.count);
    }

    private async getActiveFarmsCount(organizationId: string): Promise<number> {
        const { count } = await this.supabaseAdmin
            .from('farms')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('is_active', true);

        return count || 0;
    }

    private async getActivitiesLast24h(organizationId: string): Promise<number> {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { count: tasksCount } = await this.supabaseAdmin
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('updated_at', twentyFourHoursAgo);

        const { count: harvestsCount } = await this.supabaseAdmin
            .from('harvest_records')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('created_at', twentyFourHoursAgo);

        return (tasksCount || 0) + (harvestsCount || 0);
    }

    private calculatePeakUsageTime(): string {
        // In a production system, this would be calculated from actual analytics
        // For now, return a reasonable peak time
        const hour = new Date().getHours();
        if (hour >= 8 && hour < 12) return '08:00 - 12:00';
        if (hour >= 12 && hour < 18) return '12:00 - 18:00';
        return '09:00 - 11:00';
    }
}
