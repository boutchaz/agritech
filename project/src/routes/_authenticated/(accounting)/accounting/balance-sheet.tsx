import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Scale, AlertCircle, Download, Calendar, BookOpen, Receipt, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useBalanceSheet, type BalanceSheetRow } from '@/hooks/useFinancialReports';
import { useFiscalYears, useCurrentFiscalYear } from '@/hooks/useAgriculturalAccounting';
import { exportBalanceSheetCsv } from '@/lib/utils/report-export';
import { PageLoader } from '@/components/ui/loader';
import { AccountingReportSkeleton } from '@/components/ui/page-skeletons';


const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const BalanceSheetSection = ({ title, accounts, total, currencySymbol, color }: {
  title: string;
  accounts: BalanceSheetRow[];
  total: number;
  currencySymbol: string;
  color: string;
}) => (
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
        <Table className="w-full" aria-label={`${title} Accounts`}>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead scope="col" className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Code</TableHead>
              <TableHead scope="col" className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Account Name</TableHead>
              <TableHead scope="col" className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.account_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{account.account_code}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">{account.account_name}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(account.display_balance), currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-gray-100 dark:bg-gray-700">
            <TableRow>
              <TableCell colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total {title}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                {formatCurrency(total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </CardContent>
  </Card>
);

const AppContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('all');

  const { data: fiscalYears = [] } = useFiscalYears();
  const { data: currentFiscalYear } = useCurrentFiscalYear();

  // Auto-select current fiscal year on mount.
  useEffect(() => {
    if (currentFiscalYear && selectedFiscalYear === 'all') {
       
      setSelectedFiscalYear(currentFiscalYear.id);
       
      setAsOfDate(currentFiscalYear.end_date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFiscalYear]);

  useEffect(() => {
    if (selectedFiscalYear !== 'all') {
      const fy = fiscalYears.find(f => f.id === selectedFiscalYear);
      if (fy) {
         
        setAsOfDate(fy.end_date);
      }
    }
  }, [selectedFiscalYear, fiscalYears]);

  const activeFiscalYearId = selectedFiscalYear !== 'all' ? selectedFiscalYear : undefined;
  const { data: report, isLoading, error } = useBalanceSheet(asOfDate, activeFiscalYearId);

  const currencySymbol = currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Scale, label: t('reportsModule.balanceSheet.title', 'Balance Sheet'), isActive: true }
          ]}
          title={t('reportsModule.balanceSheet.title', 'Balance Sheet')}
          subtitle={t('reportsModule.balanceSheet.subtitle', 'Financial position statement showing assets, liabilities, and equity')}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <Label htmlFor="fiscal_year" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  {t('reportsModule.profitLoss.fiscalYear', 'Fiscal Year')}
                </Label>
                <NativeSelect
                  id="fiscal_year"
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="all">{t('reportsModule.profitLoss.allFiscalYears', 'All Fiscal Years')}</option>
                  {fiscalYears.map(fy => (
                    <option key={fy.id} value={fy.id}>{fy.name}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="as_of_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  {t('reportsModule.balanceSheet.asOfDate', 'As of Date')}
                </Label>
                <Input
                  id="as_of_date"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => {
                    setAsOfDate(e.target.value);
                    setSelectedFiscalYear('all');
                  }}
                  className="max-w-xs"
                />
              </div>
              <Button
                variant="outline"
                className="gap-2"
                disabled={!report || (report.assets.length === 0 && report.liabilities.length === 0 && report.equity.length === 0)}
                onClick={() => report && exportBalanceSheetCsv(report.assets, report.liabilities, report.equity, asOfDate, currencySymbol)}
              >
                <Download className="h-4 w-4" />
                {t('reportsModule.balanceSheet.exportCsv', 'Export CSV')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && <AccountingReportSkeleton />}

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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('reportsModule.balanceSheet.totalAssets', 'Total Assets')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(report.totals.total_assets, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">{t('reportsModule.balanceSheet.totalLiabilities', 'Total Liabilities')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(report.totals.total_liabilities, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">{t('reportsModule.balanceSheet.totalEquity', 'Total Equity')}</CardTitle>
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
                    {t('reportsModule.balanceSheet.balanceCheck', 'Balance Check')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${report.totals.is_balanced ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                    {report.totals.is_balanced ? t('reportsModule.balanceSheet.balanced', '✓ Balanced') : t('reportsModule.balanceSheet.unbalanced', '⚠ Unbalanced')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assets Section */}
            <BalanceSheetSection
              title={t('reportsModule.balanceSheet.assets', 'Assets')}
              accounts={report.assets}
              total={report.totals.total_assets}
              currencySymbol={currencySymbol}
              color="bg-blue-600"
            />

            {/* Liabilities Section */}
            <BalanceSheetSection
              title={t('reportsModule.balanceSheet.liabilities', 'Liabilities')}
              accounts={report.liabilities}
              total={report.totals.total_liabilities}
              currencySymbol={currencySymbol}
              color="bg-red-600"
            />

            {/* Equity Section */}
            <BalanceSheetSection
              title={t('reportsModule.balanceSheet.equity', 'Equity')}
              accounts={report.equity}
              total={report.totals.total_equity}
              currencySymbol={currencySymbol}
              color="bg-green-600"
            />

            {/* Accounting Equation */}
            <Card className="bg-gray-100 dark:bg-gray-800">
              <CardContent className="pt-6">
                <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('reportsModule.balanceSheet.accountingEquation', 'Accounting Equation')}
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-base sm:text-xl">
                  <div className="text-center text-blue-600 dark:text-blue-400">
                    <div className="text-xs sm:text-sm text-gray-500">{t('reportsModule.balanceSheet.assets', 'Assets')}</div>
                    <div className="font-bold break-all">{formatCurrency(report.totals.total_assets, currencySymbol)}</div>
                  </div>
                  <span className="text-gray-400 font-bold text-2xl sm:text-xl" aria-hidden>=</span>
                  <div className="text-center text-red-600 dark:text-red-400">
                    <div className="text-xs sm:text-sm text-gray-500">{t('reportsModule.balanceSheet.liabilities', 'Liabilities')}</div>
                    <div className="font-bold break-all">{formatCurrency(report.totals.total_liabilities, currencySymbol)}</div>
                  </div>
                  <span className="text-gray-400 font-bold text-2xl sm:text-xl" aria-hidden>+</span>
                  <div className="text-center text-green-600 dark:text-green-400">
                    <div className="text-xs sm:text-sm text-gray-500">{t('reportsModule.balanceSheet.equity', 'Equity')}</div>
                    <div className="font-bold break-all">{formatCurrency(report.totals.total_equity, currencySymbol)}</div>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
                  {Math.abs(report.totals.total_assets - (report.totals.total_liabilities + report.totals.total_equity)) < 0.01
                    ? t('reportsModule.balanceSheet.equationBalanced', 'Equation is balanced — books are healthy.')
                    : t('reportsModule.balanceSheet.equationNotBalanced', 'Equation does NOT balance — check Trial Balance for details.')}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && report && report.assets.length === 0 && report.liabilities.length === 0 && report.equity.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 max-w-md mx-auto">
                <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('reportsModule.balanceSheet.empty.title', 'No Balance Sheet Data Yet')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {t(
                    'reportsModule.balanceSheet.empty.description',
                    'A balance sheet needs posted journal entries. Start by setting up your chart of accounts and posting your first invoice or payment.',
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={() => navigate({ to: '/accounting/accounts' })}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t('reportsModule.balanceSheet.empty.configureAccounts', 'Configure Chart of Accounts')}
                  </Button>
                  <Button variant="outline" onClick={() => navigate({ to: '/accounting/invoices' })}>
                    <Receipt className="h-4 w-4 mr-2" />
                    {t('reportsModule.balanceSheet.empty.createInvoice', 'Create First Invoice')}
                    <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/balance-sheet')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
