import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import StockManagement from '../components/StockManagement'
import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { Building2, Package } from 'lucide-react'
import type { Module } from '../types'

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

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('stock');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);

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
        <PageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name },
            { icon: Package, label: 'Gestion du Stock', isActive: true }
          ]}
        />
        <StockManagement />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/stock')({
  component: AppContent,
})
