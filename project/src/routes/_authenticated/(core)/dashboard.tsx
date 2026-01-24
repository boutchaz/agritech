import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Dashboard from '@/components/Dashboard'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Home, Building2, Search, Activity, RefreshCw } from 'lucide-react'
import type { DashboardSettings } from '@/types'
import { createFileRoute } from '@tanstack/react-router'
import { useKBar } from 'kbar'
import { useQuery } from '@tanstack/react-query'
import { authSupabase } from '@/lib/auth-supabase'
import { withRouteProtection } from '@/components/authorization/withRouteProtection'
import { useTranslation } from 'react-i18next'
import { useAutoStartTour } from '@/contexts/TourContext'
import { useLiveMetrics, useLiveSummary, useActivityHeatmap } from '@/hooks/useLiveMetrics'
import {
  ConcurrentUsersWidget,
  ActiveOperationsWidget,
  FarmActivitiesWidget,
  FeatureUsageWidget,
  LiveSummaryCards,
  ActivityHeatMap,
} from '@/components/LiveDashboard'
import {
  trackDashboardView,
  trackLiveModeToggle,
  trackRefreshMetrics,
  trackPageView,
} from '@/lib/analytics'

// Sensor data is now fetched via useSensorData hook in Dashboard component
// No mock data needed - the hook handles real sensor connections when available

const defaultDashboardSettings: DashboardSettings = {
  showSoilData: true,
  showClimateData: true,
  showIrrigationData: true,
  showMaintenanceData: true,
  showProductionData: true,
  showFinancialData: true,
  showStockAlerts: true,
  showTaskAlerts: true,
  layout: {
    topRow: ['parcels', 'workers', 'stock', 'harvests'],
    middleRow: [],
    bottomRow: ['climate', 'irrigation']
  }
};

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm, user } = useAuth();
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

  // Live mode toggle state
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Auto-start welcome tour for new users (with 2 second delay)
  useAutoStartTour('welcome', 2000);

  // Track dashboard page view and mode changes
  useEffect(() => {
    trackPageView({
      title: isLiveMode ? t('liveDashboard.title') : t('dashboard.pageTitle'),
    });
    trackDashboardView(isLiveMode ? 'live' : 'regular');
  }, [isLiveMode, t]);

  // Track live mode toggle changes
  useEffect(() => {
    trackLiveModeToggle(isLiveMode);
  }, [isLiveMode]);

  // Fetch dashboard settings from database
  const { data: dashboardSettings = defaultDashboardSettings } = useQuery({
    queryKey: ['dashboard-settings', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user || !currentOrganization) return defaultDashboardSettings;

      const { data, error } = await authSupabase
        .from('dashboard_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching dashboard settings:', error);
        return defaultDashboardSettings;
      }

      if (data) {
        return {
          showSoilData: data.show_soil_data,
          showClimateData: data.show_climate_data,
          showIrrigationData: data.show_irrigation_data,
          showMaintenanceData: data.show_maintenance_data,
          showProductionData: data.show_production_data,
          showFinancialData: data.show_financial_data,
          showStockAlerts: data.show_stock_alerts,
          showTaskAlerts: data.show_task_alerts,
          layout: data.layout
        };
      }

      return defaultDashboardSettings;
    },
    enabled: !!user && !!currentOrganization,
    staleTime: 60000,
  });

  // Fetch live metrics with auto-refresh (only when live mode is enabled)
  const {
    data: liveMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useLiveMetrics({ refetchInterval: 5000, enabled: isLiveMode });

  // Fetch summary stats (only when live mode is enabled)
  const {
    data: liveSummary,
    isLoading: summaryLoading,
  } = useLiveSummary({ refetchInterval: 10000, enabled: isLiveMode });

  // Fetch heatmap data (only when live mode is enabled)
  const {
    data: heatmapData,
    isLoading: heatmapLoading,
  } = useActivityHeatmap({ refetchInterval: 15000, enabled: isLiveMode });

  // Set page title
  useEffect(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    const farmName = currentFarm?.name ? ` · ${currentFarm.name}` : '';
    const modeTitle = isLiveMode ? t('liveDashboard.title') : t('dashboard.pageTitle');
    const title = `${organizationName}${farmName} | ${modeTitle}`;
    document.title = title;
  }, [currentOrganization, currentFarm, t, isLiveMode]);

  // Structured data for SEO
  const structuredData = useMemo(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${organizationName} – ${t('dashboard.structuredData.platformName')}`,
      description: t('dashboard.structuredData.description'),
      url: `${siteOrigin}/dashboard`,
      brand: {
        '@type': 'Organization',
        name: organizationName,
      },
    };
  }, [currentOrganization, siteOrigin, t]);

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
          ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
          { icon: isLiveMode ? Activity : Home, label: isLiveMode ? t('liveDashboard.title') : t('nav.dashboard'), isActive: true }
        ]}
        title={isLiveMode ? t('liveDashboard.title') : t('dashboard.title')}
        subtitle={isLiveMode ? t('liveDashboard.subtitle') : t('dashboard.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            {/* Live Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Live</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => setIsLiveMode(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${isLiveMode ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${isLiveMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </label>
            {/* Live mode refresh button */}
            {isLiveMode && (
              <button
                onClick={() => {
                  refetchMetrics();
                  trackRefreshMetrics();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                {t('liveDashboard.refresh')}
              </button>
            )}
            <QuickActionsButton />
          </div>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6 pb-6 space-y-6">
        {isLiveMode ? (
          <>
            {/* Live Dashboard Content */}
            <LiveSummaryCards summary={liveSummary} isLoading={summaryLoading} />

            {/* Main Grid - Heat Map and Concurrent Users */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Heat Map - Takes 2 columns */}
              <div className="lg:col-span-2">
                <ActivityHeatMap
                  data={heatmapData || []}
                  isLoading={heatmapLoading}
                  lastUpdated={liveMetrics?.lastUpdated}
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
          </>
        ) : (
          <>
            {/* Regular Dashboard Content */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('dashboard.unifiedView.title')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboard.unifiedView.subtitle')}
                </p>
              </div>
              <Dashboard sensorData={[]} settings={dashboardSettings} />
            </div>
          </>
        )}
      </div>

      <section aria-hidden="true" className="sr-only">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </section>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(core)/dashboard')({
  component: withRouteProtection(AppContent, 'read', 'Dashboard'),
})

const QuickActionsButton: React.FC = () => {
  const { t } = useTranslation();
  const { query } = useKBar()

  const handleClick = () => {
    query.toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-green-500 hover:text-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-green-400 dark:hover:text-green-300"
    >
      <span className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        {t('dashboard.quickActions')}
      </span>
      <span className="hidden items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 sm:flex">
        <kbd className="font-semibold">Cmd</kbd>
        <span>+</span>
        <kbd className="font-semibold">K</kbd>
      </span>
    </button>
  )
}
