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
  const { currentOrganization, currentFarm, user } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

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
        .single();

      if (error && error.code !== 'PGRST116') {
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
    const title = `${organizationName}${farmName} | Tableau de bord`;
    const description = 'Pilotez vos fermes : visualisez parcelles, tâches, analyses et comptabilité dans une seule interface.';

    document.title = title;

    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
  }, [currentOrganization, currentFarm]);

  const structuredData = useMemo(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${organizationName} – plateforme de gestion agricole`,
      description: 'Solution unifiée de gestion agricole : fermes, parcelles, tâches, comptabilité et analyses.',
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
          name: 'Gestion des parcelles',
          url: `${siteOrigin}/parcels`,
        },
        {
          '@type': 'Service',
          name: 'Planification des tâches',
          url: `${siteOrigin}/tasks`,
        },
        {
          '@type': 'Service',
          name: 'Comptabilité agricole',
          url: `${siteOrigin}/accounting`,
        },
        {
          '@type': 'Service',
          name: 'Analyses de laboratoire',
          url: `${siteOrigin}/analyses`,
        },
      ],
    };
  }, [currentOrganization, siteOrigin]);

  const featureHighlights = useMemo(() => [
    {
      id: 'farm-ops',
      title: 'Opérations agricoles pilotées',
      description: 'Visualisez vos fermes, parcelles et suivis culturaux en temps réel pour déclencher les bonnes actions.',
      cta: { label: 'Ouvrir la gestion des parcelles', to: '/parcels' }
    },
    {
      id: 'task-execution',
      title: 'Tâches et main-d’œuvre coordonnés',
      description: 'Planifiez les travaux, assignez vos équipes et suivez l’avancement et le temps passé depuis un seul écran.',
      cta: { label: 'Planifier une tâche', to: '/tasks' }
    },
    {
      id: 'financial-health',
      title: 'Santé financière consolidée',
      description: 'Reliez factures, paiements et coûts par ferme pour anticiper trésorerie et marges.',
      cta: { label: 'Consulter la comptabilité', to: '/accounting' }
    },
    {
      id: 'lab-services',
      title: 'Analyses & services intégrés',
      description: 'Commandez vos analyses de sol et laboratoire depuis la plateforme et intégrez les résultats à vos décisions.',
      cta: { label: 'Explorer les analyses', to: '/analyses' }
    },
  ], []);

  const commandActions = useMemo<Action[]>(() => {
    const navigationActions: Action[] = [
      {
        id: 'go-dashboard',
        name: 'Aller au tableau de bord',
        shortcut: ['g', 'd'],
        keywords: 'dashboard accueil home tableau',
        section: 'Navigation',
        perform: () => navigate({ to: '/dashboard' }),
      },
      {
        id: 'go-analyses',
        name: 'Ouvrir les analyses',
        shortcut: ['g', 'a'],
        keywords: 'analyses soil rapport',
        section: 'Navigation',
        perform: () => navigate({ to: '/analyses' }),
      },
      {
        id: 'go-parcels',
        name: 'Voir les parcelles',
        shortcut: ['g', 'p'],
        keywords: 'parcelles champs map',
        section: 'Navigation',
        perform: () => navigate({ to: '/parcels' }),
      },
      {
        id: 'go-stock',
        name: 'Accéder au stock',
        shortcut: ['g', 's'],
        keywords: 'stock inventaire',
        section: 'Navigation',
        perform: () => navigate({ to: '/stock' }),
      },
      {
        id: 'go-infrastructure',
        name: 'Consulter les infrastructures',
        shortcut: ['g', 'i'],
        keywords: 'infrastructure irrigation équipements',
        section: 'Navigation',
        perform: () => navigate({ to: '/infrastructure' }),
      },
      {
        id: 'go-settings',
        name: 'Ouvrir les paramètres',
        shortcut: ['g', 't'],
        keywords: 'paramètres settings organisation',
        section: 'Navigation',
        perform: () => navigate({ to: '/settings' }),
      },
    ]

    const moduleActions: Action[] = modules
      .filter((module) => module.active)
      .map((module) => ({
        id: `module-${module.id}`,
        name: module.name,
        subtitle: 'Modules disponibles',
        keywords: `${module.category} ${module.description ?? ''}`.trim(),
        section: 'Modules',
        perform: () => {
          setActiveModule(module.id);
          navigate({ to: '/$moduleId', params: { moduleId: module.id } });
        },
      }))

    const preferenceActions: Action[] = [
      {
        id: 'toggle-theme',
        name: isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre',
        shortcut: ['t'],
        keywords: 'theme mode sombre clair dark light',
        section: 'Préférences',
        perform: toggleTheme,
      },
    ]

    return [...navigationActions, ...moduleActions, ...preferenceActions]
  }, [isDarkMode, modules, navigate, toggleTheme])

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  return (
    <CommandPalette actions={commandActions}>
      <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
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
            Pilotage de l'exploitation agricole
          </h1>
          <header className="border-b border-transparent" role="presentation">
            <SubscriptionBanner />
            <ModernPageHeader
              breadcrumbs={[
                { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
                ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
                { icon: Home, label: 'Tableau de bord', isActive: true }
              ]}
              title="Pilotage de l'exploitation"
              subtitle="Analysez vos fermes, vos équipes et votre performance financière en un seul endroit."
              actions={<QuickActionsButton />}
            />
          </header>

          <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Feature Highlights */}
            <div className="flex flex-col gap-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm p-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Points clés de la plateforme
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Activez les modules qui soutiennent vos objectifs quotidiens et accédez rapidement aux actions stratégiques.
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
                  Vue opérationnelle unifiée
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Surveillez en direct vos indicateurs clés : taches prioritaires, données météo et performances financières.
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
  const { query } = useKBar()

  return (
    <button
      type="button"
      onClick={query.toggle}
      className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-green-500 hover:text-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-green-400 dark:hover:text-green-300"
    >
      <span className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Actions rapides
      </span>
      <span className="hidden items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 sm:flex">
        <kbd className="font-semibold">Cmd</kbd>
        <span>+</span>
        <kbd className="font-semibold">K</kbd>
      </span>
    </button>
  )
}
