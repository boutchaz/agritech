import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Users, Loader2, AlertCircle, Download, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { financialReportsApi, AgedReport } from '@/lib/api/financial-reports';
import { exportAgedReportCsv } from '@/lib/utils/report-export';
import { PageLoader } from '@/components/ui/loader';


export const Route = createFileRoute('/_authenticated/(accounting)/accounting/aged-receivables')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});

const formatCurrency = (amount: number, symbol: string = 'MAD') => {
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getAgeBucketColor = (bucket: string): string => {
  switch (bucket) {
    case 'current':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case '1-30':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case '31-60':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case '61-90':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'over-90':
      return 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

function AppContent() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading, error } = useQuery<AgedReport>({
    queryKey: ['aged-receivables', currentOrganization?.id, asOfDate],
    queryFn: () => financialReportsApi.getAgedReceivables(asOfDate, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });

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
            { icon: Users, label: t('reportsModule.agedReceivables.title', 'Aged Receivables'), isActive: true }
          ]}
          title={t('reportsModule.agedReceivables.title', 'Aged Receivables')}
          subtitle={t('reportsModule.agedReceivables.subtitle', 'Analysis of outstanding customer invoices by age')}
        />
      }
    >
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="as_of_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  {t('reportsModule.agedReceivables.asOfDate', 'As of Date')}
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
                disabled={!report || report.by_party.length === 0}
                onClick={() => report && exportAgedReportCsv('receivables', report.by_party, asOfDate, currencySymbol)}
              >
                <Download className="h-4 w-4" />
                {t('reportsModule.agedReceivables.exportCsv', 'Export CSV')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">{t('reportsModule.agedReceivables.loading', 'Loading report...')}</span>
          </div>
        )}

        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{t('reportsModule.agedReceivables.error', 'Failed to load report')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('reportsModule.agedReceivables.current', 'Current')}</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(report.summary.current, currencySymbol)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">1-30 {t('reportsModule.agedReceivables.days', 'days')}</div>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(report.summary.days_1_30, currencySymbol)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">31-60 {t('reportsModule.agedReceivables.days', 'days')}</div>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(report.summary.days_31_60, currencySymbol)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">61-90 {t('reportsModule.agedReceivables.days', 'days')}</div>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(report.summary.days_61_90, currencySymbol)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">90+ {t('reportsModule.agedReceivables.days', 'days')}</div>
                  <div className="text-2xl font-bold text-red-800">{formatCurrency(report.summary.over_90, currencySymbol)}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6">
                  <div className="text-sm text-blue-600 dark:text-blue-400">{t('reportsModule.agedReceivables.total', 'Total')}</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(report.summary.total, currencySymbol)}</div>
                </CardContent>
              </Card>
            </div>

            {report.by_party.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('reportsModule.agedReceivables.byCustomer', 'By Customer')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table
                      className="w-full text-sm"
                      aria-label={t('reportsModule.agedReceivables.byCustomer', 'By Customer')}
                    >
                      <TableHeader>
                        <TableRow className="border-b dark:border-gray-700">
                          <TableHead scope="col" className="text-left py-3 px-2 font-medium">{t('reportsModule.agedReceivables.customer', 'Customer')}</TableHead>
                          <TableHead scope="col" className="text-right py-3 px-2 font-medium">{t('reportsModule.agedReceivables.current', 'Current')}</TableHead>
                          <TableHead scope="col" className="text-right py-3 px-2 font-medium">1-30</TableHead>
                          <TableHead scope="col" className="text-right py-3 px-2 font-medium">31-60</TableHead>
                          <TableHead scope="col" className="text-right py-3 px-2 font-medium">61-90</TableHead>
                          <TableHead scope="col" className="text-right py-3 px-2 font-medium">90+</TableHead>
                          <TableHead scope="col" className="text-right py-3 px-2 font-medium">{t('reportsModule.agedReceivables.total', 'Total')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.by_party.map((party) => (
                          <TableRow key={party.party_id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="py-3 px-2 font-medium">{party.party_name}</TableCell>
                            <TableCell className="text-right py-3 px-2">{formatCurrency(party.current, currencySymbol)}</TableCell>
                            <TableCell className="text-right py-3 px-2">{formatCurrency(party.days_1_30, currencySymbol)}</TableCell>
                            <TableCell className="text-right py-3 px-2">{formatCurrency(party.days_31_60, currencySymbol)}</TableCell>
                            <TableCell className="text-right py-3 px-2">{formatCurrency(party.days_61_90, currencySymbol)}</TableCell>
                            <TableCell className="text-right py-3 px-2">{formatCurrency(party.over_90, currencySymbol)}</TableCell>
                            <TableCell className="text-right py-3 px-2 font-bold">{formatCurrency(party.total, currencySymbol)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {report.invoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {t('reportsModule.agedReceivables.invoiceDetails', 'Invoice Details')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table
                      className="w-full text-sm"
                      aria-label={t('reportsModule.agedReceivables.invoiceDetails', 'Invoice Details')}
                    >
                      <TableHeader>
                        <TableRow className="border-b dark:border-gray-700">
                          <TableHead scope="col" className="text-left py-3 px-2 font-medium">{t('reportsModule.agedReceivables.invoiceNumber', 'Invoice #')}</TableHead>
                          <TableHead className="text-left py-3 px-2 font-medium">{t('reportsModule.agedReceivables.customer', 'Customer')}</TableHead>
                          <TableHead className="text-left py-3 px-2 font-medium">{t('reportsModule.agedReceivables.invoiceDate', 'Date')}</TableHead>
                          <TableHead className="text-left py-3 px-2 font-medium">{t('reportsModule.agedReceivables.dueDate', 'Due Date')}</TableHead>
                          <TableHead className="text-right py-3 px-2 font-medium">{t('reportsModule.agedReceivables.daysOverdue', 'Days Overdue')}</TableHead>
                          <TableHead className="text-center py-3 px-2 font-medium">{t('reportsModule.agedReceivables.ageBucket', 'Age')}</TableHead>
                          <TableHead className="text-right py-3 px-2 font-medium">{t('reportsModule.agedReceivables.outstanding', 'Outstanding')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.invoices.map((inv) => (
                          <TableRow key={inv.invoice_id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="py-3 px-2 font-mono">{inv.invoice_number}</TableCell>
                            <TableCell className="py-3 px-2">{inv.party_name}</TableCell>
                            <TableCell className="py-3 px-2">{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                            <TableCell className="py-3 px-2">{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right py-3 px-2">{inv.days_overdue}</TableCell>
                            <TableCell className="text-center py-3 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgeBucketColor(inv.age_bucket)}`}>
                                {inv.age_bucket === 'current' ? t('reportsModule.agedReceivables.current', 'Current') : inv.age_bucket}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-3 px-2 font-medium">{formatCurrency(inv.outstanding_amount, currencySymbol)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {report.invoices.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400">
                  {t('reportsModule.agedReceivables.noOutstanding', 'No outstanding receivables as of this date.')}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
