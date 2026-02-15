import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, BookOpen, Loader2, AlertCircle, Download, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTrialBalance } from '@/hooks/useFinancialReports';
import { exportTrialBalanceCsv } from '@/lib/utils/report-export';

const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getAccountTypeColor = (accountType: string): string => {
  switch (accountType) {
    case 'Asset':
      return 'text-blue-600 dark:text-blue-400';
    case 'Liability':
      return 'text-red-600 dark:text-red-400';
    case 'Equity':
      return 'text-green-600 dark:text-green-400';
    case 'Revenue':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'Expense':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading, error } = useTrialBalance(asOfDate);

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
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
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
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="as_of_date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    {t('reportsModule.trialBalance.asOfDate', 'As of Date')}
                  </Label>
                  <Input
                    id="as_of_date"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
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
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.loading', 'Loading trial balance...')}</span>
            </div>
          )}

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
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
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
                <CardContent className="p-0">
                  {report.accounts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>{t('reportsModule.trialBalance.noAccounts', 'No accounts with balances found.')}</p>
                      <p className="text-sm">{t('reportsModule.trialBalance.postJournalEntries', 'Post journal entries to see account balances.')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table
                        className="w-full"
                        aria-label={t('reportsModule.trialBalance.title', 'Trial Balance Accounts')}
                      >
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.code', 'Code')}</th>
                            <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.accountName', 'Account Name')}</th>
                            <th scope="col" className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.type', 'Type')}</th>
                            <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.debit', 'Debit')}</th>
                            <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('reportsModule.trialBalance.table.credit', 'Credit')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.accounts.map((account) => (
                            <tr
                              key={account.account_id}
                              className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                                {account.account_code}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {account.account_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountTypeColor(account.account_type)} bg-opacity-20`}>
                                  {account.account_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                                {Number(account.debit_balance) > 0 ? formatCurrency(Number(account.debit_balance), currencySymbol) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-purple-600 dark:text-purple-400">
                                {Number(account.credit_balance) > 0 ? formatCurrency(Number(account.credit_balance), currencySymbol) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {t('reportsModule.trialBalance.totals', 'TOTALS')}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-blue-700 dark:text-blue-300">
                              {formatCurrency(report.totals.total_debit, currencySymbol)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-purple-700 dark:text-purple-300">
                              {formatCurrency(report.totals.total_credit, currencySymbol)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
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
