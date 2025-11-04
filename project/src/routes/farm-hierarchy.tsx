import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import ModernFarmHierarchy from '../components/FarmHierarchy/ModernFarmHierarchy';
import FarmRoleManager from '../components/FarmRoleManager';
import { useState } from 'react';
import { Building2, Settings } from 'lucide-react';
import type { Module } from '../types';

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
  }
];

function FarmHierarchyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentOrganization, user } = useAuth();
  const [selectedFarm, setSelectedFarm] = useState<{ id: string; name: string } | null>(null);
  const [activeModule, setActiveModule] = useState('farm-hierarchy');
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('farmHierarchy.organizationLoading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('farmHierarchy.accessRequired')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.loginRequired')}</p>
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
            { icon: Building2, label: t('nav.farmHierarchy'), isActive: true }
          ]}
          title={t('farmHierarchy.title')}
          subtitle={t('farmHierarchy.subtitle')}
        />

        <div className="p-3 sm:p-4 lg:p-6">
          {selectedFarm ? (
            <div>
              {/* Back Button */}
              <button
                onClick={() => setSelectedFarm(null)}
                className="mb-6 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ← {t('farmHierarchy.backToHierarchy')}
              </button>

              {/* Role Manager */}
              <FarmRoleManager
                farmId={selectedFarm.id}
                farmName={selectedFarm.name}
                onClose={() => setSelectedFarm(null)}
              />
            </div>
          ) : (
            <ModernFarmHierarchy
              organizationId={currentOrganization.id}
              onFarmSelect={(farmId) => {
                console.log('Select farm:', farmId);
                // TODO: Navigate to farm details
              }}
              onManageFarm={(farmId) => {
                setSelectedFarm({ id: farmId, name: `Farm ${farmId}` });
              }}
              onAddParcel={(farmId) => {
                // Navigate to parcels route with farmId pre-selected to enable map-based parcel creation
                navigate({
                  to: '/parcels',
                  search: { farmId }
                });
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/farm-hierarchy')({
  component: FarmHierarchyPage,
});
