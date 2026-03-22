import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Calculator, Building2, UserCog, Lock, AlertCircle, Settings, Banknote } from 'lucide-react';
import WorkersList from '@/components/Workers/WorkersList';
import MetayageCalculator from '@/components/Workers/MetayageCalculator';
import WorkersPaymentsList from '@/components/Workers/WorkersPaymentsList';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useCan } from '@/lib/casl/AbilityContext';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader, SectionLoader } from '@/components/ui/loader';
import { farmsApi } from '@/lib/api/farms';

function WorkersPage() {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();
  const { can } = useCan();
  const location = useLocation();
  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [farmsError, setFarmsError] = useState<string | null>(null);

  // Check if we're on a child route (like /workers/:workerId)
  const isChildRoute = location.pathname !== '/workers' && location.pathname !== '/workers/';

  // Check if user has access to workers page
  const canReadWorkers = can('read', 'Worker');

  const fetchFarms = async () => {
    if (!currentOrganization?.id) {
      setFarmsLoading(false);
      return;
    }

    try {
      setFarmsError(null);
      const data = await farmsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );
      
      const farmsList = (data || []).map((farm: any) => ({
        id: farm.farm_id || farm.id,
        name: farm.farm_name || farm.name,
      }));
      setFarms(farmsList);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setFarms([]); // Set empty array on error
      setFarmsError(t('workers.errors.farmsFetchFailed'));
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
    return <PageLoader className="min-h-screen" />;
  }

  // Access denied - user doesn't have permission to view workers
  if (!canReadWorkers) {
    return (
      <PageLayout
        activeModule="workers"
        header={
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
              { icon: UserCog, label: t('nav.personnel'), isActive: true }
            ]}
          />
        }
      >
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto mt-8 sm:mt-12">
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                    <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('workers.accessDenied.title')}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                  {t('workers.accessDenied.description')}
                </p>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('workers.accessDenied.requestAccess')}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {t('workers.accessDenied.contactAdmin')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      activeModule="workers"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: UserCog, label: t('nav.personnel'), isActive: true }
          ]}
          title={t('workers.title')}
          subtitle={t('workers.subtitle')}
        />
      }
    >
      <div className="p-3 sm:p-4 lg:p-6">
          {isChildRoute ? (
            <Outlet />
          ) : farmsLoading ? (
            <SectionLoader />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {farmsError && (
                <Alert variant="destructive" className="flex-col sm:flex-row">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <AlertTitle className="text-sm sm:text-base">{farmsError}</AlertTitle>
                      <AlertDescription className="text-xs sm:text-sm mt-1">
                        {t('workers.errors.farmsFetchHint')}
                      </AlertDescription>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap w-full sm:w-auto"
                      onClick={fetchFarms}
                    >
                      {t('app.retry')}
                    </Button>
                  </div>
                </Alert>
              )}
              {/* Info banner linking to users settings */}
              <Alert className="flex-col sm:flex-row">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <AlertTitle className="text-sm sm:text-base">{t('workers.banner.title')}</AlertTitle>
                    <AlertDescription className="text-xs sm:text-sm mt-1">
                      {t('workers.banner.description')}
                    </AlertDescription>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                  <Link to="/settings/users">
                    <Button variant="default" size="sm" className="whitespace-nowrap w-full sm:w-auto">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('workers.banner.usersButton')}
                    </Button>
                  </Link>
                </div>
              </Alert>

              {/* Tabs with shadcn/ui */}
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="list" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2 sm:px-4">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline sm:inline">{t('workers.tabs.list')}</span>
                    <span className="xs:hidden sm:hidden">{t('nav.personnel')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2 sm:px-4">
                    <Banknote className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline sm:inline">{t('workers.tabs.payments')}</span>
                    <span className="xs:hidden sm:hidden">{t('workers.tabs.paymentsShort')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="calculator" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2 sm:px-4" data-tour="worker-payments">
                    <Calculator className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xs:inline sm:inline">{t('workers.tabs.calculator')}</span>
                    <span className="xs:hidden sm:hidden">{t('workers.metayage.calculator')}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-4 sm:mt-6">
                  <WorkersList
                    organizationId={currentOrganization.id}
                    farms={farms}
                  />
                </TabsContent>

                <TabsContent value="payments" className="mt-4 sm:mt-6">
                  <WorkersPaymentsList organizationId={currentOrganization.id} />
                </TabsContent>

                <TabsContent value="calculator" className="mt-4 sm:mt-6">
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
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workers')({
  component: withRouteProtection(WorkersPage, 'read', 'Worker'),
});
