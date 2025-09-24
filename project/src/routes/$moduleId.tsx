import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import ModuleView from '../components/ModuleView'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import { useState } from 'react'
import type { Module, SensorData } from '../types'

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers et optimisez votre production fruitière',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' },
      { name: 'Parcelles', value: 3, unit: 'ha', trend: 'stable' },
      { name: 'Santé', value: 85, unit: '%', trend: 'up' }
    ]
  },
  {
    id: 'cereals',
    name: 'Céréales',
    icon: 'Wheat',
    active: true,
    category: 'agriculture',
    description: 'Gestion des cultures céréalières',
    metrics: [
      { name: 'Surface', value: 45, unit: 'ha', trend: 'stable' },
      { name: 'Rendement', value: 8.2, unit: 't/ha', trend: 'up' }
    ]
  },
  {
    id: 'vegetables',
    name: 'Légumes',
    icon: 'Carrot',
    active: true,
    category: 'agriculture',
    description: 'Production de légumes de saison',
    metrics: [
      { name: 'Diversité', value: 12, unit: 'variétés', trend: 'up' },
      { name: 'Production', value: 25, unit: 't/ha', trend: 'stable' }
    ]
  },
  {
    id: 'mushrooms',
    name: 'Myciculture',
    icon: 'Sprout',
    active: false,
    category: 'agriculture',
    description: 'Gérez votre production de champignons',
    metrics: [
      { name: 'Humidité', value: 85, unit: '%', trend: 'stable' },
      { name: 'Production', value: 45, unit: 'kg/sem', trend: 'up' }
    ]
  },
  {
    id: 'livestock',
    name: 'Élevage',
    icon: 'Cow',
    active: false,
    category: 'elevage',
    description: 'Gestion du cheptel et alimentation',
    metrics: [
      { name: 'Têtes', value: 120, unit: 'animaux', trend: 'stable' },
      { name: 'Production', value: 850, unit: 'L/jour', trend: 'up' }
    ]
  }
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
  const { moduleId } = Route.useParams();
  const [activeModule, setActiveModule] = useState(moduleId);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, setModules] = useState(mockModules);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const selectedModule = modules.find(m => m.id === moduleId);

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

  if (!selectedModule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Module non trouvé
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Le module "{moduleId}" n'existe pas ou n'est pas actif.
          </p>
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
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full max-w-full overflow-x-hidden">
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
        <ModuleView module={selectedModule} sensorData={mockSensorData} />
      </main>
    </div>
  );
};

export const Route = createFileRoute('/$moduleId')({
  component: AppContent,
})
