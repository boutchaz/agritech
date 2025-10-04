import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import InfrastructureManagement from '../components/InfrastructureManagement'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import { useState } from 'react'
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
  const { currentOrganization, currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('infrastructure');
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
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentOrganization.name}
            </h1>
            {currentFarm && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                • {currentFarm.name}
              </span>
            )}
          </div>
          <OrganizationSwitcher />
        </div>
        <InfrastructureManagement />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/infrastructure')({
  component: AppContent,
})
