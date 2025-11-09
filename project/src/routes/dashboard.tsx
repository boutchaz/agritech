import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'
import ModernPageHeader from '../components/ModernPageHeader'
import SubscriptionBanner from '../components/SubscriptionBanner'
import { Home, Building2, Search } from 'lucide-react'
import type { Module, SensorData, DashboardSettings } from '../types'
import { CommandPalette } from '../components/CommandPalette'
import { useNavigate, createFileRoute, Link } from '@tanstack/react-router'
import type { Action } from 'kbar'
import { useKBar } from 'kbar'
import { useQuery } from '@tanstack/react-query'
import { authSupabase } from '../lib/auth-supabase'
import { withRouteProtection } from '../components/authorization/withRouteProtection'
import { useTranslation } from 'react-i18next'

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
  // ... other modules would be here
];

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
    middleRow: [], // tasks and soil are hardcoded, additional widgets can be added here
    bottomRow: ['climate', 'irrigation']
  }
};

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentOrganization, currentFarm, user } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';
  const isRTL = i18n.language === 'ar';

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
    staleTime: 60000, // Cache for 1 minute
  });

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    const farmName = currentFarm?.name ? ` · ${currentFarm.name}` : '';
    const title = `${organizationName}${farmName} | ${t('dashboard.pageTitle')}`;
    const description = t('dashboard.metaDescription');

    document.title = title;

    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
  }, [currentOrganization, currentFarm, t]);

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
      provider: {
        '@type': 'Organization',
        name: organizationName,
      },
      hasPart: [
        {
          '@type': 'Service',
          name: t('dashboard.structuredData.services.parcels'),
          url: `${siteOrigin}/parcels`,
        },
        {
          '@type': 'Service',
          name: t('dashboard.structuredData.services.tasks'),
          url: `${siteOrigin}/tasks`,
        },
        {
          '@type': 'Service',
          name: t('dashboard.structuredData.services.accounting'),
          url: `${siteOrigin}/accounting`,
        },
        {
          '@type': 'Service',
          name: t('dashboard.structuredData.services.analyses'),
          url: `${siteOrigin}/analyses`,
        },
      ],
    };
  }, [currentOrganization, siteOrigin, t]);

  const featureHighlights = useMemo(() => [
    {
      id: 'farm-ops',
      title: t('dashboard.keyFeatures.farmOps.title'),
      description: t('dashboard.keyFeatures.farmOps.description'),
      cta: { label: t('dashboard.keyFeatures.farmOps.cta'), to: '/parcels' }
    },
    {
      id: 'task-execution',
      title: t('dashboard.keyFeatures.taskExecution.title'),
      description: t('dashboard.keyFeatures.taskExecution.description'),
      cta: { label: t('dashboard.keyFeatures.taskExecution.cta'), to: '/tasks' }
    },
    {
      id: 'financial-health',
      title: t('dashboard.keyFeatures.financialHealth.title'),
      description: t('dashboard.keyFeatures.financialHealth.description'),
      cta: { label: t('dashboard.keyFeatures.financialHealth.cta'), to: '/accounting' }
    },
    {
      id: 'lab-services',
      title: t('dashboard.keyFeatures.labServices.title'),
      description: t('dashboard.keyFeatures.labServices.description'),
      cta: { label: t('dashboard.keyFeatures.labServices.cta'), to: '/analyses' }
    },
  ], [t, i18n.language]);

  const commandActions = useMemo<Action[]>(() => {
    const navigationActions: Action[] = [
      {
        id: 'go-dashboard',
        name: t('dashboard.commands.navigation.dashboard'),
        shortcut: ['g', 'd'],
        keywords: t('dashboard.commands.navigation.dashboardKeywords'),
        section: t('dashboard.commands.sections.navigation'),
        perform: () => navigate({ to: '/dashboard' }),
      },
      {
        id: 'go-analyses',
        name: t('dashboard.commands.navigation.analyses'),
        shortcut: ['g', 'a'],
        keywords: t('dashboard.commands.navigation.analysesKeywords'),
        section: t('dashboard.commands.sections.navigation'),
        perform: () => navigate({ to: '/analyses' }),
      },
      {
        id: 'go-parcels',
        name: t('dashboard.commands.navigation.parcels'),
        shortcut: ['g', 'p'],
        keywords: t('dashboard.commands.navigation.parcelsKeywords'),
        section: t('dashboard.commands.sections.navigation'),
        perform: () => navigate({ to: '/parcels' }),
      },
      {
        id: 'go-stock',
        name: t('dashboard.commands.navigation.stock'),
        shortcut: ['g', 's'],
        keywords: t('dashboard.commands.navigation.stockKeywords'),
        section: t('dashboard.commands.sections.navigation'),
        perform: () => navigate({ to: '/stock' }),
      },
      {
        id: 'go-infrastructure',
        name: t('dashboard.commands.navigation.infrastructure'),
        shortcut: ['g', 'i'],
        keywords: t('dashboard.commands.navigation.infrastructureKeywords'),
        section: t('dashboard.commands.sections.navigation'),
        perform: () => navigate({ to: '/infrastructure' }),
      },
      {
        id: 'go-settings',
        name: t('dashboard.commands.navigation.settings'),
        shortcut: ['g', 't'],
        keywords: t('dashboard.commands.navigation.settingsKeywords'),
        section: t('dashboard.commands.sections.navigation'),
        perform: () => navigate({ to: '/settings' }),
      },
    ]

    const moduleActions: Action[] = modules
      .filter((module) => module.active)
      .map((module) => ({
        id: `module-${module.id}`,
        name: module.name,
        subtitle: t('dashboard.commands.modules.subtitle'),
        keywords: `${module.category} ${module.description ?? ''}`.trim(),
        section: t('dashboard.commands.sections.modules'),
        perform: () => {
          setActiveModule(module.id);
          navigate({ to: '/$moduleId', params: { moduleId: module.id } });
        },
      }))

    const preferenceActions: Action[] = [
      {
        id: 'toggle-theme',
        name: isDarkMode ? t('dashboard.commands.preferences.lightMode') : t('dashboard.commands.preferences.darkMode'),
        shortcut: ['t'],
        keywords: t('dashboard.commands.preferences.themeKeywords'),
        section: t('dashboard.commands.sections.preferences'),
        perform: toggleTheme,
      },
    ]

    return [...navigationActions, ...moduleActions, ...preferenceActions]
  }, [isDarkMode, modules, navigate, toggleTheme, t])

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <CommandPalette actions={commandActions}>
      <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Sidebar
          modules={modules.filter(m => m.active)}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isDarkMode={isDarkMode}
          onThemeToggle={toggleTheme}
        />
        <main
          className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto"
          role="main"
          aria-labelledby="dashboard-hero-title"
        >
          <h1 id="dashboard-hero-title" className="sr-only">
            {t('dashboard.heroTitle')}
          </h1>
          <header className="border-b border-transparent" role="presentation">
            <SubscriptionBanner />
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
          </header>

          <div className="p-3 sm:p-4 lg:p-6 space-y-6">
            {/* Feature Highlights */}
            <div className="flex flex-col gap-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm p-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('dashboard.keyFeatures.title')}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboard.keyFeatures.subtitle')}
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {featureHighlights.map((feature) => (
                  <article
                    key={feature.id}
                    className="flex h-full flex-col justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                    <nav className="mt-4">
                      <Link
                        to={feature.cta.to}
                        className="inline-flex items-center text-sm font-medium text-green-700 dark:text-green-300 hover:underline"
                      >
                        {feature.cta.label}
                      </Link>
                    </nav>
                  </article>
                ))}
              </div>
            </div>

            {/* Dashboard Widgets */}
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
        </main>
      </div>
    </CommandPalette>
  );
};

export const Route = createFileRoute('/dashboard')({
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
