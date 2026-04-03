import React, { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Dashboard from '@/components/Dashboard'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Home, Building2, Search, Activity, RefreshCw } from 'lucide-react'
import type { DashboardSettings } from '@/types'
import { createFileRoute } from '@tanstack/react-router'
import { useCommandPaletteToggle } from '@/components/GlobalCommandPalette'
import { useQuery } from '@tanstack/react-query'
import { dashboardSettingsApi } from '@/lib/api/dashboard-settings'
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
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton'
import { Button } from '@/components/ui/button';

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

const LIVE_MODE_KEY = 'agrogina:dashboard:live-mode';

function getStoredLiveMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LIVE_MODE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm, user } = useAuth();
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

  const [isLiveMode, setIsLiveMode] = useState(getStoredLiveMode);

  const toggleLiveMode = (value: boolean) => {
    setIsLiveMode(value);
    try {
      localStorage.setItem(LIVE_MODE_KEY, String(value));
    } catch { /* localStorage unavailable */ }
  };

  // Auto-start welcome tour for new users (with 2 second delay)
  useAutoStartTour('welcome', 2000);

  // Track dashboard page view (fire once on mount + when live mode changes)
  useEffect(() => {
    trackPageView({
      title: isLiveMode ? 'Live Dashboard' : 'Dashboard',
    });
    trackDashboardView(isLiveMode ? 'live' : 'regular');
  }, [isLiveMode]);

  // Fetch dashboard settings from database
  const { data: dashboardSettings = defaultDashboardSettings } = useQuery({
    queryKey: ['dashboard-settings', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user || !currentOrganization) return defaultDashboardSettings;

      try {
        const data = await dashboardSettingsApi.getSettings(currentOrganization.id);

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
      } catch (error) {
        console.error('Error fetching dashboard settings:', error);
        return defaultDashboardSettings;
      }
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
    return <DashboardSkeleton />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
          { icon: isLiveMode ? Activity : Home, label: isLiveMode ? t('liveDashboard.title') : t('nav.dashboard'), isActive: true }
        ]}
        title={isLiveMode ? t('liveDashboard.title') : `${t('dashboard.title')}, ${user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''}`}
        subtitle={isLiveMode ? t('liveDashboard.subtitle') : t('dashboard.subtitle')}
        actions={
          <div className="flex items-center gap-4">
            {/* Enhanced Live Mode Toggle */}
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 transition-colors",
                isLiveMode ? "text-slate-400" : "text-slate-600 dark:text-slate-300"
              )}>Static</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => toggleLiveMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-sm"></div>
              </label>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 transition-colors",
                isLiveMode ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
              )}>Live</span>
            </div>

            {/* Live mode refresh button */}
            {isLiveMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchMetrics();
                  trackRefreshMetrics();
                }}
                className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", summaryLoading && "animate-spin")} />
                <span className="text-xs font-bold uppercase tracking-tight">{t('liveDashboard.refresh')}</span>
              </Button>
            )}
            <QuickActionsButton />
          </div>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
        {isLiveMode ? (
          <div className="animate-in fade-in duration-500 space-y-8">
            {/* Live Dashboard Content */}
            <LiveSummaryCards summary={liveSummary} isLoading={summaryLoading} />

            {/* Main Grid - Heat Map and Concurrent Users */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Heat Map - Takes 8 columns */}
              <div className="lg:col-span-8">
                <ActivityHeatMap
                  data={heatmapData || []}
                  isLoading={heatmapLoading}
                  lastUpdated={liveMetrics?.lastUpdated}
                />
              </div>

              {/* Concurrent Users - Takes 4 columns */}
              <div className="lg:col-span-4">
                <ConcurrentUsersWidget
                  users={liveMetrics?.concurrentUsers.users || []}
                  total={liveMetrics?.concurrentUsers.total || 0}
                  isLoading={metricsLoading}
                />
              </div>
            </div>

            {/* Secondary Grid - Operations and Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

            <div className="p-1 rounded-3xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-inner">
              {/* Feature Usage */}
              <FeatureUsageWidget
                features={liveMetrics?.featureUsage || []}
                isLoading={metricsLoading}
              />
            </div>

            {/* Last Updated Footer */}
            {liveMetrics?.lastUpdated && (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {t('liveDashboard.lastUpdated')}: {new Date(liveMetrics.lastUpdated).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-8">
            {/* Regular Dashboard Content */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('dashboard.unifiedView.title')}
                </h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t('dashboard.unifiedView.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800">
                <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">Global Status: Optimal</span>
              </div>
            </div>
            <Dashboard sensorData={[]} settings={dashboardSettings} />
          </div>
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
  const { toggle } = useCommandPaletteToggle();

  const handleClick = () => {
    toggle();
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 h-10 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
    >
      <span className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5" />
        {t('dashboard.quickActions')}
      </span>
      <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500 sm:flex">
        <kbd className="tracking-tighter">CMD</kbd>
        <span className="opacity-50">+</span>
        <kbd className="tracking-tighter">K</kbd>
      </span>
    </Button>
  )
}
