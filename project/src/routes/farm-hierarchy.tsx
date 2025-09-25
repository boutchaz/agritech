import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import OrganizationSwitcher from '../components/OrganizationSwitcher';
import FarmHierarchyTree from '../components/FarmHierarchyTree';
import FarmRoleManager from '../components/FarmRoleManager';
import { useState } from 'react';
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
  const { currentOrganization, currentFarm, user } = useAuth();
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Accès requis</h2>
          <p className="text-gray-600 dark:text-gray-400">Veuillez vous connecter pour gérer la hiérarchie des fermes.</p>
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
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedFarm ? 'Gestion des Rôles' : 'Gestion des Fermes'}
            </h2>
            {selectedFarm && (
              <button
                onClick={() => setSelectedFarm(null)}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
              >
                ← Retour à la hiérarchie
              </button>
            )}
          </div>

          {selectedFarm ? (
            <FarmRoleManager
              farmId={selectedFarm.id}
              farmName={selectedFarm.name}
              onClose={() => setSelectedFarm(null)}
            />
          ) : (
            <FarmHierarchyTree
              organizationId={currentOrganization.id}
              onManageRoles={(farmId) => {
                // Find farm name from the tree data
                setSelectedFarm({ id: farmId, name: `Farm ${farmId}` });
              }}
              onAddParcel={(farmId) => {
                console.log('Add parcel to farm:', farmId);
                // TODO: Implement add parcel functionality
              }}
              onEditParcel={(parcelId) => {
                console.log('Edit parcel:', parcelId);
                // TODO: Implement edit parcel functionality
              }}
              onDeleteParcel={(parcelId) => {
                console.log('Delete parcel:', parcelId);
                // TODO: Implement delete parcel functionality
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
