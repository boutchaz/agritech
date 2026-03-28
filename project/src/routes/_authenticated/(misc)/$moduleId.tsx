import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { useModules } from '@/hooks/useModules'
import { useModuleConfig } from '@/hooks/useModuleConfig'
import ModuleView from '@/components/ModuleView'
import type { Module } from '@/types'
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/ui/loader';


const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();
  const { data: orgModules = [], isLoading: modulesLoading } = useModules();
  const { data: moduleConfig, isLoading: configLoading } = useModuleConfig();

  if (!currentOrganization) {
    return (
      <SectionLoader />
    );
  }

  if (modulesLoading || configLoading) {
    return (
      <SectionLoader />
    );
  }

  const orgModule = orgModules.find(
    m => m.id === moduleId || m.name.toLowerCase().replace(/\s+/g, '-') === moduleId
  );
  const configModule = moduleConfig?.modules.find(m => m.slug === moduleId);

  const selectedModule: Module | undefined = orgModule
    ? {
        id: orgModule.id,
        name: configModule?.name ?? orgModule.name,
        icon: orgModule.icon || configModule?.icon || 'Leaf',
        active: orgModule.is_active,
        category: orgModule.category || 'agriculture',
        description: configModule?.description ?? orgModule.description ?? '',
      }
    : configModule
      ? {
          id: configModule.slug,
          name: configModule.name,
          icon: configModule.icon || 'Leaf',
          active: true,
          category: configModule.category || 'agriculture',
          description: configModule.description ?? '',
        }
      : undefined;

  if (!selectedModule) {
    const activeModules = orgModules.filter(m => m.is_active);
    return (
      <>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-8">
          <div className="max-w-2xl w-full text-center space-y-8">
            <div className="relative h-64 mb-8 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 via-green-100 to-green-200 dark:from-sky-900 dark:via-green-900 dark:to-green-800">
              <div className="absolute top-4 left-10 w-16 h-8 bg-white dark:bg-gray-200 rounded-full opacity-70 animate-pulse"></div>
              <div className="absolute top-8 right-16 w-20 h-10 bg-white dark:bg-gray-200 rounded-full opacity-60 animate-pulse delay-100"></div>
              <div className="absolute top-6 right-8 w-12 h-12 bg-yellow-400 dark:bg-yellow-300 rounded-full shadow-lg animate-pulse"></div>
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-green-300 to-green-400 dark:from-green-700 dark:to-green-600">
                <div className="absolute inset-0 opacity-30">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-1 bg-green-600 dark:bg-green-900" style={{ marginTop: `${i * 16}px` }}></div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-20 left-0 w-full">
                <div className="animate-[slide_8s_linear_infinite]">
                  <div className="inline-block ml-[-100px]">
                    <svg width="100" height="60" viewBox="0 0 100 60" className="drop-shadow-lg">
                      <rect x="20" y="20" width="50" height="25" fill="#DC2626" rx="3" />
                      <rect x="45" y="10" width="25" height="15" fill="#DC2626" rx="2" />
                      <rect x="48" y="12" width="8" height="8" fill="#93C5FD" opacity="0.8" />
                      <rect x="25" y="15" width="4" height="8" fill="#374151" rx="1" />
                      <circle cx="27" cy="10" r="3" fill="#9CA3AF" opacity="0.6" className="animate-ping" />
                      <circle cx="60" cy="45" r="12" fill="#1F2937" />
                      <circle cx="60" cy="45" r="8" fill="#374151" />
                      <circle cx="60" cy="45" r="3" fill="#6B7280" />
                      <circle cx="30" cy="45" r="8" fill="#1F2937" />
                      <circle cx="30" cy="45" r="5" fill="#374151" />
                      <circle cx="30" cy="45" r="2" fill="#6B7280" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-8 opacity-20">
                <div className="w-32 h-24 bg-gray-600 dark:bg-gray-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                <div className="w-40 h-32 bg-gray-600 dark:bg-gray-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Module non trouvé
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Le module <span className="font-mono font-semibold text-green-600 dark:text-green-400">"{moduleId}"</span> n'existe pas ou n'est pas actif.
              </p>
            </div>

            {activeModules.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Modules disponibles :
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeModules.map(mod => (
                    <Button
                      key={mod.id}
                      onClick={() => navigate({ to: `/${mod.id}` })}
                      className="px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                    >
                      <div className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                        {mod.name}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

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

  return <ModuleView module={selectedModule} sensorData={[]} />;
};

export const Route = createFileRoute('/_authenticated/(misc)/$moduleId')({
  component: AppContent,
})
