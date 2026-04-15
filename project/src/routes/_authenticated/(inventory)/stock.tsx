import { useMemo } from "react";
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

  const tabs = useMemo<{ value: string; label: string; to: string; priority: number; tourId?: string }[]>(
    () => [
      { value: 'items', label: t('stock.tabs.items'), to: '/stock/items', priority: 1, tourId: 'stock-items' },
      { value: 'inventory', label: t('stock.tabs.inventory'), to: '/stock/inventory', priority: 2, tourId: 'stock-warehouses' },
      { value: 'entries', label: t('stock.tabs.entries'), to: '/stock/entries', priority: 3, tourId: 'stock-movements' },
      { value: 'reception', label: t('stock.tabs.reception'), to: '/stock/reception', priority: 4 },
      { value: 'deliveries', label: t('stock.tabs.deliveries', 'Deliveries'), to: '/stock/deliveries', priority: 5 },
      { value: 'reports', label: t('stock.tabs.reports'), to: '/stock/reports', priority: 6 },
      { value: 'dashboard', label: t('stock.tabs.dashboard', 'Dashboard'), to: '/stock/dashboard', priority: 7 },
      { value: 'groups', label: t('stock.tabs.groups'), to: '/stock/groups', priority: 8 },
      { value: 'suppliers', label: t('stock.tabs.suppliers', 'Suppliers'), to: '/stock/suppliers', priority: 9 },
      { value: 'batches', label: t('stock.tabs.batches', 'Batches'), to: '/stock/batches', priority: 10 },
      { value: 'approvals', label: t('stock.tabs.approvals', 'Approvals'), to: '/stock/approvals', priority: 11 },
      { value: 'stock-take', label: t('stock.tabs.stockTake', 'Stock Take'), to: '/stock/stock-take', priority: 12 },
      { value: 'quick-stock', label: t('stock.tabs.quickStock', 'Quick Entry'), to: '/stock/quick-stock', priority: 13 },
      { value: 'expiry-alerts', label: t('stock.tabs.expiryAlerts', 'Expiry Alerts'), to: '/stock/expiry-alerts', priority: 14 },
      { value: 'reorder', label: t('stock.tabs.reorder', 'Reorder'), to: '/stock/reorder-suggestions', priority: 15 },
    ],
    [t],
  );

  const orderedTabs = useMemo(
    () => tabs.slice().sort((a, b) => a.priority - b.priority),
    [tabs],
  );

  const activeTab = useMemo(() => {
    if (!location) return 'items';
    const path = location.pathname;
    // Match longest prefix first
    const match = tabs
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find(tab => path.startsWith(tab.to));
    return match?.value ?? 'items';
  }, [location, tabs]);

  const handleTabChange = (value: string) => {
    const target = orderedTabs.find((tab) => tab.value === value);
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
      {/* pt-0: avoid a gray strip between ModernPageHeader and the tab row (main bg shows through padding). */}
      <div className="px-3 pb-20 pt-0 sm:px-4 md:px-6 md:pb-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} data-tour="stock-overview">
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
              {orderedTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="shrink-0"
                  data-tour={tab.tourId}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="mt-4 sm:mt-6">
          <Outlet />
        </div>
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(inventory)/stock')({
  component: withRouteProtection(AppContent, 'read', 'Stock'),
});
