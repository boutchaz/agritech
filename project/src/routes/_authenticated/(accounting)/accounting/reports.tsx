import React, { useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useAccountSummary } from '@/hooks/useFinancialReports';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Scale,
  BookOpen,
  ArrowRight,
  Landmark,
  Clock,
  Users,
  Wallet,
  DollarSign,
  BarChart3,
  Layers,
} from 'lucide-react';
import { CardGridSkeleton } from '@/components/ui/page-skeletons';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  available: boolean;
  path: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

const AppContent = () => {
  const { t } = useTranslation('accounting');
  const { currentOrganization } = useAuth();

  useAutoStartTour('reports', 1500);
  const navigate = useNavigate();
  const { data: accountSummary, isLoading: isSummaryLoading } = useAccountSummary();

  const kpis = useMemo(() => {
    if (!accountSummary || accountSummary.length === 0) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
      };
    }

    const findByType = (type: string) =>
      accountSummary.find((row) => row.account_type === type);

    const assets = findByType('asset');
    const liabilities = findByType('liability');
    const equity = findByType('equity');
    const revenue = findByType('revenue');

    return {
      totalAssets: assets?.net_balance ?? 0,
      totalLiabilities: liabilities?.net_balance ?? 0,
      totalEquity: equity?.net_balance ?? 0,
      totalRevenue: revenue?.net_balance ?? 0,
    };
  }, [accountSummary]);

  const kpiCards = [
    {
      label: t('reports.totalAssets', 'Total Assets'),
      value: kpis.totalAssets,
      icon: Landmark,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800/50',
    },
    {
      label: t('reports.totalLiabilities', 'Total Liabilities'),
      value: kpis.totalLiabilities,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      borderColor: 'border-red-200 dark:border-red-800/50',
    },
    {
      label: t('reports.totalEquity', 'Total Equity'),
      value: kpis.totalEquity,
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    },
    {
      label: t('reports.totalRevenue', 'Total Revenue'),
      value: kpis.totalRevenue,
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-800/50',
    },
  ];

  const reports: ReportCard[] = [
    {
      id: 'balance-sheet',
      title: t('reports.balanceSheet', 'Balance Sheet'),
      description: t(
        'accounting.reports.balanceSheetDesc',
        'View your financial position with assets, liabilities, and equity at a point in time.'
      ),
      icon: Scale,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      available: true,
      path: '/accounting/balance-sheet',
    },
    {
      id: 'profit-loss',
      title: t('reports.profitLoss', 'Profit & Loss'),
      description: t(
        'accounting.reports.profitLossDesc',
        'Analyze revenue, expenses, and profitability over any period.'
      ),
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      available: true,
      path: '/accounting/profit-loss',
    },
    {
      id: 'trial-balance',
      title: t('reports.trialBalance', 'Trial Balance'),
      description: t(
        'accounting.reports.trialBalanceDesc',
        'Verify your ledger with a complete list of all account balances.'
      ),
      icon: BookOpen,
      iconColor: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      available: true,
      path: '/accounting/trial-balance',
    },
    {
      id: 'general-ledger',
      title: t('reports.generalLedger', 'General Ledger'),
      description: t(
        'accounting.reports.generalLedgerDesc',
        'View detailed transaction history and running balances for every account.'
      ),
      icon: FileSpreadsheet,
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/50',
      available: true,
      path: '/accounting/general-ledger',
    },
    {
      id: 'cash-flow',
      title: t('reports.cashFlow', 'Cash Flow'),
      description: t(
        'accounting.reports.cashFlowDesc',
        'Track cash inflows and outflows across operating, investing, and financing activities.'
      ),
      icon: BarChart3,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/50',
      available: true,
      path: '/accounting/cash-flow',
    },
    {
      id: 'aged-receivables',
      title: t('reports.agedReceivables', 'Aged Receivables'),
      description: t(
        'accounting.reports.agedReceivablesDesc',
        'Track outstanding invoices and customer payment aging buckets.'
      ),
      icon: Clock,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      available: true,
      path: '/accounting/aged-receivables',
    },
    {
      id: 'aged-payables',
      title: t('reports.agedPayables', 'Aged Payables'),
      description: t(
        'accounting.reports.agedPayablesDesc',
        'Monitor outstanding bills and supplier payment aging buckets.'
      ),
      icon: Users,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
      available: true,
      path: '/accounting/aged-payables',
    },
    {
      id: 'multi-filter-analysis',
      title: t('reports.multiFilterAnalysis', 'Analyse Multi-Filtres'),
      description: t(
        'accounting.reports.multiFilterAnalysisDesc',
        'Analysez coûts et revenus par ferme, parcelle, culture ou variété avec comparaison détaillée.'
      ),
      icon: Layers,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      available: true,
      path: '/accounting/reports-analysis',
    },
  ];

  const handleViewReport = (path: string) => {
    navigate({ to: path });
  };

  if (!currentOrganization) {
    return <CardGridSkeleton count={8} className="p-6" />;
  }

  return (
    <PageLayout
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: FileSpreadsheet, label: t('reports.title', 'Financial Reports'), isActive: true },
          ]}
          title={t('reports.title', 'Financial Reports')}
          subtitle={t('reports.subtitle', 'Access comprehensive financial reports and analytics')}
        />
      }
    >
      <div className="p-6 space-y-8" data-tour="accounting-reports">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => {
            const KpiIcon = kpi.icon;
            return (
              <Card
                key={kpi.label}
                className={`border ${kpi.borderColor} ${kpi.bg} shadow-sm transition-shadow hover:shadow-md`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {kpi.label}
                      </p>
                      {isSummaryLoading ? (
                        <div className="h-8 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      ) : (
                        <p className={`text-2xl font-bold tracking-tight ${kpi.color}`}>
                          {formatCurrency(kpi.value)}
                        </p>
                      )}
                    </div>
                    <div className={`rounded-xl p-2.5 ${kpi.bg}`}>
                      <KpiIcon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reports Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('reports.allReports', 'All Reports')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((report) => {
              const ReportIcon = report.icon;
              return (
                <Card
                  key={report.id}
                  className="group border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => handleViewReport(report.path)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl p-3 ${report.iconBg} transition-transform duration-200 group-hover:scale-110`}>
                        <ReportIcon className={`h-5 w-5 ${report.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                          {report.title}
                        </CardTitle>
                        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 group/btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewReport(report.path);
                      }}
                    >
                      {t('reports.viewReport', 'View Report')}
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/reports')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
