import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, Scale, Loader2, AlertCircle, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useBalanceSheet, type BalanceSheetRow } from '../hooks/useFinancialReports';

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

const BalanceSheetSection: React.FC<{
  title: string;
  accounts: BalanceSheetRow[];
  total: number;
  currencySymbol: string;
  color: string;
}> = ({ title, accounts, total, currencySymbol, color }) => (
  <Card>
    <CardHeader className={`${color} text-white rounded-t-lg`}>
      <CardTitle className="flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xl font-bold">{formatCurrency(total, currencySymbol)}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {accounts.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No accounts with balances</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Code</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Account Name</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Balance</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.account_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{account.account_code}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{account.account_name}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(account.display_balance), currencySymbol)}
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
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('accounting');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading, error } = useBalanceSheet(asOfDate);

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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
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
            { icon: Scale, label: 'Balance Sheet', isActive: true }
          ]}
          title="Balance Sheet"
          subtitle="Financial position statement showing assets, liabilities, and equity"
        />

        <div className="p-6 space-y-6">
          {/* Date Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="as_of_date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    As of Date
                  </Label>
                  <Input
                    id="as_of_date"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <Button variant="outline" className="gap-2" disabled>
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading balance sheet...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to load balance sheet: {(error as Error).message}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Sheet Content */}
          {report && !isLoading && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(report.totals.total_assets, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Total Liabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(report.totals.total_liabilities, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Equity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(report.totals.total_equity, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
                <Card className={report.totals.is_balanced ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm font-medium ${report.totals.is_balanced ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      Balance Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${report.totals.is_balanced ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                      {report.totals.is_balanced ? '✓ Balanced' : '⚠ Unbalanced'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assets Section */}
              <BalanceSheetSection
                title="Assets"
                accounts={report.assets}
                total={report.totals.total_assets}
                currencySymbol={currencySymbol}
                color="bg-blue-600"
              />

              {/* Liabilities Section */}
              <BalanceSheetSection
                title="Liabilities"
                accounts={report.liabilities}
                total={report.totals.total_liabilities}
                currencySymbol={currencySymbol}
                color="bg-red-600"
              />

              {/* Equity Section */}
              <BalanceSheetSection
                title="Equity"
                accounts={report.equity}
                total={report.totals.total_equity}
                currencySymbol={currencySymbol}
                color="bg-green-600"
              />

              {/* Accounting Equation */}
              <Card className="bg-gray-100 dark:bg-gray-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accounting Equation</h3>
                    <div className="flex items-center justify-center gap-4 text-xl">
                      <div className="text-blue-600 dark:text-blue-400">
                        <div className="text-sm text-gray-500">Assets</div>
                        <div className="font-bold">{formatCurrency(report.totals.total_assets, currencySymbol)}</div>
                      </div>
                      <span className="text-gray-400">=</span>
                      <div className="text-red-600 dark:text-red-400">
                        <div className="text-sm text-gray-500">Liabilities</div>
                        <div className="font-bold">{formatCurrency(report.totals.total_liabilities, currencySymbol)}</div>
                      </div>
                      <span className="text-gray-400">+</span>
                      <div className="text-green-600 dark:text-green-400">
                        <div className="text-sm text-gray-500">Equity</div>
                        <div className="font-bold">{formatCurrency(report.totals.total_equity, currencySymbol)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!isLoading && !error && report && report.assets.length === 0 && report.liabilities.length === 0 && report.equity.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Balance Sheet Data</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Post journal entries to see your balance sheet data.
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

export const Route = createFileRoute('/report-balance-sheet')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
