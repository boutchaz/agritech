import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, TrendingUp, TrendingDown, Loader2, AlertCircle, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useProfitLoss, type ProfitLossRow } from '../hooks/useFinancialReports';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
];

const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ProfitLossSection: React.FC<{
  title: string;
  accounts: ProfitLossRow[];
  total: number;
  currencySymbol: string;
  color: string;
  icon: React.ReactNode;
}> = ({ title, accounts, total, currencySymbol, color, icon }) => (
  <Card>
    <CardHeader className={`${color} text-white rounded-t-lg`}>
      <CardTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span className="text-xl font-bold">{formatCurrency(total, currencySymbol)}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {accounts.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No transactions in this period</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Code</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Account Name</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.account_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{account.account_code}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{account.account_name}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(account.display_amount), currencySymbol)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total {title}</td>
              <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                {formatCurrency(total, currencySymbol)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </CardContent>
  </Card>
);

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('accounting');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);

  // Default to first day of current year
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading, error } = useProfitLoss(startDate, endDate);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const currencySymbol = currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('dashboard.loading', 'Loading organization...')}</p>
        </div>
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
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: TrendingUp, label: t('reportsModule.profitLoss.title', 'Profit & Loss'), isActive: true }
          ]}
          title={t('reportsModule.profitLoss.title', 'Profit & Loss Statement')}
          subtitle={t('reportsModule.profitLoss.subtitle', 'Income statement showing revenue, expenses, and net income')}
        />

        <div className="p-6 space-y-6">
          {/* Date Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px]">
                  <Label htmlFor="start_date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    {t('reportsModule.profitLoss.startDate', 'Start Date')}
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <div className="min-w-[200px]">
                  <Label htmlFor="end_date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    {t('reportsModule.profitLoss.endDate', 'End Date')}
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <Button variant="outline" className="gap-2" disabled>
                  <Download className="h-4 w-4" />
                  {t('reportsModule.profitLoss.exportPdf', 'Export PDF')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">{t('reportsModule.profitLoss.loading', 'Loading profit & loss statement...')}</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to load profit & loss: {(error as Error).message}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* P&L Content */}
          {report && !isLoading && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('reportsModule.profitLoss.totalRevenue', 'Total Revenue')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(report.totals.total_revenue, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      {t('reportsModule.profitLoss.totalExpenses', 'Total Expenses')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(report.totals.total_expenses, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
                <Card className={report.totals.net_income >= 0 ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm font-medium flex items-center gap-2 ${report.totals.net_income >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {report.totals.net_income >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {report.totals.net_income >= 0 ? t('reportsModule.profitLoss.netIncome', 'Net Income') : t('reportsModule.profitLoss.netLoss', 'Net Loss')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${report.totals.net_income >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                      {formatCurrency(Math.abs(report.totals.net_income), currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Section */}
              <ProfitLossSection
                title={t('reportsModule.profitLoss.revenue', 'Revenue')}
                accounts={report.revenue}
                total={report.totals.total_revenue}
                currencySymbol={currencySymbol}
                color="bg-green-600"
                icon={<TrendingUp className="h-5 w-5" />}
              />

              {/* Expenses Section */}
              <ProfitLossSection
                title={t('reportsModule.profitLoss.expenses', 'Expenses')}
                accounts={report.expenses}
                total={report.totals.total_expenses}
                currencySymbol={currencySymbol}
                color="bg-red-600"
                icon={<TrendingDown className="h-5 w-5" />}
              />

              {/* Net Income Summary */}
              <Card className={report.totals.net_income >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {report.totals.net_income >= 0 ? 'Net Income (Profit)' : 'Net Loss'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Revenue ({formatCurrency(report.totals.total_revenue, currencySymbol)}) - Expenses ({formatCurrency(report.totals.total_expenses, currencySymbol)})
                      </p>
                    </div>
                    <div className={`text-3xl font-bold ${report.totals.net_income >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {report.totals.net_income >= 0 ? '+' : '-'}{formatCurrency(Math.abs(report.totals.net_income), currencySymbol)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Period Info */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Report period: {new Date(report.start_date).toLocaleDateString('fr-FR')} to {new Date(report.end_date).toLocaleDateString('fr-FR')}
              </div>
            </>
          )}

          {/* Empty State */}
          {!isLoading && !error && report && report.revenue.length === 0 && report.expenses.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No P&L Data</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Post journal entries with revenue or expense accounts to see your P&L statement.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/report-profit-loss')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
