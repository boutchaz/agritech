import { useEffect, useMemo } from "react";
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { withLicensedRouteProtection } from '@/components/authorization/withLicensedRouteProtection';
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

  type TabDef = { value: string; label: string; to: string; tourId?: string };
  type GroupDef = { value: string; label: string; tabs: TabDef[] };

  const groups = useMemo<GroupDef[]>(
    () => [
      {
        value: 'catalog',
        label: t('stock.groups.catalog', 'Catalog'),
        tabs: [
          { value: 'items', label: t('stock.tabs.items'), to: '/stock/items', tourId: 'stock-items' },
          { value: 'groups', label: t('stock.tabs.groups'), to: '/stock/groups' },
          { value: 'suppliers', label: t('stock.tabs.suppliers', 'Suppliers'), to: '/stock/suppliers', tourId: 'stock-suppliers' },
          { value: 'batches', label: t('stock.tabs.batches', 'Batches'), to: '/stock/batches' },
        ],
      },
      {
        value: 'movements',
        label: t('stock.groups.movements', 'Movements'),
        tabs: [
          { value: 'reception', label: t('stock.tabs.reception'), to: '/stock/reception', tourId: 'stock-reception' },
          { value: 'deliveries', label: t('stock.tabs.deliveries', 'Deliveries'), to: '/stock/deliveries' },
          { value: 'entries', label: t('stock.tabs.entries'), to: '/stock/entries', tourId: 'stock-movements' },
          { value: 'quick-stock', label: t('stock.tabs.quickStock', 'Quick Entry'), to: '/stock/quick-stock', tourId: 'stock-quick' },
          { value: 'approvals', label: t('stock.tabs.approvals', 'Approvals'), to: '/stock/approvals' },
        ],
      },
      {
        value: 'operations',
        label: t('stock.groups.operations', 'Operations'),
        tabs: [
          { value: 'inventory', label: t('stock.tabs.inventory'), to: '/stock/inventory', tourId: 'stock-warehouses' },
          { value: 'stock-take', label: t('stock.tabs.stockTake', 'Stock Take'), to: '/stock/stock-take', tourId: 'stock-take' },
          { value: 'expiry-alerts', label: t('stock.tabs.expiryAlerts', 'Expiry Alerts'), to: '/stock/expiry-alerts', tourId: 'stock-expiry' },
          { value: 'reorder', label: t('stock.tabs.reorder', 'Reorder'), to: '/stock/reorder-suggestions', tourId: 'stock-reorder' },
        ],
      },
      {
        value: 'insights',
        label: t('stock.groups.insights', 'Insights'),
        tabs: [
          { value: 'dashboard', label: t('stock.tabs.dashboard', 'Dashboard'), to: '/stock/dashboard', tourId: 'stock-dashboard' },
          { value: 'reports', label: t('stock.tabs.reports'), to: '/stock/reports' },
          { value: 'aging', label: t('stock.tabs.aging', 'Aging'), to: '/stock/aging', tourId: 'stock-aging' },
        ],
      },
    ],
    [t],
  );

  const allTabs = useMemo(
    () => groups.flatMap((g) => g.tabs.map((tab) => ({ ...tab, group: g.value }))),
    [groups],
  );

  const activeTab = useMemo(() => {
    if (!location) return allTabs[0]?.value ?? 'items';
    const path = location.pathname;
    const match = allTabs
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((tab) => path.startsWith(tab.to));
    return match?.value ?? allTabs[0]?.value ?? 'items';
  }, [location, allTabs]);

  const activeGroupValue = useMemo(() => {
    return allTabs.find((tab) => tab.value === activeTab)?.group ?? groups[0]?.value ?? 'catalog';
  }, [allTabs, activeTab, groups]);

  const activeGroupTabs = useMemo(
    () => groups.find((g) => g.value === activeGroupValue)?.tabs ?? [],
    [groups, activeGroupValue],
  );

  const handleGroupChange = (value: string) => {
    const target = groups.find((g) => g.value === value);
    if (!target || target.tabs.length === 0) return;
    router.navigate({ to: target.tabs[0].to });
  };

  // Tour integration: switch tab groups when the inventory tour advances to
  // a step that targets a sub-tab in another group. The tour fires this event
  // before the step renders so the target element is mounted.
  useEffect(() => {
    const onTourGroup = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce.detail) handleGroupChange(ce.detail);
    };
    window.addEventListener('tour:set-stock-group', onTourGroup);
    return () => window.removeEventListener('tour:set-stock-group', onTourGroup);
    // handleGroupChange closes over groups + router; safe — they're stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const handleTabChange = (value: string) => {
    const target = allTabs.find((tab) => tab.value === value);
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
        {/* Group tabs (top row) */}
        <Tabs value={activeGroupValue} onValueChange={handleGroupChange} data-tour="stock-overview">
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
              {groups.map((g) => (
                <TabsTrigger
                  key={g.value}
                  value={g.value}
                  className="shrink-0 font-semibold"
                  data-tour={`stock-group-${g.value}`}
                >
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* Sub-tabs (children of active group) */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-2">
          <div
            className={cn(
              'relative flex w-full min-w-0 items-center gap-1',
              isRTL ? 'justify-end' : 'justify-start',
            )}
          >
            <TabsList
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-md bg-muted/50 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {activeGroupTabs.map((tab) => (
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
  component: withLicensedRouteProtection(AppContent, 'read', 'Stock'),
});
