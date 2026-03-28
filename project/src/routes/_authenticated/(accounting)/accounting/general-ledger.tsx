import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, BookOpen, Loader2, AlertCircle, Download, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useGeneralLedger, useTrialBalance } from '@/hooks/useFinancialReports';
import { formatCurrency } from '@/lib/utils/format';
import { exportGeneralLedgerCsv } from '@/lib/utils/report-export';
import { PageLoader } from '@/components/ui/loader';


const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(today);

  const { data: trialBalanceReport, isLoading: isLoadingAccounts } = useTrialBalance(today);
  const accounts = trialBalanceReport?.accounts ?? [];

  const { data: report, isLoading, error } = useGeneralLedger(
    selectedAccountId || undefined,
    startDate || undefined,
    endDate || undefined
  );

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
            { icon: BookOpen, label: t('reportsModule.generalLedger.title', 'General Ledger'), isActive: true }
          ]}
          title={t('reportsModule.generalLedger.title', 'General Ledger')}
          subtitle={t('reportsModule.generalLedger.subtitle', 'Detailed transaction history for a specific account')}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[250px]">
                <Label htmlFor="account_select" className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  {t('reportsModule.generalLedger.account', 'Account')}
                </Label>
                <NativeSelect
                  id="account_select"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={isLoadingAccounts}
                >
                  <option value="">
                    {isLoadingAccounts
                      ? t('reportsModule.generalLedger.loadingAccounts', 'Loading accounts...')
                      : t('reportsModule.generalLedger.selectAccount', 'Select an account...')}
                  </option>
                  {accounts.map((account) => (
                    <option key={account.account_id} value={account.account_id}>
                      {account.account_code} - {account.account_name} ({account.account_type})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="min-w-[180px]">
                <Label htmlFor="start_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  {t('reportsModule.generalLedger.startDate', 'Start Date')}
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="min-w-[180px]">
                <Label htmlFor="end_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  {t('reportsModule.generalLedger.endDate', 'End Date')}
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
                disabled={!report || report.entries.length === 0}
                onClick={() => {
                  if (report) {
                    exportGeneralLedgerCsv(
                      report.account_name,
                      report.entries,
                      startDate,
                      endDate,
                      currencySymbol
                    );
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {t('reportsModule.generalLedger.exportCsv', 'Export CSV')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Prompt to select account */}
        {!selectedAccountId && !isLoading && !error && (
          <Card>
            <CardContent className="pt-6">
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p className="text-lg font-medium">{t('reportsModule.generalLedger.selectPrompt', 'Select an account to view its ledger')}</p>
                <p className="text-sm mt-1">{t('reportsModule.generalLedger.selectPromptDesc', 'Choose an account from the dropdown above and set the date range.')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">{t('reportsModule.generalLedger.loading', 'Loading general ledger...')}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{t('reportsModule.generalLedger.error', 'Failed to load general ledger')}: {(error as Error).message}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* General Ledger Content */}
        {report && !isLoading && (
          <>
            {/* Account Info & Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('reportsModule.generalLedger.accountLabel', 'Account')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {report.account_code} - {report.account_name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(report.start_date).toLocaleDateString('fr-FR')} — {new Date(report.end_date).toLocaleDateString('fr-FR')}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {t('reportsModule.generalLedger.openingBalance', 'Opening Balance')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(report.opening_balance, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                    {t('reportsModule.generalLedger.closingBalance', 'Closing Balance')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(report.closing_balance, currencySymbol)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardHeader className="bg-gray-100 dark:bg-gray-800">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {t('reportsModule.generalLedger.transactions', 'Transactions')}
                  {report.entries.length > 0 && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({report.entries.length} {t('reportsModule.generalLedger.entries', 'entries')})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.entries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p>{t('reportsModule.generalLedger.noEntries', 'No transactions found for this period.')}</p>
                    <p className="text-sm">{t('reportsModule.generalLedger.noEntriesHint', 'Try adjusting the date range or selecting a different account.')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table
                      className="w-full"
                      aria-label={t('reportsModule.generalLedger.title', 'General Ledger')}
                    >
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.date', 'Date')}
                          </th>
                          <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.entryNumber', 'Entry #')}
                          </th>
                          <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.description', 'Description')}
                          </th>
                          <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.reference', 'Reference')}
                          </th>
                          <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.debit', 'Debit')}
                          </th>
                          <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.credit', 'Credit')}
                          </th>
                          <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('reportsModule.generalLedger.table.balance', 'Balance')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Opening Balance Row */}
                        <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-gray-100 dark:border-gray-700">
                          <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('reportsModule.generalLedger.openingBalanceRow', 'Opening Balance')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(report.opening_balance, currencySymbol)}
                          </td>
                        </tr>
                        {report.entries.map((entry, index) => (
                          <tr
                            key={`${entry.journal_entry_id}-${index}`}
                            className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(entry.entry_date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                              {entry.entry_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {entry.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {entry.reference_type && entry.reference_number
                                ? `${entry.reference_type} ${entry.reference_number}`
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                              {Number(entry.debit) > 0 ? formatCurrency(Number(entry.debit), currencySymbol) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-purple-600 dark:text-purple-400">
                              {Number(entry.credit) > 0 ? formatCurrency(Number(entry.credit), currencySymbol) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                              {formatCurrency(Number(entry.running_balance), currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {t('reportsModule.generalLedger.closingBalanceRow', 'Closing Balance')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-blue-700 dark:text-blue-300">
                            {formatCurrency(
                              report.entries.reduce((sum, e) => sum + Number(e.debit), 0),
                              currencySymbol
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-purple-700 dark:text-purple-300">
                            {formatCurrency(
                              report.entries.reduce((sum, e) => sum + Number(e.credit), 0),
                              currencySymbol
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-700 dark:text-green-300">
                            {formatCurrency(report.closing_balance, currencySymbol)}
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
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('reportsModule.generalLedger.about.title', 'About General Ledger')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('reportsModule.generalLedger.about.description', 'The general ledger shows a complete record of all transactions posted to a specific account within a date range. It includes the opening balance, each journal entry affecting the account, a running balance after each transaction, and the closing balance.')}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/general-ledger')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
