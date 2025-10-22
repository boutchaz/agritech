import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Users, Calculator, Building2, UserCog, Lock, AlertCircle } from 'lucide-react';
import WorkersList from '../components/Workers/WorkersList';
import MetayageCalculator from '../components/Workers/MetayageCalculator';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import type { Module } from '../types';
import { useCan } from '../lib/casl/AbilityContext';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: []
  },
];

function WorkersPage() {
  const { currentOrganization, currentFarm } = useAuth();
  const { can } = useCan();
  const [activeModule, setActiveModule] = useState('workers');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'calculator'>('list');

  // Check if user has access to workers page
  const canReadWorkers = can('read', 'Worker');
  const canManageWorkers = can('manage', 'Worker');

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const fetchFarms = async () => {
    if (!currentOrganization?.id) {
      setFarmsLoading(false);
      return;
    }

    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, location, size')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
    } finally {
      setFarmsLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrganization) {
      fetchFarms();
    }
  }, [currentOrganization]);

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

  // Access denied - user doesn't have permission to view workers
  if (!canReadWorkers) {
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
              { icon: UserCog, label: 'Personnel', isActive: true }
            ]}
          />
          <div className="p-6">
            <div className="max-w-2xl mx-auto mt-12">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                    <Lock className="w-12 h-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Accès Restreint
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Vous n'avez pas les permissions nécessaires pour accéder à la gestion du personnel.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Demander l'accès
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Contactez votre administrateur pour obtenir les permissions nécessaires.
                        Les rôles suivants peuvent accéder à cette page : Administrateur, Gestionnaire de ferme.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
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
            { icon: UserCog, label: 'Personnel', isActive: true }
          ]}
        />
        <div className="p-3 sm:p-4 lg:p-6">
          {farmsLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('list')}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === 'list'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Users className="w-5 h-5" />
                    Gestion du Personnel
                  </button>
                  <button
                    onClick={() => setActiveTab('calculator')}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === 'calculator'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Calculator className="w-5 h-5" />
                    Calculateur Métayage
                  </button>
                </nav>
              </div>

              {/* Content */}
              <div>
                {activeTab === 'list' ? (
                  <WorkersList
                    organizationId={currentOrganization.id}
                    farms={farms}
                  />
                ) : (
                  <MetayageCalculator
                    organizationId={currentOrganization.id}
                    farmId={currentFarm?.id}
                    onSuccess={() => {
                      // Could show a success toast here
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/workers')({
  component: WorkersPage,
});
