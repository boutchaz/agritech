import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'
import PageHeader from '../components/PageHeader'
import SubscriptionBanner from '../components/SubscriptionBanner'
import { Home, Building2, Search } from 'lucide-react'
import type { Module, SensorData, DashboardSettings } from '../types'
import { CommandPalette } from '../components/CommandPalette'
import { useNavigate, createFileRoute } from '@tanstack/react-router'
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
    topRow: ['farm', 'soil', 'climate', 'irrigation'],
    middleRow: ['production', 'financial'],
    bottomRow: ['alerts', 'tasks']
  }
};

const AppContent: React.FC = () => {
  const { currentOrganization, currentFarm, user } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);

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
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto">
          <SubscriptionBanner />
          <PageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
              { icon: Home, label: 'Tableau de bord', isActive: true }
            ]}
            actions={<QuickActionsButton />}
          />
          <Dashboard sensorData={mockSensorData} settings={dashboardSettings} />
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
