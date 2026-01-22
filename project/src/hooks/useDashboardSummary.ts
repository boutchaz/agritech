import { useQuery } from '@tanstack/react-query';
import { dashboardService, type DashboardSummary } from '../services/dashboardService';
import { useAuth } from '../hooks/useAuth';

export function useDashboardSummary(farmId?: string) {
    const { currentOrganization } = useAuth();

    return useQuery({
        queryKey: ['dashboard-summary', currentOrganization?.id, farmId],
        queryFn: () => dashboardService.getDashboardSummary(farmId),
        enabled: !!currentOrganization?.id,
        staleTime: 1000 * 60, // 1 minute
    });
}

export type { DashboardSummary };
