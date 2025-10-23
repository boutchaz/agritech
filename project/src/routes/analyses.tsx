import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import AnalysisPage from '../components/AnalysisPage'
import ModernPageHeader from '../components/ModernPageHeader'
import { useState } from 'react'
import { Building2, Beaker } from 'lucide-react'
import type { Module } from '../types'

const mockModules: Module[] = [
  {
    id: 'analyses',
    name: 'Analyses',
    icon: 'Beaker',
    active: true,
    category: 'agriculture',
    description: 'Analyses de sol, plante et eau',
    metrics: []
  },
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
];

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('analyses');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);

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
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: Beaker, label: 'Analyses', isActive: true }
          ]}
          title="Analyses de Sol, Plante et Eau"
          subtitle="Gérez et suivez vos analyses agricoles"
        />
        <AnalysisPage />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/analyses')({
  component: AppContent,
})
