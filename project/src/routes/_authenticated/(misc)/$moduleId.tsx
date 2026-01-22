import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import ModuleView from '@/components/ModuleView'
import type { Module, SensorData } from '@/types'

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
  const { currentOrganization } = useAuth();
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();

  const selectedModule = mockModules.find(m => m.id === moduleId);

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  if (!selectedModule) {
    return (
      <>
        {/* Module Not Found Screen */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-8">
          <div className="max-w-2xl w-full text-center space-y-8">
            {/* Animated Tractor in Field */}
            <div className="relative h-64 mb-8 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 via-green-100 to-green-200 dark:from-sky-900 dark:via-green-900 dark:to-green-800">
              {/* Sky with clouds */}
              <div className="absolute top-4 left-10 w-16 h-8 bg-white dark:bg-gray-200 rounded-full opacity-70 animate-pulse"></div>
              <div className="absolute top-8 right-16 w-20 h-10 bg-white dark:bg-gray-200 rounded-full opacity-60 animate-pulse delay-100"></div>

              {/* Sun */}
              <div className="absolute top-6 right-8 w-12 h-12 bg-yellow-400 dark:bg-yellow-300 rounded-full shadow-lg animate-pulse"></div>

              {/* Field with animated tractor */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-green-300 to-green-400 dark:from-green-700 dark:to-green-600">
                {/* Field furrows */}
                <div className="absolute inset-0 opacity-30">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-1 bg-green-600 dark:bg-green-900" style={{ marginTop: `${i * 16}px` }}></div>
                  ))}
                </div>
              </div>

              {/* Animated Tractor */}
              <div className="absolute bottom-20 left-0 w-full">
                <div className="animate-[slide_8s_linear_infinite]">
                  <div className="inline-block ml-[-100px]">
                    {/* Simple tractor SVG representation */}
                    <svg width="100" height="60" viewBox="0 0 100 60" className="drop-shadow-lg">
                      {/* Tractor body */}
                      <rect x="20" y="20" width="50" height="25" fill="#DC2626" rx="3" />
                      {/* Cabin */}
                      <rect x="45" y="10" width="25" height="15" fill="#DC2626" rx="2" />
                      <rect x="48" y="12" width="8" height="8" fill="#93C5FD" opacity="0.8" />
                      {/* Exhaust */}
                      <rect x="25" y="15" width="4" height="8" fill="#374151" rx="1" />
                      {/* Smoke */}
                      <circle cx="27" cy="10" r="3" fill="#9CA3AF" opacity="0.6" className="animate-ping" />
                      {/* Back wheel (large) */}
                      <circle cx="60" cy="45" r="12" fill="#1F2937" />
                      <circle cx="60" cy="45" r="8" fill="#374151" />
                      <circle cx="60" cy="45" r="3" fill="#6B7280" />
                      {/* Front wheel (small) */}
                      <circle cx="30" cy="45" r="8" fill="#1F2937" />
                      <circle cx="30" cy="45" r="5" fill="#374151" />
                      <circle cx="30" cy="45" r="2" fill="#6B7280" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Mountains in background */}
              <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-8 opacity-20">
                <div className="w-32 h-24 bg-gray-600 dark:bg-gray-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                <div className="w-40 h-32 bg-gray-600 dark:bg-gray-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Module non trouvé
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Le module <span className="font-mono font-semibold text-green-600 dark:text-green-400">"{moduleId}"</span> n'existe pas ou n'est pas actif.
              </p>
            </div>

            {/* Available Modules */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Modules disponibles :
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mockModules
                  .filter(m => m.active)
                  .map(module => (
                    <button
                      key={module.id}
                      onClick={() => navigate({ to: `/${module.id}` })}
                      className="px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                    >
                      <div className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                        {module.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {module.id}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Help Text */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sélectionnez un module dans la liste ci-dessus ou utilisez le menu de navigation.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes slide {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(calc(100vw + 100px));
            }
          }
        `}</style>
      </>
    );
  }

  return <ModuleView module={selectedModule} sensorData={mockSensorData} />;
};

export const Route = createFileRoute('/_authenticated/(misc)/$moduleId')({
  component: AppContent,
})
