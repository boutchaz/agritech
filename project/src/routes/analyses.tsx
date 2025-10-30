import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import AnalysisPage from '../components/AnalysisPage';
import ModernPageHeader from '../components/ModernPageHeader';
import SubscriptionBanner from '../components/SubscriptionBanner';
import { Building2, Beaker, FlaskConical, ArrowRight } from 'lucide-react';
import type { Module } from '../types';

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
  const { currentOrganization, currentFarm } = useAuth();
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
        <SubscriptionBanner />
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: Beaker, label: 'Analyses', isActive: true }
          ]}
          title="Analyses de Sol, Plante et Eau"
          subtitle="Gérez et suivez vos analyses agricoles"
        />

        {/* Lab Services Banner */}
        <div className="px-6 pt-6">
          <Link to="/lab-services">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <FlaskConical className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Services de Laboratoire Professionnels
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Programmez des analyses avec UM6P et d'autres laboratoires certifiés
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              </div>
            </div>
          </Link>
        </div>

        <AnalysisPage />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/analyses')({
  component: AppContent,
});
