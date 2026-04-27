import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, AlertCircle, Download, Calendar, Wheat, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useProfitLoss, type ProfitLossRow } from '@/hooks/useFinancialReports';
import { useCampaigns, useFiscalYears } from '@/hooks/useAgriculturalAccounting';
import { exportProfitLossCsv } from '@/lib/utils/report-export';
import { PageLoader } from '@/components/ui/loader';
import { AccountingReportSkeleton } from '@/components/ui/page-skeletons';


const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ProfitLossSection = ({ title, accounts, total, currencySymbol, color, icon }: {
  title: string;
  accounts: ProfitLossRow[];
  total: number;
  currencySymbol: string;
  color: string;
  icon: React.ReactNode;
}) => (
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
        <Table className="w-full" aria-label={`${title} Accounts`}>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead scope="col" className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Code</TableHead>
              <TableHead scope="col" className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Account Name</TableHead>
              <TableHead scope="col" className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.account_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{account.account_code}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">{account.account_name}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(account.display_amount), currencySymbol)}
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
  const { currentOrganization } = useAuth();

  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('all');

  const { data: campaigns = [] } = useCampaigns();
  const { data: fiscalYears = [] } = useFiscalYears();

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    if (value !== 'all') {
      const campaign = campaigns.find(c => c.id === value);
      if (campaign) {
        setStartDate(campaign.start_date);
        setEndDate(campaign.end_date);
        setSelectedFiscalYear('all');
      }
    }
  };

  const handleFiscalYearChange = (value: string) => {
    setSelectedFiscalYear(value);
    if (value !== 'all') {
      const fiscalYear = fiscalYears.find(fy => fy.id === value);
      if (fiscalYear) {
        setStartDate(fiscalYear.start_date);
        setEndDate(fiscalYear.end_date);
        setSelectedCampaign('all');
      }
    }
  };

  const activeFiscalYearId = selectedFiscalYear !== 'all' ? selectedFiscalYear : undefined;
  const { data: report, isLoading, error } = useProfitLoss(startDate, endDate, activeFiscalYearId);

  const currencySymbol = currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  return (
      <div className="p-6 space-y-6">
        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <Label htmlFor="campaign" className="flex items-center gap-2 mb-2">
                  <Wheat className="h-4 w-4" />
                  {t('reportsModule.profitLoss.campaign', 'Agricultural Campaign')}
                </Label>
                <NativeSelect
                  id="campaign"
                  value={selectedCampaign}
                  onChange={(e) => handleCampaignChange(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="all">{t('reportsModule.profitLoss.allCampaigns', 'All Campaigns')}</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="min-w-[200px]">
                <Label htmlFor="fiscal_year" className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4" />
                  {t('reportsModule.profitLoss.fiscalYear', 'Fiscal Year')}
                </Label>
                <NativeSelect
                  id="fiscal_year"
                  value={selectedFiscalYear}
                  onChange={(e) => handleFiscalYearChange(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="all">{t('reportsModule.profitLoss.allFiscalYears', 'All Fiscal Years')}</option>
                  {fiscalYears.map(fy => (
                    <option key={fy.id} value={fy.id}>{fy.name}</option>
                  ))}
                </NativeSelect>
              </div>
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
              <Button
                variant="outline"
                className="gap-2"
                disabled={!report || (report.revenue.length === 0 && report.expenses.length === 0)}
                onClick={() => report && exportProfitLossCsv(report.revenue, report.expenses, startDate, endDate, currencySymbol)}
              >
                <Download className="h-4 w-4" />
                {t('reportsModule.profitLoss.exportCsv', 'Export CSV')}
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
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/profit-loss')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
