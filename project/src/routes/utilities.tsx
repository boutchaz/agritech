import React, { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'

import { MobileNavBar } from '../components/MobileNavBar'
import ModernPageHeader from '../components/ModernPageHeader'
import { useState } from 'react'
import type { Module } from '../types'
import { Loader2, Building2, Zap } from 'lucide-react'

// Lazy load utilities component (includes Recharts ~600KB)
const UtilitiesManagement = lazy(() => import('../components/UtilitiesManagement'))

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
  const { currentOrganization, currentFarm: _currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('utilities');
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
        {/* Mobile Navigation Bar */}
        <MobileNavBar title="Gestion des Utilités" />

        {/* Desktop Header */}
        <div className="hidden md:block">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: Zap, label: 'Gestion des Utilités', isActive: true }
            ]}
            title="Gestion des Utilités"
            subtitle="Suivez et gérez la consommation d'eau et d'électricité de vos fermes"
          />
        </div>

        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement du tableau de bord...</span>
            </div>
          }>
            <UtilitiesManagement />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/utilities')({
  component: AppContent,
})
