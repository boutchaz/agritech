import {  useMemo  } from "react";
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { PageLoader } from '@/components/ui/loader';


const AppContent = () => {
  const { t, i18n } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const router = useRouter();

  useAutoStartTour('inventory', 1500);
  const { location } = useRouterState();
  const isRTL = isRTLLocale(i18n.language);

  const tabs = useMemo(
    () => [
      { value: 'items', label: t('stock.tabs.items'), to: '/stock/items' },
      { value: 'groups', label: t('stock.tabs.groups'), to: '/stock/groups' },
      { value: 'inventory', label: t('stock.tabs.inventory'), to: '/stock/inventory' },
      { value: 'entries', label: t('stock.tabs.entries'), to: '/stock/entries' },
      { value: 'reception', label: t('stock.tabs.reception'), to: '/stock/reception' },
      { value: 'reports', label: t('stock.tabs.reports'), to: '/stock/reports' },
    ],
    [t],
  );

  const activeTab = useMemo(() => {
    if (!location) return 'items';
    if (location.pathname.startsWith('/stock/items')) return 'items';
    if (location.pathname.startsWith('/stock/groups')) return 'groups';
    if (location.pathname.startsWith('/stock/entries')) return 'entries';
    if (location.pathname.startsWith('/stock/reception')) return 'reception';
    if (location.pathname.startsWith('/stock/reports')) return 'reports';
    if (location.pathname.startsWith('/stock/inventory')) return 'inventory';
    return 'items';
  }, [location]);

  const handleTabChange = (value: string) => {
    const target = tabs.find((tab) => tab.value === value);
    if (!target) return;
    router.navigate({ to: target.to });
  };

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  return (
    <PageLayout
      activeModule="stock"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Package, label: t('stock.title'), isActive: true }
          ]}
          title={t('stock.title')}
          subtitle={t('stock.subtitle')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" data-tour="stock-overview">
          <div
            className={cn(
              'flex w-full min-w-0',
              isRTL ? 'justify-end' : 'justify-start',
            )}
          >
            <TabsList
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-max max-w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-lg sm:overflow-visible"
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="shrink-0"
                  data-tour={
                    tab.value === 'items'
                      ? 'stock-items'
                      : tab.value === 'entries'
                        ? 'stock-movements'
                        : tab.value === 'inventory'
                          ? 'stock-warehouses'
                          : undefined
                  }
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(inventory)/stock')({
  component: withRouteProtection(AppContent, 'read', 'Stock'),
});
