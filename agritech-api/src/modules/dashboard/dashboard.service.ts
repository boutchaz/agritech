import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
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
    farmId?: string;
    farmName?: string;
    parcelName?: string;
    isActiveFarm?: boolean;
    status?: string;
    isIdle?: boolean;
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

    /** In-memory geocoding cache: location string → {lat, lng} — capped at 500 entries */
    private readonly geocodeCache = new Map<string, { lat: number; lng: number }>();
    private static readonly GEOCODE_CACHE_MAX = 500;

    /**
     * Geocode a location string via OpenStreetMap Nominatim (free, no API key).
     * Results are cached in-memory with LRU eviction at 500 entries.
     */
    private async geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
        if (!query?.trim()) return null;

        const key = query.trim().toLowerCase();
        if (this.geocodeCache.has(key)) return this.geocodeCache.get(key)!;

        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'AgroGina-Platform/1.0' }, // Nominatim requires a UA
            });
            clearTimeout(timeout);

            if (!res.ok) return null;
            const data = await res.json() as any[];
            if (!data?.[0]) return null;

            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (isNaN(lat) || isNaN(lng)) return null;

            const coords = { lat, lng };
            // Evict oldest entry if at capacity (Map preserves insertion order)
            if (this.geocodeCache.size >= DashboardService.GEOCODE_CACHE_MAX) {
                const oldest = this.geocodeCache.keys().next().value;
                if (oldest !== undefined) this.geocodeCache.delete(oldest);
            }
            this.geocodeCache.set(key, coords);
            return coords;
        } catch {
            return null;
        }
    }

    /**
     * Verify user belongs to the organization
     * Similar to subscriptions.service.ts - allows onboarding flow to work before full CASL permissions
     */
    private async verifyOrganizationMembership(
        userId: string,
        organizationId: string,
    ): Promise<void> {
        const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
            .from('organization_users')
            .select('user_id, organization_id, role_id, is_active')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .maybeSingle();

        if (orgUserError || !orgUser) {
            Logger.warn(
                `User ${userId} not found in organization ${organizationId}`,
                'DashboardService',
            );
            throw new ForbiddenException(
                'You do not have access to this organization',
            );
        }
    }

    async getDashboardSummary(
        userId: string,
        organizationId: string,
        farmId?: string,
    ): Promise<DashboardSummary> {
        await this.verifyOrganizationMembership(userId, organizationId);
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
                .eq('farm_id', farmId)
                .eq('is_active', true);

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
                .in('farm_id', farmIds)
                .eq('is_active', true);

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
        userId: string,
        organizationId: string,
        widgetType: string,
    ): Promise<WidgetData> {
        await this.verifyOrganizationMembership(userId, organizationId);
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

    async getDashboardSettings(userId: string, organizationId: string, requestUserId: string) {
        await this.verifyOrganizationMembership(requestUserId, organizationId);
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
        requestUserId: string,
        settings: any,
    ) {
        await this.verifyOrganizationMembership(requestUserId, organizationId);
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
    async getLiveMetrics(userId: string, organizationId: string): Promise<LiveDashboardMetrics> {
        await this.verifyOrganizationMembership(userId, organizationId);
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
            this.getActivityHeatmap(userId, organizationId),
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
    async getLiveSummary(userId: string, organizationId: string): Promise<LiveDashboardSummary> {
        await this.verifyOrganizationMembership(userId, organizationId);
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
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

        // Show all active members, prioritize those active in last 24h
        const allUsers: ConcurrentUser[] = (orgUsers || [])
            .map(ou => {
                const profile = ou.profiles as any;
                const lastActivity = profile?.updated_at || ou.last_login || new Date(0).toISOString();
                return {
                    id: ou.user_id,
                    name: profile?.full_name || 'Unknown User',
                    email: profile?.email || '',
                    role: ou.role || 'member',
                    lastActivity,
                    currentPage: '/dashboard',
                    avatarUrl: profile?.avatar_url,
                };
            })
            // Sort: recently active first
            .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
            .slice(0, 10);

        // Count users active within last 24h for the "live" count
        const recentlyActive = allUsers.filter(u =>
            new Date(u.lastActivity) >= new Date(twentyFourHoursAgo)
        );

        return {
            total: recentlyActive.length > 0 ? recentlyActive.length : allUsers.length,
            users: allUsers,
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
            .eq('status', 'in_progress')
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
            .in('status', ['stored', 'in_delivery'])
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
            .eq('status', 'in_progress');

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
            const coords = this.extractLatLng(farm?.coordinates);
            return {
                id: task.id,
                farmId: task.farm_id || '',
                farmName: farm?.name || 'Unknown Farm',
                activityType: `Task ${task.status === 'completed' ? 'Completed' : 'Updated'}`,
                description: task.title || 'Task activity',
                timestamp: task.updated_at,
                location: coords ?? undefined,
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
            const coords = this.extractLatLng(farm?.coordinates);
            return {
                id: harvest.id,
                farmId: harvest.farm_id || '',
                farmName: farm?.name || 'Unknown Farm',
                activityType: 'Harvest Recorded',
                description: `${harvest.quantity || 0} kg harvested`,
                timestamp: harvest.created_at,
                location: coords ?? undefined,
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
     * Convert EPSG:3857 (Web Mercator) X/Y to WGS84 lat/lng.
     * OpenLayers stores parcel boundaries in Web Mercator.
     */
    private mercatorToLatLng(x: number, y: number): { lat: number; lng: number } | null {
        try {
            const lng = (x / 20037508.34) * 180;
            const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
        } catch {
            // ignore
        }
        return null;
    }

    /**
     * Extract lat/lng from any coordinate format stored in the database.
     * Handles: {lat,lng}, {latitude,longitude}, GeoJSON Point/Polygon,
     *          plain arrays in WGS84 or EPSG:3857 (Web Mercator from OpenLayers).
     */
    private extractLatLng(coordinates: any): { lat: number; lng: number } | null {
        if (!coordinates) return null;

        // Format 1: { lat, lng }
        if (typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
            return { lat: coordinates.lat, lng: coordinates.lng };
        }
        // Format 2: { latitude, longitude }
        if (typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
            return { lat: coordinates.latitude, lng: coordinates.longitude };
        }
        // Format 3: GeoJSON Point { type: "Point", coordinates: [lng, lat] }
        if (coordinates.type === 'Point' && Array.isArray(coordinates.coordinates) && coordinates.coordinates.length >= 2) {
            const [lng, lat] = coordinates.coordinates;
            if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
        }
        // Format 4: GeoJSON Polygon { type: "Polygon", coordinates: [[[lng, lat], ...]] }
        if (coordinates.type === 'Polygon' && Array.isArray(coordinates.coordinates?.[0])) {
            const ring: number[][] = coordinates.coordinates[0];
            if (ring.length > 0) {
                const sumX = ring.reduce((s: number, c: number[]) => s + (c[0] ?? 0), 0);
                const sumY = ring.reduce((s: number, c: number[]) => s + (c[1] ?? 0), 0);
                const avgX = sumX / ring.length;
                const avgY = sumY / ring.length;
                // Check for EPSG:3857 (Web Mercator) — values outside geographic range
                if (Math.abs(avgX) > 180 || Math.abs(avgY) > 90) {
                    const converted = this.mercatorToLatLng(avgX, avgY);
                    if (converted) return converted;
                }
                return { lat: avgY, lng: avgX };
            }
        }
        // Format 5: Array of {lat, lng} or {latitude, longitude} objects (polygon)
        if (Array.isArray(coordinates) && coordinates.length > 0) {
            if (typeof coordinates[0]?.lat === 'number' || typeof coordinates[0]?.latitude === 'number') {
                const sumLat = coordinates.reduce((s: number, c: any) => s + (c.lat ?? c.latitude ?? 0), 0);
                const sumLng = coordinates.reduce((s: number, c: any) => s + (c.lng ?? c.longitude ?? 0), 0);
                return { lat: sumLat / coordinates.length, lng: sumLng / coordinates.length };
            }
            // Format 6: Array of [x, y] pairs — may be WGS84 [lng, lat] or EPSG:3857 [x, y]
            if (Array.isArray(coordinates[0]) && coordinates[0].length >= 2) {
                const sumX = coordinates.reduce((s: number, c: number[]) => s + (c[0] ?? 0), 0);
                const sumY = coordinates.reduce((s: number, c: number[]) => s + (c[1] ?? 0), 0);
                const avgX = sumX / coordinates.length;
                const avgY = sumY / coordinates.length;
                // If values exceed geographic bounds, treat as EPSG:3857 (Web Mercator)
                if (Math.abs(avgX) > 180 || Math.abs(avgY) > 90) {
                    const converted = this.mercatorToLatLng(avgX, avgY);
                    if (converted) return converted;
                }
                // Otherwise assume [lng, lat] geographic
                return { lat: avgY, lng: avgX };
            }
        }
        return null;
    }

    /**
     * Try to get farm/parcel centroids via raw PostGIS SQL.
     * Tries each possible geometry column name independently (column may not exist).
     * Falls back gracefully — errors are logged as warnings, not thrown.
     */
    private async getPostgisCentroids(farmIds: string[]): Promise<{
        byParcel: Map<string, { lat: number; lng: number; name: string; farmId: string }>;
        byFarm: Map<string, { lat: number; lng: number }>;
    }> {
        const byParcel = new Map<string, { lat: number; lng: number; name: string; farmId: string }>();
        const byFarm = new Map<string, { lat: number; lng: number }>();

        if (farmIds.length === 0) return { byParcel, byFarm };

        let pool: any;
        let client: any;
        try {
            pool = this.databaseService.getPgPool();
            client = await pool.connect();
        } catch (err) {
            console.warn('getPostgisCentroids: pg pool unavailable:', err?.message);
            return { byParcel, byFarm };
        }

        const tryQuery = async (sql: string, params: any[]): Promise<any[]> => {
            try {
                const result = await client.query(sql, params);
                return result.rows;
            } catch {
                return [];
            }
        };

        try { // eslint-disable-line no-useless-catch
            // Discover what geometry columns exist (avoids errors from missing columns)
            const colsResult = await tryQuery(`
                SELECT table_name, column_name, udt_name
                FROM information_schema.columns
                WHERE table_name IN ('parcels', 'farms')
                AND table_schema = 'public'
                AND (udt_name IN ('geometry', 'geography') OR column_name IN (
                    'centroid', 'boundary_geom', 'geom', 'the_geom', 'location_point',
                    'boundary_polygon', 'location_geom', 'region', 'shape'
                ))
            `, []);

            const parcelGeomCols = colsResult.filter((r: any) => r.table_name === 'parcels').map((r: any) => r.column_name as string);
            const farmGeomCols = colsResult.filter((r: any) => r.table_name === 'farms').map((r: any) => r.column_name as string);

            // --- Parcels: query the first usable geometry column ---
            // Point-like columns (centroid): use ST_Y/ST_X directly
            // Polygon-like columns (boundary_geom): compute centroid first
            const PARCEL_POINT_COLS = ['centroid', 'location_point', 'geom', 'the_geom', 'location_geom'];
            const PARCEL_POLY_COLS = ['boundary_geom', 'region', 'shape'];

            for (const col of PARCEL_POINT_COLS.filter(c => parcelGeomCols.includes(c))) {
                const rows = await tryQuery(`
                    SELECT p.id, p.name, p.farm_id,
                        ST_Y(ST_Transform(p.${col}::geometry, 4326)) as lat,
                        ST_X(ST_Transform(p.${col}::geometry, 4326)) as lng
                    FROM parcels p
                    WHERE p.farm_id = ANY($1::uuid[]) AND p.${col} IS NOT NULL
                `, [farmIds]);
                for (const row of rows) {
                    if (row.lat != null && !byParcel.has(row.id)) {
                        const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
                        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
                            byParcel.set(row.id, { lat, lng, name: row.name, farmId: row.farm_id });
                    }
                }
                if (byParcel.size > 0) break;
            }

            if (byParcel.size === 0) {
                for (const col of PARCEL_POLY_COLS.filter(c => parcelGeomCols.includes(c))) {
                    const rows = await tryQuery(`
                        SELECT p.id, p.name, p.farm_id,
                            ST_Y(ST_Transform(ST_Centroid(p.${col}::geometry), 4326)) as lat,
                            ST_X(ST_Transform(ST_Centroid(p.${col}::geometry), 4326)) as lng
                        FROM parcels p
                        WHERE p.farm_id = ANY($1::uuid[]) AND p.${col} IS NOT NULL
                    `, [farmIds]);
                    for (const row of rows) {
                        if (row.lat != null && !byParcel.has(row.id)) {
                            const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
                            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
                                byParcel.set(row.id, { lat, lng, name: row.name, farmId: row.farm_id });
                        }
                    }
                    if (byParcel.size > 0) break;
                }
            }

            // --- Farms: same pattern ---
            const FARM_POINT_COLS = ['location_point', 'centroid', 'geom', 'the_geom', 'location_geom'];
            const FARM_POLY_COLS = ['boundary_polygon', 'boundary_geom', 'region', 'shape'];

            for (const col of FARM_POINT_COLS.filter(c => farmGeomCols.includes(c))) {
                const rows = await tryQuery(`
                    SELECT f.id,
                        ST_Y(ST_Transform(f.${col}::geometry, 4326)) as lat,
                        ST_X(ST_Transform(f.${col}::geometry, 4326)) as lng
                    FROM farms f
                    WHERE f.id = ANY($1::uuid[]) AND f.${col} IS NOT NULL
                `, [farmIds]);
                for (const row of rows) {
                    if (row.lat != null && !byFarm.has(row.id)) {
                        const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
                        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
                            byFarm.set(row.id, { lat, lng });
                    }
                }
                if (byFarm.size > 0) break;
            }

            if (byFarm.size === 0) {
                for (const col of FARM_POLY_COLS.filter(c => farmGeomCols.includes(c))) {
                    const rows = await tryQuery(`
                        SELECT f.id,
                            ST_Y(ST_Transform(ST_Centroid(f.${col}::geometry), 4326)) as lat,
                            ST_X(ST_Transform(ST_Centroid(f.${col}::geometry), 4326)) as lng
                        FROM farms f
                        WHERE f.id = ANY($1::uuid[]) AND f.${col} IS NOT NULL
                    `, [farmIds]);
                    for (const row of rows) {
                        if (row.lat != null && !byFarm.has(row.id)) {
                            const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
                            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
                                byFarm.set(row.id, { lat, lng });
                        }
                    }
                    if (byFarm.size > 0) break;
                }
            }

            if (parcelGeomCols.length > 0 || farmGeomCols.length > 0) {
                console.log(`getPostgisCentroids: found ${byParcel.size} parcel + ${byFarm.size} farm centroids via PostGIS. Parcel cols: [${parcelGeomCols}], Farm cols: [${farmGeomCols}]`);
            }
        } finally {
            if (client) client.release();
        }

        return { byParcel, byFarm };
    }

    /**
     * Get activity heatmap data based on parcel locations.
     * Shows all parcels as circles colored by active task type.
     * Parcels with no active tasks appear as dimmed "idle" circles.
     */
    async getActivityHeatmap(userId: string, organizationId: string): Promise<ActivityHeatmapPoint[]> {
        console.log(`[Heatmap] called for org=${organizationId} user=${userId}`);
        await this.verifyOrganizationMembership(userId, organizationId);


        try {
            // 1. Fetch active farms (use neq to include farms where is_active is null)
            const { data: farms, error: farmsError } = await this.supabaseAdmin
                .from('farms')
                .select('id, name, coordinates, is_active')
                .eq('organization_id', organizationId)
                .neq('is_active', false);

            if (farmsError) {
                console.error('[Heatmap] farms error:', farmsError.message);
            }

            const farmList = farms || [];
            const farmIds = farmList.map(f => f.id);
            console.log(`[Heatmap] ${farmIds.length} active farms`);

            if (farmIds.length === 0) return [];

            const farmNameMap = new Map(farmList.map(f => [f.id, f.name]));

            // 2. Fetch parcels + active tasks in parallel
            const [parcelsResult, tasksResult] = await Promise.all([
                this.supabaseAdmin
                    .from('parcels')
                    .select('id, name, farm_id, boundary')
                    .in('farm_id', farmIds)
                    .eq('is_active', true),
                this.supabaseAdmin
                    .from('tasks')
                    .select('farm_id, parcel_id, task_type, status')
                    .eq('organization_id', organizationId)
                    .in('status', ['in_progress', 'pending']),
            ]);

            if (parcelsResult.error) {
                console.error('[Heatmap] parcels error:', parcelsResult.error.message);
            }
            if (tasksResult.error) {
                console.error('[Heatmap] tasks error:', tasksResult.error.message);
            }

            const parcelList = parcelsResult.data || [];
            const taskList = tasksResult.data || [];

            console.log(`[Heatmap] ${parcelList.length} parcels, ${taskList.length} active tasks`);

            // 3. Aggregate tasks by parcel_id (in_progress wins over pending)
            type TaskAgg = { type: string; count: number; status: string };
            const tasksByParcel = new Map<string, TaskAgg>();
            const tasksByFarm = new Map<string, TaskAgg>();

            for (const task of taskList) {
                const upsert = (map: Map<string, TaskAgg>, key: string | null) => {
                    if (!key) return;
                    const existing = map.get(key);
                    if (!existing) {
                        map.set(key, { type: task.task_type || 'general', count: 1, status: task.status });
                    } else {
                        existing.count++;
                        if (task.status === 'in_progress' && existing.status !== 'in_progress') {
                            existing.status = 'in_progress';
                            existing.type = task.task_type || existing.type;
                        }
                    }
                };
                upsert(tasksByParcel, task.parcel_id);
                upsert(tasksByFarm, task.farm_id);
            }

            const heatmapPoints: ActivityHeatmapPoint[] = [];

            // 4. Parcel circles — primary display (user draws AOI for each parcel)
            for (const parcel of parcelList) {
                const coords = this.extractLatLng(parcel.boundary as any);
                if (!coords) {
                    console.log(`[Heatmap] parcel "${parcel.name}" has no usable boundary`);
                    continue;
                }

                const agg = tasksByParcel.get(parcel.id);
                const isIdle = !agg;

                heatmapPoints.push({
                    lat: coords.lat,
                    lng: coords.lng,
                    intensity: isIdle ? 0.1 : Math.min((agg?.count ?? 0) / 5, 1),
                    activityType: isIdle ? 'idle' : (agg?.type ?? 'general'),
                    count: agg?.count ?? 0,
                    farmId: parcel.farm_id,
                    farmName: farmNameMap.get(parcel.farm_id),
                    parcelName: parcel.name,
                    isActiveFarm: false,
                    status: isIdle ? 'idle' : (agg?.status ?? 'idle'),
                    isIdle,
                });
            }

            // 5. Farm circles for farms whose parcels had no boundary data
            const farmsWithParcelCircles = new Set(heatmapPoints.map(p => p.farmId));
            for (const farm of farmList) {
                if (farmsWithParcelCircles.has(farm.id)) continue; // already represented by parcels

                const f = farm as any;
                // Try JSONB farm.coordinates first
                let coords = this.extractLatLng(f.coordinates);

                // Fallback: geocode via Nominatim
                if (!coords) {
                    const query = [f.city, f.address, f.location, f.name, 'Maroc']
                        .filter(Boolean).join(', ');
                    if (query) coords = await this.geocodeLocation(query);
                }

                // Last resort: spread around Morocco center
                if (!coords) {
                    const idx = farmList.indexOf(farm);
                    coords = { lat: 31.7917 + idx * 0.3, lng: -7.0926 + idx * 0.3 };
                    console.warn(`[Heatmap] Morocco fallback for farm "${farm.name}"`);
                }

                const agg = tasksByFarm.get(farm.id);
                const isIdle = !agg;

                heatmapPoints.push({
                    lat: coords.lat,
                    lng: coords.lng,
                    intensity: isIdle ? 0.15 : Math.min((agg?.count ?? 0) / 10, 1),
                    activityType: isIdle ? 'idle' : (agg?.type ?? 'general'),
                    count: agg?.count ?? 0,
                    farmId: farm.id,
                    farmName: farm.name,
                    isActiveFarm: true,
                    status: isIdle ? 'idle' : (agg?.status ?? 'idle'),
                    isIdle,
                });
            }

            console.log(`[Heatmap] returning ${heatmapPoints.length} points`);
            return heatmapPoints;

        } catch (err: any) {
            console.error('[Heatmap] unexpected error:', err?.message || err);
            return [];
        }
    }

    /**
     * Get feature usage statistics based on real data counts
     */
    private async getFeatureUsage(organizationId: string): Promise<FeatureUsage[]> {
        // Get counts for different features - all real data
        const [
            { count: tasksCount },
            { count: harvestsCount },
            { count: inventoryCount },
            { count: workersCount },
            { count: parcelsCount },
            { count: farmsCount },
            { count: salesCount },
        ] = await Promise.all([
            this.supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('harvest_records').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('inventory_items').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('workers').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('parcels').select('*', { count: 'exact', head: true }).eq('is_active', true),
            this.supabaseAdmin.from('farms').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
            this.supabaseAdmin.from('sales').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        ]);

        // Calculate trend based on recent activity (tasks updated in last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        const [
            { count: recentTasks },
            { count: previousTasks },
        ] = await Promise.all([
            this.supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .gte('updated_at', sevenDaysAgo),
            this.supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .gte('updated_at', fourteenDaysAgo)
                .lt('updated_at', sevenDaysAgo),
        ]);

        // Determine overall trend based on task activity
        const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
            if (current > previous * 1.1) return 'up';
            if (current < previous * 0.9) return 'down';
            return 'stable';
        };

        const overallTrend = calculateTrend(recentTasks || 0, previousTasks || 0);

        const features = [
            { feature: 'Tasks', count: tasksCount || 0, trend: overallTrend },
            { feature: 'Harvests', count: harvestsCount || 0, trend: 'stable' as const },
            { feature: 'Inventory', count: inventoryCount || 0, trend: 'stable' as const },
            { feature: 'Workers', count: workersCount || 0, trend: 'stable' as const },
            { feature: 'Parcels', count: parcelsCount || 0, trend: 'stable' as const },
            { feature: 'Farms', count: farmsCount || 0, trend: 'stable' as const },
            { feature: 'Sales', count: salesCount || 0, trend: 'stable' as const },
        ];

        const total = features.reduce((sum, f) => sum + f.count, 0);

        return features
            .map(f => ({
                feature: f.feature,
                count: f.count,
                percentage: total > 0 ? Math.round((f.count / total) * 100) : 0,
                trend: f.trend,
            }))
            .sort((a, b) => b.count - a.count);
    }

    private async getActiveFarmsCount(organizationId: string): Promise<number> {
        const { count } = await this.supabaseAdmin
            .from('farms')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .neq('is_active', false);

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
