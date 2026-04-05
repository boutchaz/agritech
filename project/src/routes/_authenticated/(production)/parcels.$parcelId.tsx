/* eslint-disable react-refresh/only-export-components -- TanStack Router route module exports `Route` */
import { useMemo, useCallback } from 'react';
import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useParcelById, useFarms } from '@/hooks/useParcelsQuery';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import {
  Building2,
  TreePine,
  MapPin,
  ChartBar,
  FlaskRound as Flask,
  Satellite,
  Cloud,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  BrainCircuit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const ParcelLayout = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrganization } = useAuth();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const { data: farms = [] } = useFarms(currentOrganization?.id);

  const tabs = useMemo(
    () => [
      { id: 'overview', name: t('parcels.detail.tabs.overview'), icon: ChartBar, path: `/parcels/${parcelId}` },
      { id: 'ai', name: t('parcels.detail.tabs.agromind'), icon: BrainCircuit, path: `/parcels/${parcelId}/ai` },
      { id: 'analyse', name: t('parcels.detail.tabs.soil'), icon: Flask, path: `/parcels/${parcelId}/analyse` },
      { id: 'satellite', name: t('parcels.detail.tabs.satellite'), icon: Satellite, path: `/parcels/${parcelId}/satellite` },
      { id: 'weather', name: t('parcels.detail.tabs.weather'), icon: Cloud, path: `/parcels/${parcelId}/weather` },
      { id: 'production', name: t('parcels.detail.tabs.production'), icon: TrendingUp, path: `/parcels/${parcelId}/production` },
      {
        id: 'profitability',
        name: t('parcels.detail.tabs.profitability'),
        icon: DollarSign,
        path: `/parcels/${parcelId}/profitability`,
      },
      { id: 'reports', name: t('parcels.detail.tabs.reports'), icon: FileSpreadsheet, path: `/parcels/${parcelId}/reports` },
    ],
    [parcelId, t],
  );

  const activeTabId = useMemo(() => {
    const overviewPath = `/parcels/${parcelId}`;
    const p = location.pathname;
    if (p === overviewPath || p === `${overviewPath}/`) {
      return 'overview';
    }
    const subTabs = tabs.filter((t) => t.id !== 'overview').sort((a, b) => b.path.length - a.path.length);
    for (const tab of subTabs) {
      if (p === tab.path || p.startsWith(`${tab.path}/`)) {
        return tab.id;
      }
    }
    return 'overview';
  }, [location.pathname, parcelId, tabs]);

  const handleTabChange = useCallback(
    (id: string) => {
      const tab = tabs.find((x) => x.id === id);
      if (tab) {
        navigate({ to: tab.path });
      }
    },
    [navigate, tabs],
  );

  if (isLoading) {
    return <PageLoader />;
  }

  if (!parcel) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('parcels.detail.notFound')}</p>
          <Button
            variant="green"
            type="button"
            onClick={() => navigate({ to: '/parcels', search: { farmId: undefined } })}
            className="mt-4 px-4 py-2 rounded-lg"
          >
            {t('parcels.detail.backToParcels')}
          </Button>
        </div>
      </div>
    );
  }

  const farm = farms.find((f) => f.id === parcel.farm_id);

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name || '', path: '/dashboard' },
          { icon: TreePine, label: farm?.name || t('parcels.detail.breadcrumbs.farm'), path: '/farms' },
          { icon: MapPin, label: t('parcels.detail.breadcrumbs.parcels'), path: '/parcels' },
          { icon: MapPin, label: parcel.name, isActive: true },
        ]}
        title={parcel.name}
        subtitle={`${parcel.calculated_area || parcel.area || 0} ha${farm ? ` • ${farm.name}` : ''}`}
      />

      <div
        className="border-b-4 border-emerald-600 bg-gradient-to-r from-emerald-50/95 via-teal-50/80 to-sky-50/90 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950"
        role="navigation"
        aria-label={t('parcels.detail.tabsNavAria')}
      >
        <div className="container mx-auto px-3 lg:px-6">
          <Tabs value={activeTabId} onValueChange={handleTabChange} className="w-full">
            <TabsList
              className={cn(
                'scrollbar-hide flex h-auto min-h-0 w-full min-w-0 flex-nowrap justify-start gap-0 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none',
              )}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      'shrink-0 rounded-none border-b-4 border-transparent px-3 py-3 text-xs font-semibold tracking-tight transition-colors sm:px-4 sm:py-3.5 sm:text-sm',
                      'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                      'data-[state=active]:border-emerald-600 data-[state=active]:bg-white/70 data-[state=active]:text-emerald-800',
                      'dark:data-[state=active]:bg-gray-800/80 dark:data-[state=active]:text-emerald-300',
                      'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                    )}
                  >
                    <TabIcon className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
                    <span className="max-w-[9rem] truncate sm:max-w-none">{tab.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-6">
        <Outlet />
      </div>

      <div className="px-6 pb-6">
        <Button
          type="button"
          onClick={() => navigate({ to: '/parcels', search: { farmId: undefined } })}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
        >
          <span>← {t('parcels.detail.backToParcels')}</span>
        </Button>
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId')({
  component: ParcelLayout,
});
