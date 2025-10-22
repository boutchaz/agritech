import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Users, Calculator, Building2, UserCog, Lock, AlertCircle, Settings } from 'lucide-react';
import WorkersList from '../components/Workers/WorkersList';
import MetayageCalculator from '../components/Workers/MetayageCalculator';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import type { Module } from '../types';
import { useCan } from '../lib/casl/AbilityContext';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

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

  // Check if user has access to workers page
  const canReadWorkers = can('read', 'Worker');

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
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: UserCog, label: 'Personnel', isActive: true }
            ]}
          />
          <div className="p-6">
            <div className="max-w-2xl mx-auto mt-12">
              <Card>
                <CardContent className="p-8 text-center">
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
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Demander l'accès</AlertTitle>
                    <AlertDescription>
                      Contactez votre administrateur pour obtenir les permissions nécessaires.
                      Les rôles suivants peuvent accéder à cette page : Administrateur, Gestionnaire de ferme.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
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
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
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
              {/* Info banner linking to users settings */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Personnel vs Utilisateurs de la plateforme</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    Cette page gère le personnel de ferme (ouvriers, métayers). Vous pouvez donner un accès plateforme limité aux travailleurs pour consulter leurs tâches. Gérez tous les utilisateurs via Paramètres → Utilisateurs.
                  </span>
                  <Link to="/settings/users">
                    <Button variant="default" size="sm" className="whitespace-nowrap">
                      <Settings className="w-4 h-4 mr-2" />
                      Utilisateurs
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>

              {/* Tabs with shadcn/ui */}
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Gestion du Personnel
                  </TabsTrigger>
                  <TabsTrigger value="calculator" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Calculateur Métayage
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-6">
                  <WorkersList
                    organizationId={currentOrganization.id}
                    farms={farms}
                  />
                </TabsContent>

                <TabsContent value="calculator" className="mt-6">
                  <MetayageCalculator
                    organizationId={currentOrganization.id}
                    farmId={currentFarm?.id}
                    onSuccess={() => {
                      // Could show a success toast here
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/workers')({
  component: withRouteProtection(WorkersPage, 'read', 'Worker'),
});
