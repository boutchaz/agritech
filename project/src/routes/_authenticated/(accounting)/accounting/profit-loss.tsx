import React, { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Calendar,
  Wheat,
  CalendarRange,
  Printer,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import {
  useProfitLoss,
  useProfitLossComparison,
  type ProfitLossRow,
  type ProfitLossReport,
} from '@/hooks/useFinancialReports';
import { useCampaigns, useFiscalYears } from '@/hooks/useAgriculturalAccounting';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useParcels } from '@/hooks/useParcels';
import { exportProfitLossCsv } from '@/lib/utils/report-export';
import { PageLoader } from '@/components/ui/loader';
import { AccountingReportSkeleton } from '@/components/ui/page-skeletons';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CloseFiscalYearDialog } from '@/components/Accounting/CloseFiscalYearDialog';
import { financialReportsApi } from '@/lib/api/financial-reports';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, Unlock, ArrowLeftRight } from 'lucide-react';

type PeriodPreset = 'custom' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
type CompareWith = 'none' | 'previous_period' | 'previous_year';
type Basis = 'accrual' | 'cash';

const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const pctChange = (current: number, prior: number): number | null => {
  if (Math.abs(prior) < 0.005) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
};

const presetRange = (preset: PeriodPreset): { start: string; end: string } | null => {
  const today = new Date();
  const end = today.toISOString().split('T')[0];
  const startOf = (d: Date) => d.toISOString().split('T')[0];
  if (preset === 'daily') return { start: end, end };
  if (preset === 'weekly') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { start: startOf(d), end };
  }
  if (preset === 'monthly') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: startOf(d), end };
  }
  if (preset === 'quarterly') {
    const q = Math.floor(today.getMonth() / 3);
    const d = new Date(today.getFullYear(), q * 3, 1);
    return { start: startOf(d), end };
  }
  if (preset === 'half-yearly') {
    const d = new Date(today.getFullYear(), today.getMonth() < 6 ? 0 : 6, 1);
    return { start: startOf(d), end };
  }
  if (preset === 'yearly') {
    const d = new Date(today.getFullYear(), 0, 1);
    return { start: startOf(d), end };
  }
  return null;
};

const SubtotalRow = ({
  label,
  amount,
  comparisonAmount,
  currencySymbol,
  emphasis,
}: {
  label: string;
  amount: number;
  comparisonAmount?: number;
  currencySymbol: string;
  emphasis?: 'gross' | 'operating' | 'net' | 'income';
}) => {
  const colorClass =
    emphasis === 'net'
      ? amount >= 0
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-orange-700 dark:text-orange-300'
      : 'text-gray-900 dark:text-white';
  const change = comparisonAmount !== undefined ? pctChange(amount, comparisonAmount) : null;
  return (
    <TableRow className="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-700">
      <TableCell colSpan={2} className={`px-4 py-3 text-sm font-bold ${colorClass}`}>
        {label}
      </TableCell>
      <TableCell className={`px-4 py-3 text-sm text-right font-bold ${colorClass}`}>
        {formatCurrency(amount, currencySymbol)}
      </TableCell>
      {comparisonAmount !== undefined && (
        <>
          <TableCell className="px-4 py-3 text-sm text-right font-semibold text-gray-700 dark:text-gray-300">
            {formatCurrency(comparisonAmount, currencySymbol)}
          </TableCell>
          <TableCell className="px-4 py-3 text-sm text-right font-semibold text-gray-700 dark:text-gray-300">
            {change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
          </TableCell>
        </>
      )}
    </TableRow>
  );
};

interface SectionTableProps {
  title: string;
  accounts: ProfitLossRow[];
  total: number;
  comparisonAccounts?: ProfitLossRow[];
  comparisonTotal?: number;
  currencySymbol: string;
  color: string;
  icon: React.ReactNode;
  startDate: string;
  endDate: string;
  emptyText: string;
  totalLabel: string;
  showBudget?: boolean;
  showByCurrency?: boolean;
  isExpenseSection?: boolean;
}

const SectionTable: React.FC<SectionTableProps> = ({
  title,
  accounts,
  total,
  comparisonAccounts,
  comparisonTotal,
  currencySymbol,
  color,
  icon,
  startDate,
  endDate,
  emptyText,
  totalLabel,
  showBudget,
  showByCurrency,
  isExpenseSection,
}) => {
  const navigate = useNavigate();
  const showCompare = comparisonAccounts !== undefined && comparisonTotal !== undefined;
  const varianceClass = (variance: number) => {
    // For income: positive variance (over budget) is favorable.
    // For expense: positive variance (over budget) is adverse.
    const favorable = isExpenseSection ? variance < 0 : variance > 0;
    if (Math.abs(variance) < 0.005) return 'text-gray-500';
    return favorable
      ? 'text-green-700 dark:text-green-400'
      : 'text-red-700 dark:text-red-400';
  };
  const sectionBudgetTotal = showBudget
    ? accounts.reduce((s, r) => s + (r.budget_amount || 0), 0)
    : 0;
  const sectionVarianceTotal = showBudget ? total - sectionBudgetTotal : 0;

  const cmpById = useMemo(() => {
    const m = new Map<string, ProfitLossRow>();
    (comparisonAccounts || []).forEach(r => m.set(r.account_id, r));
    return m;
  }, [comparisonAccounts]);

  const drillTo = (accountId: string) => {
    navigate({
      to: '/accounting/general-ledger',
      search: {
        account_id: accountId,
        start: startDate,
        end: endDate,
      } as never,
    });
  };

  return (
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
          <div className="p-4 text-center text-gray-500">{emptyText}</div>
        ) : (
          <Table className="w-full" aria-label={`${title} Accounts`}>
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                <TableHead className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Code</TableHead>
                <TableHead className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Account Name</TableHead>
                <TableHead className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</TableHead>
                {showCompare && (
                  <>
                    <TableHead className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Comparison</TableHead>
                    <TableHead className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">% Change</TableHead>
                  </>
                )}
                {showBudget && (
                  <>
                    <TableHead className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Budget</TableHead>
                    <TableHead className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Variance</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(account => {
                const cmp = cmpById.get(account.account_id);
                const change = cmp ? pctChange(Number(account.display_amount), Number(cmp.display_amount)) : null;
                const totalCols = 3 + (showCompare ? 2 : 0) + (showBudget ? 2 : 0);
                const byCurrencyRows = showByCurrency && account.by_currency && account.by_currency.length > 0
                  ? account.by_currency
                  : null;
                return (
                  <React.Fragment key={account.account_id}>
                  <TableRow
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer print:cursor-auto"
                    onClick={() => drillTo(account.account_id)}
                  >
                    <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{account.account_code}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">{account.account_name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(account.display_amount), currencySymbol)}
                    </TableCell>
                    {showCompare && (
                      <>
                        <TableCell className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(Number(cmp?.display_amount || 0), currencySymbol)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
                        </TableCell>
                      </>
                    )}
                    {showBudget && (
                      <>
                        <TableCell className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {account.budget_amount === null || account.budget_amount === undefined
                            ? '—'
                            : formatCurrency(Number(account.budget_amount), currencySymbol)}
                        </TableCell>
                        <TableCell
                          className={`px-4 py-3 text-sm text-right ${
                            account.variance === null || account.variance === undefined
                              ? 'text-gray-500'
                              : varianceClass(Number(account.variance))
                          }`}
                        >
                          {account.variance === null || account.variance === undefined
                            ? '—'
                            : `${Number(account.variance) >= 0 ? '+' : ''}${formatCurrency(Number(account.variance), currencySymbol)}`}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                  {byCurrencyRows && byCurrencyRows.map((bc, idx) => (
                    <TableRow
                      key={`${account.account_id}-${bc.currency}-${idx}`}
                      className="bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800"
                    >
                      <TableCell colSpan={totalCols} className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-block min-w-[5rem] pl-8 font-medium">
                          {bc.currency}
                        </span>
                        <span className="inline-block min-w-[10rem] tabular-nums">
                          {bc.fc_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {bc.currency}
                        </span>
                        <span className="inline-block tabular-nums text-gray-600 dark:text-gray-300">
                          ≈ {formatCurrency(bc.base_amount, currencySymbol)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
            <TableFooter className="bg-gray-100 dark:bg-gray-700">
              <TableRow>
                <TableCell colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  {totalLabel}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                  {formatCurrency(total, currencySymbol)}
                </TableCell>
                {showCompare && (
                  <>
                    <TableCell className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(comparisonTotal || 0, currencySymbol)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {(() => {
                        const c = pctChange(total, comparisonTotal || 0);
                        return c === null ? '—' : `${c >= 0 ? '+' : ''}${c.toFixed(1)}%`;
                      })()}
                    </TableCell>
                  </>
                )}
                {showBudget && (
                  <>
                    <TableCell className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(sectionBudgetTotal, currencySymbol)}
                    </TableCell>
                    <TableCell
                      className={`px-4 py-3 text-sm text-right font-bold ${varianceClass(sectionVarianceTotal)}`}
                    >
                      {`${sectionVarianceTotal >= 0 ? '+' : ''}${formatCurrency(sectionVarianceTotal, currencySymbol)}`}
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const PrintStyles = () => (
  <style>{`
    @media print {
      header, nav, aside, [data-sidebar], .no-print { display: none !important; }
      body { background: white !important; }
      .pl-print-area { padding: 0 !important; }
      .pl-print-area .cursor-pointer { cursor: auto !important; }
      .pl-print-area * { color-adjust: exact; -webkit-print-color-adjust: exact; }
      @page { margin: 1cm; }
    }
  `}</style>
);

const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization, farms } = useAuth();

  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodPreset>('custom');

  // Phase-2 dimension filters
  const [costCenterId, setCostCenterId] = useState<string>('all');
  const [farmId, setFarmId] = useState<string>('all');
  const [parcelId, setParcelId] = useState<string>('all');
  const [includeZero, setIncludeZero] = useState<boolean>(false);
  const [compareWith, setCompareWith] = useState<CompareWith>('none');
  const [showBudget, setShowBudget] = useState<boolean>(false);
  const [showByCurrency, setShowByCurrency] = useState<boolean>(false);
  const [basis, setBasis] = useState<Basis>('accrual');
  const [closeDialogOpen, setCloseDialogOpen] = useState<boolean>(false);
  const [fxRevalOpen, setFxRevalOpen] = useState<boolean>(false);
  const [fxAsOfDate, setFxAsOfDate] = useState<string>('');
  const [fxRemarks, setFxRemarks] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useCampaigns();
  const { data: fiscalYears = [] } = useFiscalYears();
  const { data: costCenters = [] } = useCostCenters();
  const { parcels } = useParcels(farmId !== 'all' ? farmId : null);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    if (value !== 'all') {
      const campaign = campaigns.find(c => c.id === value);
      if (campaign) {
        setStartDate(campaign.start_date);
        setEndDate(campaign.end_date);
        setSelectedFiscalYear('all');
        setPeriod('custom');
      }
    }
  };

  const handleFiscalYearChange = (value: string) => {
    setSelectedFiscalYear(value);
    if (value !== 'all') {
      const fy = fiscalYears.find(f => f.id === value);
      if (fy) {
        setStartDate(fy.start_date);
        setEndDate(fy.end_date);
        setSelectedCampaign('all');
        setPeriod('custom');
      }
    }
  };

  const handlePeriodChange = (value: PeriodPreset) => {
    setPeriod(value);
    const range = presetRange(value);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const activeFiscalYearId = selectedFiscalYear !== 'all' ? selectedFiscalYear : undefined;
  const budgetEnabled = showBudget && !!activeFiscalYearId;
  const filters = useMemo(
    () => ({
      cost_center_id: costCenterId !== 'all' ? costCenterId : undefined,
      farm_id: farmId !== 'all' ? farmId : undefined,
      parcel_id: parcelId !== 'all' ? parcelId : undefined,
      include_zero_balances: includeZero,
      include_budget: budgetEnabled,
      include_by_currency: showByCurrency,
      basis,
    }),
    [costCenterId, farmId, parcelId, includeZero, budgetEnabled, showByCurrency, basis],
  );

  const compareEnabled = compareWith !== 'none';
  const singleQuery = useProfitLoss(
    compareEnabled ? undefined : startDate,
    compareEnabled ? undefined : endDate,
    compareEnabled ? undefined : activeFiscalYearId,
    compareEnabled ? undefined : filters,
  );
  const compareQuery = useProfitLossComparison(
    compareEnabled ? startDate : undefined,
    compareEnabled ? endDate : undefined,
    compareEnabled ? compareWith : undefined,
    compareEnabled ? activeFiscalYearId : undefined,
    compareEnabled ? filters : undefined,
  );

  const isLoading = compareEnabled ? compareQuery.isLoading : singleQuery.isLoading;
  const error = compareEnabled ? compareQuery.error : singleQuery.error;
  const report: ProfitLossReport | undefined = compareEnabled
    ? compareQuery.data?.current
    : singleQuery.data;
  const comparison: ProfitLossReport | undefined = compareEnabled
    ? compareQuery.data?.comparison
    : undefined;

  const currencySymbol =
    currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  if (!currentOrganization) {
    return <PageLoader />;
  }

  const allFiscalYears = selectedFiscalYear === 'all';
  const activeFiscalYearObj = useMemo(
    () => fiscalYears.find((f) => f.id === activeFiscalYearId),
    [fiscalYears, activeFiscalYearId],
  );

  const reopenMutation = useMutation({
    mutationFn: () =>
      financialReportsApi.reopenFiscalYear(activeFiscalYearId!, currentOrganization?.id),
    onSuccess: (res) => {
      toast.success(
        t('fiscalYearClose.reopenSuccess', 'Fiscal year reopened (reversal: {{n}})', {
          n: res.reversalNumber,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || t('fiscalYearClose.reopenError', 'Failed to reopen fiscal year'));
    },
  });

  const fxRevaluateMutation = useMutation({
    mutationFn: () =>
      financialReportsApi.fxRevaluate(
        { as_of_date: fxAsOfDate, remarks: fxRemarks || undefined },
        currentOrganization?.id,
      ),
    onSuccess: (res) => {
      toast.success(
        t(
          'fxRevaluation.success',
          'FX revaluation posted ({{n}}, net {{net}})',
          {
            n: res.entryNumber,
            net: Number(res.netGainLoss).toFixed(2),
          },
        ),
      );
      setFxRevalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || t('fxRevaluation.error', 'FX revaluation failed'));
    },
  });

  const sectionsEmpty = (r?: ProfitLossReport) =>
    !!r &&
    r.direct_income.length === 0 &&
    r.other_income.length === 0 &&
    r.cogs.length === 0 &&
    r.indirect_expenses.length === 0 &&
    r.other_expenses.length === 0;

  return (
    <div className="p-6 space-y-6 pl-print-area">
      <PrintStyles />
      {/* Filters */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                {t('reportsModule.profitLoss.basis', 'Basis')}
              </Label>
              <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBasis('accrual')}
                  className={`px-3 py-2 text-sm ${
                    basis === 'accrual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  aria-pressed={basis === 'accrual'}
                >
                  {t('reportsModule.profitLoss.basisAccrual', 'Accrual')}
                </button>
                <button
                  type="button"
                  onClick={() => setBasis('cash')}
                  className={`px-3 py-2 text-sm border-l border-gray-200 dark:border-gray-700 ${
                    basis === 'cash'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  aria-pressed={basis === 'cash'}
                >
                  {t('reportsModule.profitLoss.basisCash', 'Cash')}
                </button>
              </div>
            </div>
            <div className="min-w-[180px]">
              <Label htmlFor="period" className="flex items-center gap-2 mb-2">
                <CalendarRange className="h-4 w-4" />
                {t('reportsModule.profitLoss.period', 'Period')}
              </Label>
              <NativeSelect
                id="period"
                value={period}
                onChange={e => handlePeriodChange(e.target.value as PeriodPreset)}
                className="max-w-xs"
              >
                <option value="custom">{t('reportsModule.profitLoss.custom', 'Custom')}</option>
                <option value="daily">{t('reportsModule.profitLoss.daily', 'Daily')}</option>
                <option value="weekly">{t('reportsModule.profitLoss.weekly', 'Weekly')}</option>
                <option value="monthly">{t('reportsModule.profitLoss.monthly', 'Monthly')}</option>
                <option value="quarterly">{t('reportsModule.profitLoss.quarterly', 'Quarterly')}</option>
                <option value="half-yearly">{t('reportsModule.profitLoss.halfYearly', 'Half-Yearly')}</option>
                <option value="yearly">{t('reportsModule.profitLoss.yearly', 'Yearly')}</option>
              </NativeSelect>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="campaign" className="flex items-center gap-2 mb-2">
                <Wheat className="h-4 w-4" />
                {t('reportsModule.profitLoss.campaign', 'Agricultural Campaign')}
              </Label>
              <NativeSelect id="campaign" value={selectedCampaign} onChange={e => handleCampaignChange(e.target.value)} className="max-w-xs">
                <option value="all">{t('reportsModule.profitLoss.allCampaigns', 'All Campaigns')}</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="fiscal_year" className="flex items-center gap-2 mb-2">
                <CalendarRange className="h-4 w-4" />
                {t('reportsModule.profitLoss.fiscalYear', 'Fiscal Year')}
              </Label>
              <NativeSelect id="fiscal_year" value={selectedFiscalYear} onChange={e => handleFiscalYearChange(e.target.value)} className="max-w-xs">
                <option value="all">{t('reportsModule.profitLoss.allFiscalYears', 'All Fiscal Years')}</option>
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>
                    {fy.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-[180px]">
              <Label htmlFor="start_date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                {t('reportsModule.profitLoss.startDate', 'Start Date')}
              </Label>
              <Input id="start_date" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPeriod('custom'); }} className="max-w-xs" />
            </div>
            <div className="min-w-[180px]">
              <Label htmlFor="end_date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                {t('reportsModule.profitLoss.endDate', 'End Date')}
              </Label>
              <Input id="end_date" type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPeriod('custom'); }} className="max-w-xs" />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4 mt-4">
            <div className="min-w-[200px]">
              <Label htmlFor="cost_center" className="mb-2 block">
                {t('reportsModule.profitLoss.costCenter', 'Cost Center')}
              </Label>
              <NativeSelect id="cost_center" value={costCenterId} onChange={e => setCostCenterId(e.target.value)} className="max-w-xs">
                <option value="all">{t('reportsModule.profitLoss.allCostCenters', 'All Cost Centers')}</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} — {cc.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="farm" className="mb-2 block">
                {t('reportsModule.profitLoss.farm', 'Farm')}
              </Label>
              <NativeSelect id="farm" value={farmId} onChange={e => { setFarmId(e.target.value); setParcelId('all'); }} className="max-w-xs">
                <option value="all">{t('reportsModule.profitLoss.allFarms', 'All Farms')}</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="parcel" className="mb-2 block">
                {t('reportsModule.profitLoss.parcel', 'Parcel')}
              </Label>
              <NativeSelect id="parcel" value={parcelId} onChange={e => setParcelId(e.target.value)} disabled={farmId === 'all'} className="max-w-xs">
                <option value="all">{t('reportsModule.profitLoss.allParcels', 'All Parcels')}</option>
                {parcels.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="compare_with" className="mb-2 block">
                {t('reportsModule.profitLoss.compareWith', 'Compare With')}
              </Label>
              <NativeSelect id="compare_with" value={compareWith} onChange={e => setCompareWith(e.target.value as CompareWith)} className="max-w-xs">
                <option value="none">{t('reportsModule.profitLoss.compareNone', 'None')}</option>
                <option value="previous_period">{t('reportsModule.profitLoss.previousPeriod', 'Previous Period')}</option>
                <option value="previous_year">{t('reportsModule.profitLoss.previousYear', 'Previous Year')}</option>
              </NativeSelect>
            </div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={includeZero}
                onChange={e => setIncludeZero(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">{t('reportsModule.profitLoss.showZero', 'Show zero balances')}</span>
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex items-center gap-2 mb-2">
                    <Switch
                      checked={showBudget && !!activeFiscalYearId}
                      onCheckedChange={(v) => setShowBudget(Boolean(v))}
                      disabled={!activeFiscalYearId}
                    />
                    <span className={`text-sm ${!activeFiscalYearId ? 'text-gray-400' : ''}`}>
                      {t('reportsModule.profitLoss.showBudget', 'Show budget')}
                    </span>
                  </label>
                </TooltipTrigger>
                {!activeFiscalYearId && (
                  <TooltipContent>
                    {t(
                      'reportsModule.profitLoss.budgetTooltip',
                      'Select a specific fiscal year to compare against budget',
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <label className="flex items-center gap-2 mb-2">
              <Switch
                checked={showByCurrency}
                onCheckedChange={(v) => setShowByCurrency(Boolean(v))}
              />
              <span className="text-sm">
                {t('reportsModule.profitLoss.showByCurrency', 'Show by currency')}
              </span>
            </label>
            <Button
              variant="outline"
              className="gap-2"
              disabled={!report || sectionsEmpty(report)}
              onClick={() =>
                report &&
                exportProfitLossCsv(
                  {
                    direct_income: report.direct_income,
                    other_income: report.other_income,
                    cogs: report.cogs,
                    indirect_expenses: report.indirect_expenses,
                    other_expenses: report.other_expenses,
                  },
                  startDate,
                  endDate,
                  currencySymbol,
                )
              }
            >
              <Download className="h-4 w-4" />
              {t('reportsModule.profitLoss.exportCsv', 'Export CSV')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={!report}>
              <Printer className="h-4 w-4" />
              {t('reportsModule.profitLoss.print', 'Print / PDF')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeFiscalYearObj && (
        <Card className="no-print">
          <CardContent className="pt-6 flex flex-wrap items-center gap-3">
            <div className="text-sm font-medium">
              {t('fiscalYearClose.yearEndActions', 'Year-end actions')}:
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
              {activeFiscalYearObj.name} —{' '}
              {activeFiscalYearObj.status === 'closed'
                ? t('fiscalYearClose.statusClosed', 'Closed')
                : t('fiscalYearClose.statusOpen', 'Open')}
            </span>
            {activeFiscalYearObj.status === 'closed' ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
              >
                <Unlock className="h-4 w-4" />
                {reopenMutation.isPending
                  ? t('fiscalYearClose.reopening', 'Reopening...')
                  : t('fiscalYearClose.reopen', 'Reopen Fiscal Year')}
              </Button>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setCloseDialogOpen(true)}>
                <Lock className="h-4 w-4" />
                {t('fiscalYearClose.openDialog', 'Close Fiscal Year')}
              </Button>
            )}
            {activeFiscalYearObj.status !== 'closed' && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setFxAsOfDate(activeFiscalYearObj.end_date || endDate || new Date().toISOString().split('T')[0]);
                  setFxRemarks('');
                  setFxRevalOpen(true);
                }}
              >
                <ArrowLeftRight className="h-4 w-4" />
                {t('fxRevaluation.run', 'Run FX Revaluation')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {allFiscalYears && (
        <div className="border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 rounded-md p-3 flex items-start gap-2 no-print">
          <Info className="h-4 w-4 text-yellow-700 dark:text-yellow-300 mt-0.5" />
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            {t(
              'reportsModule.profitLoss.allFiscalYearsBanner',
              'Report mixes open and closed fiscal years. Pick a specific year to lock the period.',
            )}
          </p>
        </div>
      )}

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
          {basis === 'cash' && (
            <div className="border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 rounded-md p-3 flex items-start gap-2 text-sm text-blue-900 dark:text-blue-100">
              <Info className="h-4 w-4 mt-0.5 text-blue-700 dark:text-blue-300" />
              <p>
                {t(
                  'reportsModule.profitLoss.cashBasisInfo',
                  'Cash basis: only entries with a settled cash leg are included. Unsettled invoices/AR/AP are excluded.',
                )}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('reportsModule.profitLoss.totalIncome', 'Total Income')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(report.totals.total_income, currencySymbol)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {t('reportsModule.profitLoss.grossProfit', 'Gross Profit')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {formatCurrency(report.totals.gross_profit, currencySymbol)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {t('reportsModule.profitLoss.operatingProfit', 'Operating Profit')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {formatCurrency(report.totals.operating_profit, currencySymbol)}
                </div>
              </CardContent>
            </Card>
            <Card className={report.totals.net_income >= 0 ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium flex items-center gap-2 ${report.totals.net_income >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {report.totals.net_income >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {report.totals.net_income >= 0
                    ? t('reportsModule.profitLoss.netIncome', 'Net Income')
                    : t('reportsModule.profitLoss.netLoss', 'Net Loss')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.totals.net_income >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                  {formatCurrency(Math.abs(report.totals.net_income), currencySymbol)}
                </div>
              </CardContent>
            </Card>
          </div>

          <SectionTable
            title={t('reportsModule.profitLoss.directIncome', 'Direct Income')}
            accounts={report.direct_income}
            total={report.totals.total_direct_income}
            comparisonAccounts={comparison?.direct_income}
            comparisonTotal={comparison?.totals.total_direct_income}
            currencySymbol={currencySymbol}
            color="bg-green-600"
            icon={<TrendingUp className="h-5 w-5" />}
            startDate={startDate}
            endDate={endDate}
            emptyText={t('reportsModule.profitLoss.noTx', 'No transactions in this period')}
            totalLabel={t('reportsModule.profitLoss.totalDirectIncome', 'Total Direct Income')}
            showBudget={budgetEnabled}
            showByCurrency={showByCurrency}
            isExpenseSection={false}
          />

          <SectionTable
            title={t('reportsModule.profitLoss.otherIncome', 'Other Income')}
            accounts={report.other_income}
            total={report.totals.total_other_income}
            comparisonAccounts={comparison?.other_income}
            comparisonTotal={comparison?.totals.total_other_income}
            currencySymbol={currencySymbol}
            color="bg-emerald-600"
            icon={<TrendingUp className="h-5 w-5" />}
            startDate={startDate}
            endDate={endDate}
            emptyText={t('reportsModule.profitLoss.noTx', 'No transactions in this period')}
            totalLabel={t('reportsModule.profitLoss.totalOtherIncome', 'Total Other Income')}
            showBudget={budgetEnabled}
            showByCurrency={showByCurrency}
            isExpenseSection={false}
          />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <SubtotalRow
                    label={t('reportsModule.profitLoss.totalIncome', 'Total Income')}
                    amount={report.totals.total_income}
                    comparisonAmount={comparison?.totals.total_income}
                    currencySymbol={currencySymbol}
                    emphasis="income"
                  />
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <SectionTable
            title={t('reportsModule.profitLoss.cogs', 'Cost of Goods Sold')}
            accounts={report.cogs}
            total={report.totals.total_cogs}
            comparisonAccounts={comparison?.cogs}
            comparisonTotal={comparison?.totals.total_cogs}
            currencySymbol={currencySymbol}
            color="bg-orange-600"
            icon={<TrendingDown className="h-5 w-5" />}
            startDate={startDate}
            endDate={endDate}
            emptyText={t('reportsModule.profitLoss.noTx', 'No transactions in this period')}
            totalLabel={t('reportsModule.profitLoss.totalCogs', 'Total COGS')}
            showBudget={budgetEnabled}
            showByCurrency={showByCurrency}
            isExpenseSection
          />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <SubtotalRow
                    label={t('reportsModule.profitLoss.grossProfit', 'Gross Profit')}
                    amount={report.totals.gross_profit}
                    comparisonAmount={comparison?.totals.gross_profit}
                    currencySymbol={currencySymbol}
                    emphasis="gross"
                  />
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <SectionTable
            title={t('reportsModule.profitLoss.indirectExpenses', 'Indirect Expenses')}
            accounts={report.indirect_expenses}
            total={report.totals.total_indirect_expenses}
            comparisonAccounts={comparison?.indirect_expenses}
            comparisonTotal={comparison?.totals.total_indirect_expenses}
            currencySymbol={currencySymbol}
            color="bg-red-600"
            icon={<TrendingDown className="h-5 w-5" />}
            startDate={startDate}
            endDate={endDate}
            emptyText={t('reportsModule.profitLoss.noTx', 'No transactions in this period')}
            totalLabel={t('reportsModule.profitLoss.totalIndirectExpenses', 'Total Indirect Expenses')}
            showBudget={budgetEnabled}
            showByCurrency={showByCurrency}
            isExpenseSection
          />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <SubtotalRow
                    label={t('reportsModule.profitLoss.operatingProfit', 'Operating Profit')}
                    amount={report.totals.operating_profit}
                    comparisonAmount={comparison?.totals.operating_profit}
                    currencySymbol={currencySymbol}
                    emphasis="operating"
                  />
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <SectionTable
            title={t('reportsModule.profitLoss.otherExpenses', 'Other Expenses')}
            accounts={report.other_expenses}
            total={report.totals.total_other_expenses}
            comparisonAccounts={comparison?.other_expenses}
            comparisonTotal={comparison?.totals.total_other_expenses}
            currencySymbol={currencySymbol}
            color="bg-rose-600"
            icon={<TrendingDown className="h-5 w-5" />}
            startDate={startDate}
            endDate={endDate}
            emptyText={t('reportsModule.profitLoss.noTx', 'No transactions in this period')}
            totalLabel={t('reportsModule.profitLoss.totalOtherExpenses', 'Total Other Expenses')}
            showBudget={budgetEnabled}
            showByCurrency={showByCurrency}
            isExpenseSection
          />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <SubtotalRow
                    label={
                      report.totals.net_income >= 0
                        ? t('reportsModule.profitLoss.netProfit', 'Net Profit')
                        : t('reportsModule.profitLoss.netLoss', 'Net Loss')
                    }
                    amount={report.totals.net_income}
                    comparisonAmount={comparison?.totals.net_income}
                    currencySymbol={currencySymbol}
                    emphasis="net"
                  />
                  <SubtotalRow
                    label={t('reportsModule.profitLoss.ebitda', 'EBITDA')}
                    amount={report.totals.ebitda}
                    comparisonAmount={comparison?.totals.ebitda}
                    currencySymbol={currencySymbol}
                  />
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t('reportsModule.profitLoss.reportPeriod', 'Report period:')}{' '}
            {new Date(report.start_date).toLocaleDateString('fr-FR')} -{' '}
            {new Date(report.end_date).toLocaleDateString('fr-FR')}
            {comparison && (
              <>
                {' '}| {t('reportsModule.profitLoss.comparingTo', 'comparing to')}{' '}
                {new Date(comparison.start_date).toLocaleDateString('fr-FR')} -{' '}
                {new Date(comparison.end_date).toLocaleDateString('fr-FR')}
              </>
            )}
          </div>
        </>
      )}

      {activeFiscalYearObj && (
        <CloseFiscalYearDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          fiscalYear={activeFiscalYearObj as never}
          netIncomePreview={report?.totals.net_income}
          currencySymbol={currencySymbol}
        />
      )}

      {fxRevalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {t('fxRevaluation.title', 'Run FX Revaluation')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t(
                'fxRevaluation.subtitle',
                'Posts a single journal entry adjusting monetary FC accounts to current rates. The offset goes to the Unrealized FX Gain/Loss account.',
              )}
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fx-as-of">{t('fxRevaluation.asOfDate', 'As-of date')}</Label>
                <Input
                  id="fx-as-of"
                  type="date"
                  value={fxAsOfDate}
                  onChange={(e) => setFxAsOfDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fx-remarks">{t('fxRevaluation.remarks', 'Remarks (optional)')}</Label>
                <Input
                  id="fx-remarks"
                  value={fxRemarks}
                  onChange={(e) => setFxRemarks(e.target.value)}
                  placeholder={t('fxRevaluation.remarksPlaceholder', 'Period-end FX revaluation')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={() => setFxRevalOpen(false)} disabled={fxRevaluateMutation.isPending}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="green"
                onClick={() => fxRevaluateMutation.mutate()}
                disabled={!fxAsOfDate || fxRevaluateMutation.isPending}
              >
                {fxRevaluateMutation.isPending
                  ? t('common.processing', 'Processing...')
                  : t('fxRevaluation.run', 'Run FX Revaluation')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && report && sectionsEmpty(report) && (
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
