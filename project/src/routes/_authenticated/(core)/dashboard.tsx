import React, { useEffect, useMemo } from 'react'
import { useAuth } from '@/components/MultiTenantAuthProvider'
import Dashboard from '@/components/Dashboard'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Home, Building2, Search } from 'lucide-react'
import type { SensorData, DashboardSettings } from '@/types'
import { createFileRoute } from '@tanstack/react-router'
import { useKBar } from 'kbar'
import { useQuery } from '@tanstack/react-query'
import { authSupabase } from '@/lib/auth-supabase'
import { withRouteProtection } from '@/components/authorization/withRouteProtection'
import { useTranslation } from 'react-i18next'
import { useAutoStartTour } from '@/contexts/TourContext'

const mockSensorData: SensorData[] = [
  {
    id: '1',
    type: 'moisture',
    value: 68,
    unit: '%',
    timestamp: new Date(),
    location: 'Parcelle A'
  }
];

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

  // Auto-start welcome tour for new users (with 2 second delay)
  useAutoStartTour('welcome', 2000);

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

  // Set page title
  useEffect(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    const farmName = currentFarm?.name ? ` · ${currentFarm.name}` : '';
    const title = `${organizationName}${farmName} | ${t('dashboard.pageTitle')}`;
    document.title = title;
  }, [currentOrganization, currentFarm, t]);

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
          { icon: Home, label: t('nav.dashboard'), isActive: true }
        ]}
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={<QuickActionsButton />}
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('dashboard.unifiedView.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dashboard.unifiedView.subtitle')}
            </p>
          </div>
          <Dashboard sensorData={mockSensorData} settings={dashboardSettings} />
        </div>
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

  return (
    <button
      type="button"
      onClick={query.toggle}
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
