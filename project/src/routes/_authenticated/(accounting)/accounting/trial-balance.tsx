import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, BookOpen, AlertCircle, Download, Calendar, CheckCircle2, XCircle, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTrialBalance } from '@/hooks/useFinancialReports';
import { useFiscalYears, useCurrentFiscalYear } from '@/hooks/useAgriculturalAccounting';
import { exportTrialBalanceCsv } from '@/lib/utils/report-export';
import { PageLoader } from '@/components/ui/loader';
import { AccountingReportSkeleton } from '@/components/ui/page-skeletons';


const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getAccountTypeColor = (accountType: string): string => {
  switch (accountType.toLowerCase()) {
    case 'asset':
      return 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30';
    case 'liability':
      return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
    case 'equity':
      return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
    case 'revenue':
      return 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30';
    case 'expense':
      return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50';
  }
};

const AppContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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
  const { data: report, isLoading, error } = useTrialBalance(asOfDate, activeFiscalYearId);

  const currencySymbol = currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  const filteredAccounts = useMemo(() => {
    if (!report) return [];
    const term = search.trim().toLowerCase();
    return report.accounts.filter((a) => {
      if (typeFilter !== 'all' && a.account_type.toLowerCase() !== typeFilter) return false;
      if (!term) return true;
      return (
        a.account_code.toLowerCase().includes(term) ||
        a.account_name.toLowerCase().includes(term)
      );
    });
  }, [report, search, typeFilter]);

  const filteredTotals = useMemo(() => {
    return filteredAccounts.reduce(
      (acc, a) => {
        acc.debit += Number(a.debit_balance || 0);
        acc.credit += Number(a.credit_balance || 0);
        return acc;
      },
      { debit: 0, credit: 0 },
    );
  }, [filteredAccounts]);

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
            { icon: BookOpen, label: t('reportsModule.trialBalance.title', 'Trial Balance'), isActive: true }
          ]}
          title={t('reportsModule.trialBalance.title', 'Trial Balance')}
          subtitle={t('reportsModule.trialBalance.subtitle', 'List of all accounts with their debit and credit balances')}
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
                    {t('reportsModule.trialBalance.asOfDate', 'As of Date')}
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
                  disabled={!report || report.accounts.length === 0}
                  onClick={() => report && exportTrialBalanceCsv(report.accounts, asOfDate, currencySymbol)}
                >
                  <Download className="h-4 w-4" />
                  {t('reportsModule.trialBalance.exportCsv', 'Export CSV')}
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
                  <span>Failed to load trial balance: {(error as Error).message}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trial Balance Content */}
          {report && !isLoading && (
            <>
              {/* Balance Status Card */}
              <Card className={report.totals.is_balanced ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {report.totals.is_balanced ? (
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <h3 className={`text-lg font-semibold ${report.totals.is_balanced ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {report.totals.is_balanced ? t('reportsModule.trialBalance.balanced', 'Books are Balanced') : t('reportsModule.trialBalance.notBalanced', 'Books are NOT Balanced')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {report.totals.is_balanced
                            ? t('reportsModule.trialBalance.debitsEqualCredits', 'Total debits equal total credits')
                            : `${t('reportsModule.trialBalance.difference', 'Difference')}: ${formatCurrency(Math.abs(report.totals.total_debit - report.totals.total_credit), currencySymbol)}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{t('reportsModule.trialBalance.asOf', 'As of')} {new Date(report.as_of_date).toLocaleDateString('fr-FR')}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{report.accounts.length} {t('reportsModule.trialBalance.accountsWithBalances', 'accounts with balances')}</div>
                    </div>
                  </div>
                  {!report.totals.is_balanced && (
                    <div className="rounded-md bg-white/60 dark:bg-gray-900/40 p-3 border border-red-200 dark:border-red-900">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        {t('reportsModule.trialBalance.rebalance.title', 'How to rebalance')}
                      </p>
                      <ol className="text-sm text-red-700 dark:text-red-300 list-decimal ml-5 space-y-1">
                        <li>{t('reportsModule.trialBalance.rebalance.step1', 'Open the Journal and look for entries with unbalanced debits/credits.')}</li>
                        <li>{t('reportsModule.trialBalance.rebalance.step2', 'Drill into suspicious accounts via the General Ledger to see the exact transactions.')}</li>
                        <li>{t('reportsModule.trialBalance.rebalance.step3', 'Post a correcting journal entry or reverse the bad one — never edit a posted entry.')}</li>
                      </ol>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" variant="destructive" onClick={() => navigate({ to: '/accounting/journal' })}>
                          {t('reportsModule.trialBalance.rebalance.openJournal', 'Open Journal')}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/accounting/general-ledger' })}>
                          {t('reportsModule.trialBalance.rebalance.openGL', 'Open General Ledger')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('reportsModule.trialBalance.totalDebits', 'Total Debits')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(report.totals.total_debit, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">{t('reportsModule.trialBalance.totalCredits', 'Total Credits')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(report.totals.total_credit, currencySymbol)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trial Balance Table */}
              <Card>
                <CardHeader className="bg-gray-100 dark:bg-gray-800">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {t('reportsModule.trialBalance.accountDetails', 'Account Details')}
                  </CardTitle>
                </CardHeader>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('reportsModule.trialBalance.searchPlaceholder', 'Search by code or name...')}
                      className="pl-9"
                    />
                  </div>
                  <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-48">
                    <option value="all">{t('reportsModule.trialBalance.allTypes', 'All Types')}</option>
                    <option value="asset">{t('reportsModule.trialBalance.types.asset', 'Asset')}</option>
                    <option value="liability">{t('reportsModule.trialBalance.types.liability', 'Liability')}</option>
                    <option value="equity">{t('reportsModule.trialBalance.types.equity', 'Equity')}</option>
                    <option value="revenue">{t('reportsModule.trialBalance.types.revenue', 'Revenue')}</option>
                    <option value="expense">{t('reportsModule.trialBalance.types.expense', 'Expense')}</option>
                  </NativeSelect>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredAccounts.length} / {report.accounts.length}
                  </span>
                </div>
                <CardContent className="p-0">
                  {report.accounts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>{t('reportsModule.trialBalance.noAccounts', 'No accounts with balances found.')}</p>
                      <p className="text-sm">{t('reportsModule.trialBalance.postJournalEntries', 'Post journal entries to see account balances.')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table
                        className="w-full"
                        aria-label={t('reportsModule.trialBalance.title', 'Trial Balance Accounts')}
                      >
                        <TableHeader className="bg-gray-50 dark:bg-gray-800">
                          <TableRow>
                            <TableHead scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.code', 'Code')}</TableHead>
                            <TableHead scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.accountName', 'Account Name')}</TableHead>
                            <TableHead scope="col" className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.type', 'Type')}</TableHead>
                            <TableHead scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.debit', 'Debit')}</TableHead>
                            <TableHead scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.credit', 'Credit')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAccounts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                {t('reportsModule.trialBalance.noFilterMatch', 'No accounts match your search.')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAccounts.map((account) => (
                              <TableRow
                                key={account.account_id}
                                onClick={() =>
                                  navigate({
                                    to: '/accounting/general-ledger',
                                    search: { account: account.account_id } as never,
                                  })
                                }
                                className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                              >
                                <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                                  {account.account_code}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {account.account_name}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountTypeColor(account.account_type)}`}>
                                    {account.account_type}
                                  </span>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                                  {Number(account.debit_balance) > 0 ? formatCurrency(Number(account.debit_balance), currencySymbol) : '-'}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm text-right font-medium text-purple-600 dark:text-purple-400">
                                  {Number(account.credit_balance) > 0 ? formatCurrency(Number(account.credit_balance), currencySymbol) : '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                        <TableFooter className="bg-gray-100 dark:bg-gray-700 font-bold">
                          <TableRow>
                            <TableCell colSpan={3} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {search || typeFilter !== 'all'
                                ? t('reportsModule.trialBalance.filteredTotals', 'FILTERED TOTALS')
                                : t('reportsModule.trialBalance.totals', 'TOTALS')}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-right text-blue-700 dark:text-blue-300">
                              {formatCurrency(
                                search || typeFilter !== 'all' ? filteredTotals.debit : report.totals.total_debit,
                                currencySymbol,
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-right text-purple-700 dark:text-purple-300">
                              {formatCurrency(
                                search || typeFilter !== 'all' ? filteredTotals.credit : report.totals.total_credit,
                                currencySymbol,
                              )}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Explanation */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('reportsModule.trialBalance.about.title', 'About Trial Balance')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('reportsModule.trialBalance.about.description', 'A trial balance is a bookkeeping worksheet listing all account balances at a specific point in time. In double-entry accounting, total debits must equal total credits. If they don\'t balance, there may be errors in the journal entries that need to be investigated.')}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/trial-balance')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
