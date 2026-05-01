import { useEffect, useMemo } from 'react';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { PageLoader } from '@/components/ui/loader';
import { ModuleGate } from '@/components/authorization/ModuleGate';

type TabDef = { value: string; label: string; to: string; tourId?: string };
type GroupDef = { value: string; label: string; tabs: TabDef[] };

const AppContent = () => {
  const { t, i18n } = useTranslation('accounting');
  const { currentOrganization } = useAuth();
  const router = useRouter();

  useAutoStartTour('accounting', 1500);
  const { location } = useRouterState();
  const isRTL = isRTLLocale(i18n.language);

  const groups = useMemo<GroupDef[]>(
    () => [
      {
        value: 'overview',
        label: t('groups.overview', 'Overview'),
        tabs: [
          { value: 'dashboard', label: t('tabs.dashboard', 'Dashboard'), to: '/accounting', tourId: 'acc-dashboard' },
        ],
      },
      {
        value: 'billing',
        label: t('groups.billing', 'Billing'),
        tabs: [
          { value: 'invoices', label: t('tabs.invoices', 'Invoices'), to: '/accounting/invoices', tourId: 'acc-invoices' },
          { value: 'quotes', label: t('tabs.quotes', 'Quotes'), to: '/accounting/quotes', tourId: 'acc-quotes' },
          { value: 'sales-orders', label: t('tabs.salesOrders', 'Sales Orders'), to: '/accounting/sales-orders', tourId: 'acc-sales-orders' },
          { value: 'purchase-orders', label: t('tabs.purchaseOrders', 'Purchase Orders'), to: '/accounting/purchase-orders', tourId: 'acc-purchase-orders' },
          { value: 'payments', label: t('tabs.payments', 'Payments'), to: '/accounting/payments', tourId: 'acc-payments' },
        ],
      },
      {
        value: 'records',
        label: t('groups.records', 'Records'),
        tabs: [
          { value: 'journal', label: t('tabs.journal', 'Journal'), to: '/accounting/journal', tourId: 'acc-journal' },
          { value: 'customers', label: t('tabs.customers', 'Customers'), to: '/accounting/customers', tourId: 'acc-customers' },
          { value: 'bank-accounts', label: t('tabs.bankAccounts', 'Bank Accounts'), to: '/accounting/bank-accounts', tourId: 'acc-bank-accounts' },
          { value: 'accounts', label: t('tabs.accounts', 'Chart of Accounts'), to: '/accounting/accounts', tourId: 'acc-accounts' },
        ],
      },
      {
        value: 'reports',
        label: t('groups.reports', 'Reports'),
        tabs: [
          { value: 'reports', label: t('tabs.reports', 'All Reports'), to: '/accounting/reports' },
          { value: 'profit-loss', label: t('tabs.profitLoss', 'Profit & Loss'), to: '/accounting/profit-loss', tourId: 'acc-profit-loss' },
          { value: 'balance-sheet', label: t('tabs.balanceSheet', 'Balance Sheet'), to: '/accounting/balance-sheet', tourId: 'acc-balance-sheet' },
          { value: 'trial-balance', label: t('tabs.trialBalance', 'Trial Balance'), to: '/accounting/trial-balance', tourId: 'acc-trial-balance' },
          { value: 'general-ledger', label: t('tabs.generalLedger', 'General Ledger'), to: '/accounting/general-ledger', tourId: 'acc-general-ledger' },
          { value: 'cash-flow', label: t('tabs.cashFlow', 'Cash Flow'), to: '/accounting/cash-flow' },
          { value: 'aged-receivables', label: t('tabs.agedReceivables', 'Aged Receivables'), to: '/accounting/aged-receivables', tourId: 'acc-aged-receivables' },
          { value: 'aged-payables', label: t('tabs.agedPayables', 'Aged Payables'), to: '/accounting/aged-payables', tourId: 'acc-aged-payables' },
          { value: 'reports-analysis', label: t('tabs.reportsAnalysis', 'Profitability'), to: '/accounting/reports-analysis', tourId: 'acc-profitability' },
        ],
      },
      {
        value: 'settings',
        label: t('groups.settings', 'Settings'),
        tabs: [
          { value: 'account-mappings', label: t('tabs.accountMappings', 'Account Mappings'), to: '/accounting/account-mappings', tourId: 'acc-mappings' },
          { value: 'cost-centers', label: t('tabs.costCenters', 'Cost Centers'), to: '/accounting/cost-centers', tourId: 'acc-cost-centers' },
          { value: 'fiscal-years', label: t('tabs.fiscalYears', 'Fiscal Years'), to: '/accounting/fiscal-years', tourId: 'acc-fiscal-years' },
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
    if (!location) return allTabs[0]?.value ?? 'dashboard';
    const path = location.pathname;
    const match = allTabs
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((tab) => path.startsWith(tab.to));
    return match?.value ?? allTabs[0]?.value ?? 'dashboard';
  }, [location, allTabs]);

  const activeGroupValue = useMemo(() => {
    return allTabs.find((tab) => tab.value === activeTab)?.group ?? groups[0]?.value ?? 'overview';
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

  // Tour integration: switch tab groups when the accounting tour advances to
  // a sub-tab in a different group. See TourProvider's per-step dispatcher.
  useEffect(() => {
    const onTourGroup = (e: Event) => {
      const ce = e as CustomEvent<{ module?: string; group?: string }>;
      if (ce.detail?.module === 'accounting' && ce.detail.group) {
        handleGroupChange(ce.detail.group);
      }
    };
    window.addEventListener('tour:set-tab-group', onTourGroup);
    return () => window.removeEventListener('tour:set-tab-group', onTourGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const handleTabChange = (value: string) => {
    const target = allTabs.find((tab) => tab.value === value);
    if (!target) return;
    router.navigate({ to: target.to });
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: BookOpen, label: t('title', 'Accounting'), isActive: true },
          ]}
          title={t('title', 'Accounting')}
          subtitle={t('subtitle', 'Manage invoices, payments, and financial reports')}
        />
      }
    >
      <div className="px-3 pb-20 pt-0 sm:px-4 md:px-6 md:pb-6">
        <Tabs value={activeGroupValue} onValueChange={handleGroupChange} data-tour="acc-overview">
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
                  data-tour={`acc-group-${g.value}`}
                >
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

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

export const Route = createFileRoute('/_authenticated/(accounting)/accounting')({
  component: () => (
    <ModuleGate>
      <AppContent />
    </ModuleGate>
  ),
});
