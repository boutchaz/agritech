import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Calculator, Building2, UserCog, Lock, AlertCircle, Info, Settings, Banknote, Handshake } from 'lucide-react';
import WorkersList from '@/components/Workers/WorkersList';
import MetayageCalculator from '@/components/Workers/MetayageCalculator';
import WorkersPaymentsList from '@/components/Workers/WorkersPaymentsList';
import ProductionSharingTab from '@/components/Workers/ProductionSharingTab';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useCan } from '@/lib/casl/AbilityContext';
import { withLicensedRouteProtection } from '@/components/authorization/withLicensedRouteProtection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader, SectionLoader } from '@/components/ui/loader';
import { farmsApi } from '@/lib/api/farms';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';

function WorkersPage() {
  const { t, i18n } = useTranslation();
  const isRTL = isRTLLocale(i18n.language);
  const { currentOrganization, currentFarm } = useAuth();

  useAutoStartTour('workers', 1500);
  const { can } = useCan();
  const location = useLocation();
  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [farmsError, setFarmsError] = useState<string | null>(null);

  // Check if we're on a child route (like /workers/:workerId)
  const isChildRoute = location.pathname !== '/workers' && location.pathname !== '/workers/';

  // Check if user has access to workers page
  const canReadWorkers = can('read', 'Worker');

  const fetchFarms = useCallback(async () => {
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
      
      const farmsList = (data || []).map((farm: { farm_id?: string; id?: string; farm_name?: string; name?: string }) => ({
        id: farm.farm_id || farm.id || '',
        name: farm.farm_name || farm.name || '',
      }));
      setFarms(farmsList);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setFarms([]); // Set empty array on error
      setFarmsError(t('workers.errors.farmsFetchFailed'));
    } finally {
      setFarmsLoading(false);
    }
  }, [currentOrganization?.id, t]);

  useEffect(() => {
    if (currentOrganization) {
      fetchFarms();
    }
  }, [currentOrganization, fetchFarms]);

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
        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
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
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
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
              <Alert className="flex-col border-primary/20 bg-primary/5 sm:flex-row dark:border-primary/30 dark:bg-primary/10">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div className="flex-1">
                    <AlertTitle className="text-sm sm:text-base">{t('workers.banner.title')}</AlertTitle>
                    <AlertDescription className="mt-1 text-xs sm:text-sm">
                      {t('workers.banner.description')}
                    </AlertDescription>
                  </div>
                </div>
                <div className="mt-3 flex-shrink-0 sm:ml-4 sm:mt-0">
                  <Link to="/settings/users">
                    <Button variant="emerald" size="sm" className="w-full whitespace-nowrap sm:w-auto">
                      <Settings className="me-2 h-4 w-4" aria-hidden />
                      {t('workers.banner.usersButton')}
                    </Button>
                  </Link>
                </div>
              </Alert>

              {/* Tabs — RTL: bar aligned end + dir on list (same pattern as /stock) */}
              <Tabs defaultValue="list" className="w-full">
                <div
                  className={cn(
                    'relative flex w-full min-w-0 items-center gap-1',
                    isRTL ? 'justify-end' : 'justify-start',
                  )}
                >
                  <TabsList
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-lg [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <TabsTrigger
                      value="list"
                      className="shrink-0 gap-2.5 px-2 text-xs font-semibold sm:px-3 sm:text-sm"
                    >
                      <Users className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden xs:inline sm:inline">{t('workers.tabs.list')}</span>
                      <span className="xs:hidden sm:hidden">{t('nav.personnel')}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="payments"
                      className="shrink-0 gap-2.5 px-2 text-xs font-semibold sm:px-3 sm:text-sm"
                    >
                      <Banknote className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden xs:inline sm:inline">{t('workers.tabs.payments')}</span>
                      <span className="xs:hidden sm:hidden">{t('workers.tabs.paymentsShort')}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="production-sharing"
                      className="shrink-0 gap-2.5 px-2 text-xs font-semibold sm:px-3 sm:text-sm"
                    >
                      <Handshake className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden xs:inline sm:inline">{t('workers.tabs.productionSharing', 'Partage de Production')}</span>
                      <span className="xs:hidden sm:hidden">{t('workers.tabs.productionSharingShort', 'Partage')}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="calculator"
                      className="shrink-0 gap-2.5 px-2 text-xs font-semibold sm:px-3 sm:text-sm"
                      data-tour="worker-payments"
                    >
                      <Calculator className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden xs:inline sm:inline">{t('workers.tabs.calculator')}</span>
                      <span className="xs:hidden sm:hidden">{t('workers.metayage.calculator')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="list" className="mt-4 sm:mt-6">
                  <WorkersList
                    organizationId={currentOrganization.id}
                    farms={farms}
                  />
                </TabsContent>

                <TabsContent value="payments" className="mt-4 sm:mt-6">
                  <WorkersPaymentsList organizationId={currentOrganization.id} />
                </TabsContent>

                <TabsContent value="production-sharing" className="mt-4 sm:mt-6">
                  <ProductionSharingTab
                    organizationId={currentOrganization.id}
                    farmId={currentFarm?.id}
                  />
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
  component: withLicensedRouteProtection(WorkersPage, 'read', 'Worker'),
});
