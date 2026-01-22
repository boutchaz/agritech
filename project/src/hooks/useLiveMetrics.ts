import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  liveDashboardService,
  type LiveDashboardMetrics,
  type LiveDashboardSummary,
  type ActivityHeatmapPoint,
} from '../services/liveDashboardService';

/**
 * Hook to fetch live dashboard metrics with auto-refresh
 * Refreshes every 5 seconds by default for real-time updates
 */
export function useLiveMetrics(options?: { refetchInterval?: number; enabled?: boolean }) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery<LiveDashboardMetrics>({
    queryKey: ['live-metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      return liveDashboardService.getLiveMetrics(organizationId);
    },
    enabled: !!organizationId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 5000, // 5 seconds default
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
    staleTime: 3000, // Consider data stale after 3 seconds
  });
}

/**
 * Hook to fetch live dashboard summary stats
 * Lighter weight endpoint for quick overview
 */
export function useLiveSummary(options?: { refetchInterval?: number; enabled?: boolean }) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery<LiveDashboardSummary>({
    queryKey: ['live-summary', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      return liveDashboardService.getLiveSummary(organizationId);
    },
    enabled: !!organizationId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 10000, // 10 seconds default
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });
}

/**
 * Hook to fetch activity heatmap data for geographic visualization
 */
export function useActivityHeatmap(options?: { refetchInterval?: number; enabled?: boolean }) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery<ActivityHeatmapPoint[]>({
    queryKey: ['activity-heatmap', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      return liveDashboardService.getActivityHeatmap(organizationId);
    },
    enabled: !!organizationId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 15000, // 15 seconds default for heatmap
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
