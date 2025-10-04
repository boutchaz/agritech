import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'
import PageHeader from '../components/PageHeader'
import SubscriptionBanner from '../components/SubscriptionBanner'
import { useState } from 'react'
import { Home, Building2 } from 'lucide-react'
import type { Module, SensorData, DashboardSettings } from '../types'

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

const AppContent: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);
  const [dashboardSettings, _setDashboardSettings] = useState<DashboardSettings>({
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
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

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
            { icon: Building2, label: currentOrganization.name },
            ...(currentFarm ? [{ icon: Home, label: currentFarm.name }] : []),
            { icon: Home, label: 'Tableau de bord', isActive: true }
          ]}
        />
        <Dashboard sensorData={mockSensorData} settings={dashboardSettings} />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/dashboard')({
  component: AppContent,
})
