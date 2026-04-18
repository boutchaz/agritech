import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ArrowDownCircle, ArrowUpCircle, Banknote, Building2, Calendar, AlertCircle, Download, Wheat, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useCashFlow, type CashFlowReport } from '@/hooks/useFinancialReports';
import { useCampaigns, useFiscalYears } from '@/hooks/useAgriculturalAccounting';
import { formatCurrency } from '@/lib/utils/format';
import { PageLoader } from '@/components/ui/loader';
import { AccountingReportSkeleton } from '@/components/ui/page-skeletons';


interface CashFlowLineItem {
  id: string;
  label: string;
  amount: number;
}

const CashFlowSection = ({ title, items, total, currencySymbol, color, icon, tableLabel }: {
  title: string;
  items: CashFlowLineItem[];
  total: number;
  currencySymbol: string;
  color: string;
  icon: React.ReactNode;
  tableLabel: string;
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
      {items.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No transactions in this period</div>
      ) : (
        <Table className="w-full" aria-label={tableLabel}>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead scope="col" className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Description</TableHead>
              <TableHead scope="col" className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.label}</TableCell>
                <TableCell className={`px-4 py-3 text-sm text-right font-medium ${item.amount >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-gray-100 dark:bg-gray-700">
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Net {title}</TableCell>
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

const buildOperatingItems = (report: CashFlowReport, t: (key: string, fallback: string) => string): CashFlowLineItem[] => {
  const items: CashFlowLineItem[] = [];
  items.push({
    id: 'net-income',
    label: t('reportsModule.cashFlow.netIncome', 'Net Income (from Profit & Loss)'),
    amount: report.operating.net_income,
  });
  if (report.operating.depreciation !== 0) {
    items.push({
      id: 'depreciation',
      label: t('reportsModule.cashFlow.depreciation', 'Depreciation & Amortization'),
      amount: report.operating.depreciation,
    });
  }
  if (report.operating.changes_in_ar !== 0) {
    items.push({
      id: 'changes-ar',
      label: t('reportsModule.cashFlow.changesInAR', 'Changes in Accounts Receivable'),
      amount: report.operating.changes_in_ar,
    });
  }
  if (report.operating.changes_in_ap !== 0) {
    items.push({
      id: 'changes-ap',
      label: t('reportsModule.cashFlow.changesInAP', 'Changes in Accounts Payable'),
      amount: report.operating.changes_in_ap,
    });
  }
  if (report.operating.changes_in_inventory !== 0) {
    items.push({
      id: 'changes-inventory',
      label: t('reportsModule.cashFlow.changesInInventory', 'Changes in Inventory'),
      amount: report.operating.changes_in_inventory,
    });
  }
  if (report.operating.other_adjustments !== 0) {
    items.push({
      id: 'other-adj',
      label: t('reportsModule.cashFlow.otherAdjustments', 'Other Operating Adjustments'),
      amount: report.operating.other_adjustments,
    });
  }
  return items;
};

const buildInvestingItems = (report: CashFlowReport, t: (key: string, fallback: string) => string): CashFlowLineItem[] => {
  const items: CashFlowLineItem[] = [];
  if (report.investing.fixed_asset_purchases !== 0) {
    items.push({
      id: 'fixed-purchases',
      label: t('reportsModule.cashFlow.fixedAssetPurchases', 'Purchase of Fixed Assets'),
      amount: report.investing.fixed_asset_purchases,
    });
  }
  if (report.investing.fixed_asset_sales !== 0) {
    items.push({
      id: 'fixed-sales',
      label: t('reportsModule.cashFlow.fixedAssetSales', 'Sale of Fixed Assets'),
      amount: report.investing.fixed_asset_sales,
    });
  }
  return items;
};

const buildFinancingItems = (report: CashFlowReport, t: (key: string, fallback: string) => string): CashFlowLineItem[] => {
  const items: CashFlowLineItem[] = [];
  if (report.financing.debt_proceeds !== 0) {
    items.push({
      id: 'debt-proceeds',
      label: t('reportsModule.cashFlow.debtProceeds', 'Proceeds from Debt'),
      amount: report.financing.debt_proceeds,
    });
  }
  if (report.financing.debt_repayments !== 0) {
    items.push({
      id: 'debt-repayments',
      label: t('reportsModule.cashFlow.debtRepayments', 'Repayment of Debt'),
      amount: report.financing.debt_repayments,
    });
  }
  if (report.financing.equity_changes !== 0) {
    items.push({
      id: 'equity-changes',
      label: t('reportsModule.cashFlow.equityChanges', 'Changes in Equity'),
      amount: report.financing.equity_changes,
    });
  }
  if (report.financing.dividends !== 0) {
    items.push({
      id: 'dividends',
      label: t('reportsModule.cashFlow.dividends', 'Dividends Paid'),
      amount: report.financing.dividends,
    });
  }
  return items;
};

function exportCashFlowCsv(
  report: CashFlowReport,
  startDate: string,
  endDate: string,
  _currencySymbol: string
): void {
  const rows: string[][] = [];

  // Header
  rows.push(['Cash Flow Statement']);
  rows.push(['Period', `${startDate} to ${endDate}`]);
  rows.push([]);

  // Operating Activities
  rows.push(['Operating Activities']);
  rows.push(['Net Income', String(report.operating.net_income)]);
  rows.push(['Depreciation', String(report.operating.depreciation)]);
  rows.push(['Changes in Accounts Receivable', String(report.operating.changes_in_ar)]);
  rows.push(['Changes in Accounts Payable', String(report.operating.changes_in_ap)]);
  rows.push(['Changes in Inventory', String(report.operating.changes_in_inventory)]);
  rows.push(['Other Adjustments', String(report.operating.other_adjustments)]);
  rows.push(['Net Cash from Operating', String(report.operating.total)]);
  rows.push([]);

  // Investing Activities
  rows.push(['Investing Activities']);
  rows.push(['Fixed Asset Purchases', String(report.investing.fixed_asset_purchases)]);
  rows.push(['Fixed Asset Sales', String(report.investing.fixed_asset_sales)]);
  rows.push(['Net Cash from Investing', String(report.investing.total)]);
  rows.push([]);

  // Financing Activities
  rows.push(['Financing Activities']);
  rows.push(['Debt Proceeds', String(report.financing.debt_proceeds)]);
  rows.push(['Debt Repayments', String(report.financing.debt_repayments)]);
  rows.push(['Equity Changes', String(report.financing.equity_changes)]);
  rows.push(['Dividends', String(report.financing.dividends)]);
  rows.push(['Net Cash from Financing', String(report.financing.total)]);
  rows.push([]);

  // Summary
  rows.push(['Summary']);
  rows.push(['Net Change in Cash', String(report.net_change)]);
  rows.push(['Opening Cash', String(report.opening_cash)]);
  rows.push(['Closing Cash', String(report.closing_cash)]);

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cash-flow-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

  useEffect(() => {
    if (selectedCampaign !== 'all') {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (campaign) {
        setStartDate(campaign.start_date);
        setEndDate(campaign.end_date);
        setSelectedFiscalYear('all');
      }
    }
  }, [selectedCampaign, campaigns]);

  useEffect(() => {
    if (selectedFiscalYear !== 'all') {
      const fiscalYear = fiscalYears.find(fy => fy.id === selectedFiscalYear);
      if (fiscalYear) {
        setStartDate(fiscalYear.start_date);
        setEndDate(fiscalYear.end_date);
        setSelectedCampaign('all');
      }
    }
  }, [selectedFiscalYear, fiscalYears]);

  const activeFiscalYearId = selectedFiscalYear !== 'all' ? selectedFiscalYear : undefined;
  const { data: cashFlowReport, isLoading, error } = useCashFlow(startDate, endDate, activeFiscalYearId);

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
            { icon: Banknote, label: t('reportsModule.cashFlow.title', 'Cash Flow'), isActive: true }
          ]}
          title={t('reportsModule.cashFlow.title', 'Cash Flow Statement')}
          subtitle={t('reportsModule.cashFlow.subtitle', 'Cash inflows and outflows from operations, investing, and financing activities')}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <Label htmlFor="campaign" className="flex items-center gap-2 mb-2">
                  <Wheat className="h-4 w-4" />
                  {t('reportsModule.cashFlow.campaign', 'Agricultural Campaign')}
                </Label>
                <NativeSelect
                  id="campaign"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="all">{t('reportsModule.cashFlow.allCampaigns', 'All Campaigns')}</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="min-w-[200px]">
                <Label htmlFor="fiscal_year" className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4" />
                  {t('reportsModule.cashFlow.fiscalYear', 'Fiscal Year')}
                </Label>
                <NativeSelect
                  id="fiscal_year"
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="all">{t('reportsModule.cashFlow.allFiscalYears', 'All Fiscal Years')}</option>
                  {fiscalYears.map(fy => (
                    <option key={fy.id} value={fy.id}>{fy.name}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="min-w-[200px]">
                <Label htmlFor="start_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  {t('reportsModule.cashFlow.startDate', 'Start Date')}
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
                  {t('reportsModule.cashFlow.endDate', 'End Date')}
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
                disabled={!cashFlowReport}
                onClick={() => cashFlowReport && exportCashFlowCsv(cashFlowReport, startDate, endDate, currencySymbol)}
              >
                <Download className="h-4 w-4" />
                {t('reportsModule.cashFlow.exportCsv', 'Export CSV')}
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
                <span>{t('reportsModule.cashFlow.error', 'Failed to load cash flow statement')}: {(error as Error).message}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Flow Content */}
        {cashFlowReport && !isLoading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4" />
                    {t('reportsModule.cashFlow.netOperating', 'Net Cash from Operations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(cashFlowReport.operating.total, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    {t('reportsModule.cashFlow.netInvesting', 'Net Cash from Investing')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(cashFlowReport.investing.total, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    {t('reportsModule.cashFlow.netFinancing', 'Net Cash from Financing')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {formatCurrency(cashFlowReport.financing.total, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
              <Card className={cashFlowReport.net_change >= 0 ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium flex items-center gap-2 ${cashFlowReport.net_change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {cashFlowReport.net_change >= 0 ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                    {t('reportsModule.cashFlow.netChange', 'Net Change in Cash')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${cashFlowReport.net_change >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'}`}>
                    {formatCurrency(cashFlowReport.net_change, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Operating Activities */}
            <CashFlowSection
              title={t('reportsModule.cashFlow.operatingActivities', 'Operating Activities')}
              items={buildOperatingItems(cashFlowReport, t)}
              total={cashFlowReport.operating.total}
              currencySymbol={currencySymbol}
              color="bg-green-600"
              icon={<ArrowUpCircle className="h-5 w-5" />}
              tableLabel={t('reportsModule.cashFlow.tableLabel', 'Cash Flow Operating Activities')}
            />

            {/* Investing Activities */}
            <CashFlowSection
              title={t('reportsModule.cashFlow.investingActivities', 'Investing Activities')}
              items={buildInvestingItems(cashFlowReport, t)}
              total={cashFlowReport.investing.total}
              currencySymbol={currencySymbol}
              color="bg-blue-600"
              icon={<ArrowDownCircle className="h-5 w-5" />}
              tableLabel={t('reportsModule.cashFlow.tableLabel', 'Cash Flow Investing Activities')}
            />

            {/* Financing Activities */}
            <CashFlowSection
              title={t('reportsModule.cashFlow.financingActivities', 'Financing Activities')}
              items={buildFinancingItems(cashFlowReport, t)}
              total={cashFlowReport.financing.total}
              currencySymbol={currencySymbol}
              color="bg-purple-600"
              icon={<Banknote className="h-5 w-5" />}
              tableLabel={t('reportsModule.cashFlow.tableLabel', 'Cash Flow Financing Activities')}
            />

            {/* Cash Summary */}
            <Card>
              <CardHeader className="bg-gray-100 dark:bg-gray-800">
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  {t('reportsModule.cashFlow.closingCash', 'Cash Summary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="w-full" aria-label={t('reportsModule.cashFlow.tableLabel', 'Cash Summary')}>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableHead scope="col" className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Description</TableHead>
                      <TableHead scope="col" className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-t border-gray-100 dark:border-gray-700">
                      <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {t('reportsModule.cashFlow.openingCash', 'Opening Cash Balance')}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(cashFlowReport.opening_cash, currencySymbol)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-gray-100 dark:border-gray-700">
                      <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {t('reportsModule.cashFlow.netChangeInCash', 'Net Change in Cash')}
                      </TableCell>
                      <TableCell className={`px-4 py-3 text-sm text-right font-medium ${cashFlowReport.net_change >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {formatCurrency(cashFlowReport.net_change, currencySymbol)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <TableRow>
                      <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {t('reportsModule.cashFlow.closingCash', 'Closing Cash Balance')}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-green-700 dark:text-green-300">
                        {formatCurrency(cashFlowReport.closing_cash, currencySymbol)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            {/* Period Info */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('reportsModule.cashFlow.reportPeriod', 'Report period')}: {new Date(startDate).toLocaleDateString('fr-FR')} {t('reportsModule.cashFlow.to', 'to')} {new Date(endDate).toLocaleDateString('fr-FR')}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && !cashFlowReport && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('reportsModule.cashFlow.noData', 'No Cash Flow Data')}</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('reportsModule.cashFlow.noDataHint', 'Post journal entries with asset, liability, or equity accounts to see your cash flow statement.')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/cash-flow')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
