import { apiClient } from '../lib/api-client';
import { OrganizationRequiredError, ErrorHandlers } from '../lib/errors';

// Types for live dashboard metrics
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

class LiveDashboardService {
  /**
   * Get live dashboard metrics including concurrent users, active operations, and farm activities
   * Returns real data from the API - no mock fallback to ensure data accuracy
   */
  async getLiveMetrics(organizationId: string): Promise<LiveDashboardMetrics> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }

    try {
      const response = await apiClient.get<LiveDashboardMetrics>(
        '/api/v1/dashboard/live/metrics',
        {},
        organizationId
      );
      return response;
    } catch (error) {
      ErrorHandlers.log(error, 'LiveDashboardService.getLiveMetrics');
      // Return empty state instead of mock data for production accuracy
      // Mock data is only used in development or when explicitly enabled
      if (import.meta.env.DEV) {
        console.warn('Using mock data in development mode');
        return this.generateMockLiveMetrics(organizationId);
      }
      // Return empty metrics structure in production
      return {
        concurrentUsers: { total: 0, users: [] },
        activeOperations: { total: 0, byType: {}, operations: [] },
        farmActivities: { total: 0, activities: [] },
        heatmapData: [],
        featureUsage: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get live dashboard summary stats
   * Returns real data from the API
   */
  async getLiveSummary(organizationId: string): Promise<LiveDashboardSummary> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }

    try {
      const response = await apiClient.get<LiveDashboardSummary>(
        '/api/v1/dashboard/live/summary',
        {},
        organizationId
      );
      return response;
    } catch (error) {
      ErrorHandlers.log(error, 'LiveDashboardService.getLiveSummary');
      if (import.meta.env.DEV) {
        console.warn('Using mock summary data in development mode');
        return this.generateMockSummary(organizationId);
      }
      // Return empty summary in production
      return {
        concurrentUsersCount: 0,
        activeOperationsCount: 0,
        activeFarmsCount: 0,
        totalActivitiesLast24h: 0,
        peakUsageTime: '--',
        mostActiveFeature: '--',
      };
    }
  }

  /**
   * Get heatmap data for geographic activity visualization
   * Returns real coordinates from the API
   */
  async getActivityHeatmap(organizationId: string): Promise<ActivityHeatmapPoint[]> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }

    try {
      const response = await apiClient.get<ActivityHeatmapPoint[]>(
        '/api/v1/dashboard/live/heatmap',
        {},
        organizationId
      );
      return response;
    } catch (error) {
      ErrorHandlers.log(error, 'LiveDashboardService.getActivityHeatmap');
      if (import.meta.env.DEV) {
        console.warn('Using mock heatmap data in development mode');
        return this.generateMockHeatmapData();
      }
      // Return empty heatmap in production
      return [];
    }
  }

  /**
   * Generate mock live metrics data for fallback/development
   * Used when API is unavailable
   */
  private generateMockLiveMetrics(_organizationId: string): LiveDashboardMetrics {
    const now = new Date();

    // Generate concurrent users
    const userNames = ['Ahmed Hassan', 'Fatima Zahra', 'Mohamed Ali', 'Yasmin El-Said', 'Omar Benali', 'Sarah Idrissi'];
    const roles = ['Farm Manager', 'Field Worker', 'Supervisor', 'Administrator', 'Agronomist'];
    const pages = ['/dashboard', '/tasks', '/parcels', '/harvests', '/inventory', '/workers', '/analytics'];

    const concurrentUsers: ConcurrentUser[] = userNames
      .slice(0, Math.floor(Math.random() * 4) + 2)
      .map((name, i) => ({
        id: `user-${i}`,
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@farm.com`,
        role: roles[Math.floor(Math.random() * roles.length)],
        lastActivity: new Date(now.getTime() - Math.random() * 300000).toISOString(),
        currentPage: pages[Math.floor(Math.random() * pages.length)],
      }));

    // Generate active operations
    const operationTypes: Array<ActiveOperation['type']> = ['task', 'harvest', 'inventory', 'irrigation', 'maintenance'];
    const operationNames = [
      'Soil Preparation - Parcel A1',
      'Tomato Harvest - Field B2',
      'Inventory Check - Warehouse 1',
      'Drip Irrigation - Zone C',
      'Equipment Maintenance - Tractor 01',
      'Planting Seeds - Parcel D4',
      'Pest Control - Greenhouse 2',
      'Fertilizer Application - Field E1'
    ];

    const activeOperations: ActiveOperation[] = operationNames
      .slice(0, Math.floor(Math.random() * 5) + 3)
      .map((name, i) => ({
        id: `op-${i}`,
        type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
        name,
        status: ['in_progress', 'pending', 'paused'][Math.floor(Math.random() * 3)] as ActiveOperation['status'],
        assignee: userNames[Math.floor(Math.random() * userNames.length)],
        startedAt: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
        farmName: `Farm ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
        parcelName: `Parcel ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 5) + 1}`,
        progress: Math.floor(Math.random() * 100),
      }));

    const byType: Record<string, number> = {};
    activeOperations.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + 1;
    });

    // Generate farm activities
    const activityTypes = ['Task Started', 'Harvest Recorded', 'Inventory Updated', 'Worker Checked In', 'Report Generated', 'Alert Triggered'];
    const farmNames = ['Olive Grove Farm', 'Citrus Valley', 'Green Fields', 'Sunrise Agriculture'];

    const farmActivities: FarmActivity[] = Array.from({ length: Math.floor(Math.random() * 8) + 5 }, (_, i) => ({
      id: `activity-${i}`,
      farmId: `farm-${Math.floor(Math.random() * 4)}`,
      farmName: farmNames[Math.floor(Math.random() * farmNames.length)],
      activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      description: `Activity in ${farmNames[Math.floor(Math.random() * farmNames.length)]}`,
      timestamp: new Date(now.getTime() - Math.random() * 1800000).toISOString(),
      userName: userNames[Math.floor(Math.random() * userNames.length)],
      location: {
        lat: 33.5731 + (Math.random() - 0.5) * 0.5, // Morocco coordinates
        lng: -7.5898 + (Math.random() - 0.5) * 0.5,
      },
    }));

    // Generate heatmap data
    const heatmapData = this.generateMockHeatmapData();

    // Generate feature usage
    const features = ['Dashboard', 'Tasks', 'Harvests', 'Inventory', 'Workers', 'Analytics', 'Reports', 'Settings'];
    const featureUsage: FeatureUsage[] = features.map(feature => ({
      feature,
      count: Math.floor(Math.random() * 100) + 10,
      percentage: Math.floor(Math.random() * 30) + 5,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as FeatureUsage['trend'],
    })).sort((a, b) => b.count - a.count);

    return {
      concurrentUsers: {
        total: concurrentUsers.length,
        users: concurrentUsers,
      },
      activeOperations: {
        total: activeOperations.length,
        byType,
        operations: activeOperations,
      },
      farmActivities: {
        total: farmActivities.length,
        activities: farmActivities,
      },
      heatmapData,
      featureUsage,
      lastUpdated: now.toISOString(),
    };
  }

  /**
   * Generate mock summary data for fallback
   */
  private generateMockSummary(_organizationId: string): LiveDashboardSummary {
    return {
      concurrentUsersCount: Math.floor(Math.random() * 10) + 3,
      activeOperationsCount: Math.floor(Math.random() * 15) + 5,
      activeFarmsCount: Math.floor(Math.random() * 5) + 2,
      totalActivitiesLast24h: Math.floor(Math.random() * 200) + 50,
      peakUsageTime: '09:00 - 11:00',
      mostActiveFeature: 'Tasks Management',
    };
  }

  /**
   * Generate mock heatmap data for fallback
   */
  private generateMockHeatmapData(): ActivityHeatmapPoint[] {
    // Generate points around Morocco (or another region) for demo
    const baseLatMorocco = 33.5731;
    const baseLngMorocco = -7.5898;

    const activityTypes = ['harvest', 'irrigation', 'maintenance', 'planting', 'inspection'];

    return Array.from({ length: 25 }, () => ({
      lat: baseLatMorocco + (Math.random() - 0.5) * 1.5,
      lng: baseLngMorocco + (Math.random() - 0.5) * 1.5,
      intensity: Math.random() * 0.8 + 0.2,
      activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      count: Math.floor(Math.random() * 20) + 1,
    }));
  }
}

export const liveDashboardService = new LiveDashboardService();
