import { useMemo, useState } from "react";
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, Package, ChevronDown, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { PageLoader } from '@/components/ui/loader';

const AppContent = () => {
  const { t, i18n } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useAutoStartTour('inventory', 1500);
  const { location } = useRouterState();
  const isRTL = isRTLLocale(i18n.language);

  const tabs = useMemo<{ value: string; label: string; to: string; primary?: boolean; tourId?: string }[]>(
    () => [
      { value: 'items', label: t('stock.tabs.items'), to: '/stock/items', primary: true, tourId: 'stock-items' },
      { value: 'inventory', label: t('stock.tabs.inventory'), to: '/stock/inventory', primary: true, tourId: 'stock-warehouses' },
      { value: 'entries', label: t('stock.tabs.entries'), to: '/stock/entries', primary: true, tourId: 'stock-movements' },
      { value: 'reception', label: t('stock.tabs.reception'), to: '/stock/reception', primary: true },
      { value: 'deliveries', label: t('stock.tabs.deliveries', 'Deliveries'), to: '/stock/deliveries', primary: true },
      { value: 'reports', label: t('stock.tabs.reports'), to: '/stock/reports', primary: true },
      // Overflow tabs — inside "More" dropdown
      { value: 'dashboard', label: t('stock.tabs.dashboard', 'Dashboard'), to: '/stock/dashboard' },
      { value: 'groups', label: t('stock.tabs.groups'), to: '/stock/groups' },
      { value: 'suppliers', label: t('stock.tabs.suppliers', 'Suppliers'), to: '/stock/suppliers' },
      { value: 'batches', label: t('stock.tabs.batches', 'Batches'), to: '/stock/batches' },
      { value: 'approvals', label: t('stock.tabs.approvals', 'Approvals'), to: '/stock/approvals' },
      { value: 'stock-take', label: t('stock.tabs.stockTake', 'Stock Take'), to: '/stock/stock-take' },
      { value: 'quick-stock', label: t('stock.tabs.quickStock', 'Quick Entry'), to: '/stock/quick-stock' },
      { value: 'expiry-alerts', label: t('stock.tabs.expiryAlerts', 'Expiry Alerts'), to: '/stock/expiry-alerts' },
      { value: 'reorder', label: t('stock.tabs.reorder', 'Reorder'), to: '/stock/reorder-suggestions' },
    ],
    [t],
  );

  const primaryTabs = useMemo(() => tabs.filter(tab => tab.primary), [tabs]);
  const overflowTabs = useMemo(() => tabs.filter(tab => !tab.primary), [tabs]);

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

  const isOverflowActive = useMemo(
    () => overflowTabs.some(tab => tab.value === activeTab),
    [overflowTabs, activeTab],
  );

  const activeOverflowLabel = useMemo(() => {
    if (!isOverflowActive) return null;
    return overflowTabs.find(tab => tab.value === activeTab)?.label;
  }, [isOverflowActive, overflowTabs, activeTab]);

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
        <Tabs value={isOverflowActive ? '__none__' : activeTab} onValueChange={handleTabChange} className="space-y-6" data-tour="stock-overview">
          <div
            className={cn(
              'relative flex w-full min-w-0 items-center gap-1',
              isRTL ? 'justify-end' : 'justify-start',
            )}
          >
            <TabsList
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-max max-w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-lg [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {primaryTabs.map((tab) => (
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

            {/* More dropdown for overflow tabs */}
            <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isOverflowActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'shrink-0 gap-1 text-sm font-medium',
                    isOverflowActive
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  )}
                >
                  {activeOverflowLabel || t('stock.tabs.more', 'Plus')}
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-56">
                {overflowTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => {
                      handleTabChange(tab.value);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between',
                      tab.value === activeTab && 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    )}
                  >
                    {tab.label}
                    {tab.value === activeTab && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
