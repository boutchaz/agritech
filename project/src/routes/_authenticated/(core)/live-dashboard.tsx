import React, { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, Building2, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useLiveMetrics, useLiveSummary, useActivityHeatmap } from '@/hooks/useLiveMetrics';
import { PageLoader } from '@/components/ui/loader';
import {
  ConcurrentUsersWidget,
  ActiveOperationsWidget,
  FarmActivitiesWidget,
  FeatureUsageWidget,
  LiveSummaryCards,
  ActivityHeatMap,
} from '@/components/LiveDashboard';

const LiveDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  // Fetch live metrics with auto-refresh
  const {
    data: liveMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useLiveMetrics({ refetchInterval: 5000 });

  // Fetch summary stats
  const {
    data: liveSummary,
    isLoading: summaryLoading,
  } = useLiveSummary({ refetchInterval: 10000 });

  // Fetch heatmap data
  const {
    data: heatmapData,
    isLoading: heatmapLoading,
  } = useActivityHeatmap({ refetchInterval: 15000 });

  // Set page title
  useEffect(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    const farmName = currentFarm?.name ? ` - ${currentFarm.name}` : '';
    document.title = `${t('liveDashboard.pageTitle')} | ${organizationName}${farmName}`;
  }, [currentOrganization, currentFarm, t]);

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
          { icon: Activity, label: t('liveDashboard.title'), isActive: true },
        ]}
        title={t('liveDashboard.title')}
        subtitle={t('liveDashboard.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span>{t('liveDashboard.autoRefresh')}</span>
            </div>
            <button
              onClick={() => refetchMetrics()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              {t('liveDashboard.refresh')}
            </button>
          </div>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6 pb-6 space-y-6">
        {/* Summary Cards */}
        <LiveSummaryCards summary={liveSummary} isLoading={summaryLoading} />

        {/* Main Grid - Heat Map and Concurrent Users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heat Map - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ActivityHeatMap
              data={heatmapData || []}
              isLoading={heatmapLoading}
              lastUpdated={liveMetrics?.lastUpdated}
              recentActivities={liveMetrics?.farmActivities.activities || []}
            />
          </div>

          {/* Concurrent Users */}
          <div className="lg:col-span-1">
            <ConcurrentUsersWidget
              users={liveMetrics?.concurrentUsers.users || []}
              total={liveMetrics?.concurrentUsers.total || 0}
              isLoading={metricsLoading}
            />
          </div>
        </div>

        {/* Secondary Grid - Operations and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Operations */}
          <ActiveOperationsWidget
            operations={liveMetrics?.activeOperations.operations || []}
            total={liveMetrics?.activeOperations.total || 0}
            byType={liveMetrics?.activeOperations.byType || {}}
            isLoading={metricsLoading}
          />

          {/* Farm Activities */}
          <FarmActivitiesWidget
            activities={liveMetrics?.farmActivities.activities || []}
            total={liveMetrics?.farmActivities.total || 0}
            isLoading={metricsLoading}
          />
        </div>

        {/* Feature Usage */}
        <FeatureUsageWidget
          features={liveMetrics?.featureUsage || []}
          isLoading={metricsLoading}
        />

        {/* Last Updated Footer */}
        {liveMetrics?.lastUpdated && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            {t('liveDashboard.lastUpdated')}: {new Date(liveMetrics.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(core)/live-dashboard')({
  component: withRouteProtection(LiveDashboardPage, 'read', 'Dashboard'),
});
